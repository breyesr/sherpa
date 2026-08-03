"""
GraphRAG Hybrid Search and Retrieval Engine.
Implements parallelized semantic + keyword search with RRF ranking over the KnowledgeCorpus for context-aware AI responses.
"""

import logging
from typing import List, Dict, Any, Optional, Tuple
import asyncio

logger = logging.getLogger(__name__)
from datetime import datetime
from sqlalchemy.future import select
from sqlalchemy import text, or_, func
from sqlalchemy.orm import selectinload
from app.models.trade import Store, StoreNote, CustomerNote, Competitor, store_clients, AccountIntelligence
from app.models.crm import Client
from app.models.knowledge import KnowledgeCorpus
from app.core.embeddings import EmbeddingService
from pgvector.sqlalchemy import Vector
import json
import traceback
import unicodedata
import re

from jinja2 import Environment, FileSystemLoader, select_autoescape
import litellm
from app.core.system_config import ConfigService
import os

# Setup prompt template environment with absolute path for reliability
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROMPTS_DIR = os.path.join(BASE_DIR, "core", "prompts")

prompt_env = Environment(
    loader=FileSystemLoader(PROMPTS_DIR),
    autoescape=select_autoescape()
)

class GraphRAGService:
    def __init__(self, db: Any):
        self.db = db
        self.embeddings = EmbeddingService(db)

    @staticmethod
    def get_tool_definition() -> Dict[str, Any]:
        """Returns the JSON schema for this tool."""
        return {
            "type": "function",
            "function": {
                "name": "query_knowledge",
                "description": "Searches the business knowledge base, historical notes, and account intelligence. Use this for discovery, competitive analysis, or deep-dive historical questions.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "query": {
                            "type": "string",
                            "description": "The specific question or topic to search for (e.g., 'historial de precios', 'competencia en zona norte')."
                        },
                        "store_id": {
                            "type": "string",
                            "description": "Optional: Limit the search to a specific store ID."
                        },
                        "discovery_scope": {
                            "type": "string",
                            "enum": ["LOCAL", "GLOBAL"],
                            "description": "Whether to search only within the current store (LOCAL) or across the whole business (GLOBAL)."
                        }
                    },
                    "required": ["query"]
                }
            }
        }

    def _normalize_str(self, text: str) -> str:
        """Remove accents and normalize string for comparison."""
        if not text: return ""
        # Normalize to NFKD and remove non-spacing mark (accents)
        normalized = unicodedata.normalize('NFKD', text)
        return "".join([c for c in normalized if not unicodedata.combining(c)]).lower().strip()

    def _is_exact_match(self, needle: str, haystack: str) -> bool:
        """Check if needle exists in haystack as a whole word."""
        if not needle or not haystack: return False
        # Escape needle for regex and check for word boundaries
        pattern = r'\b' + re.escape(self._normalize_str(needle)) + r'\b'
        return bool(re.search(pattern, self._normalize_str(haystack)))

    async def query_knowledge(self, query: str, business_id: str, store_id: str = None, discovery_scope: str = "GLOBAL", chat_id: str = None) -> Dict[str, Any]:
        """Tool-compatible wrapper that returns raw knowledge hits without internal LLM synthesis."""
        reasoning = []
        try:
            # Determine active store context if local scope is needed
            active_store_id = store_id
            if not active_store_id and chat_id:
                from app.core.memory import ChatMemory
                memory = ChatMemory()
                session_meta = await memory.get_metadata(chat_id)
                active_store_id = session_meta.get("active_store_id")

            # Force LOCAL if we have an active store, otherwise use requested scope
            effective_scope = "LOCAL" if active_store_id else discovery_scope
            reasoning.append(f"Querying knowledge base (Scope: {effective_scope}, Store: {active_store_id})")

            # Keyword search + Vector search
            limit = 10
            similar_notes = await self.find_similar_notes(
                query_text=query,
                business_id=business_id,
                store_id=active_store_id,
                discovery_scope=effective_scope,
                limit=limit
            )

            if not similar_notes:
                return {
                    "success": False,
                    "message": "No relevant historical notes or knowledge found.",
                    "reasoning": " | ".join(reasoning)
                }

            # Return the raw content of the notes so the orchestrator's LLM can synthesize it
            notes_content = [n["content"] for n in similar_notes]
            return {
                "success": True,
                "hits": len(notes_content),
                "data": notes_content,
                "reasoning": " | ".join(reasoning)
            }

        except Exception as e:
            logger.exception("query_knowledge failed: %s", e)
            return {"success": False, "error": str(e)}

    async def generate_brief(self, query_text: str, business_id: str, history: list = None, chat_id: str = None, discovery_scope: str = None, store_name_to_strip: str = None) -> Tuple[str, str]:
        """Generate a strategic pre-visit brief using strict Session Locking."""
        reasoning = []
        try:
            is_context_shift = False
            query_norm = self._normalize_str(query_text)
            
            # 0. Termination Logic: Check if the user wants to close the current session
            termination_cues = ["terminamos", "listo por ahora", "cerrar sesion", "otra tienda", "cambio de tienda", "fin de visita"]
            if any(cue in query_norm for cue in termination_cues):
                if chat_id:
                    from app.core.memory import ChatMemory
                    memory = ChatMemory()
                    await memory.clear_session_data(chat_id)
                    reasoning.append("User requested session termination. Cleared session data.")
                    return "Entendido. He cerrado la sesión y reiniciado el historial. ¿A cuál tienda te diriges ahora?", " | ".join(reasoning)

            # 1. Identity Stage: Find Target Store
            res = await self.db.execute(
                select(Store)
                .where(Store.business_id == business_id)
                .options(selectinload(Store.clients), selectinload(Store.notes))
            )
            all_stores = res.scalars().all()
            
            # Retrieve active store from session metadata (Task 109.1)
            active_store_id = None
            if chat_id:
                from app.core.memory import ChatMemory
                memory = ChatMemory()
                session_meta = await memory.get_metadata(chat_id)
                active_store_id = session_meta.get("active_store_id")
                if active_store_id:
                    reasoning.append(f"Active session lock found for Store ID: {active_store_id}")

            # Task 113.1: Explicit Discovery Scope enforcement
            if active_store_id and not discovery_scope:
                discovery_scope = "LOCAL"
            elif not discovery_scope:
                discovery_scope = "GLOBAL"
            
            reasoning.append(f"Discovery scope set to: {discovery_scope}")

            # Helper to search for store in a string
            async def find_store_in_text(text: str) -> Tuple[Optional[Store], str]:
                if not text: return None, "none"
                norm_text = self._normalize_str(text)
                
                # 1. Direct Store Name Match (High Confidence)
                for s in all_stores:
                    if self._normalize_str(s.name) in norm_text:
                        return s, "high"
                
                # 2. Contact Name Match (High Confidence)
                res_contacts = await self.db.execute(
                    select(Client, store_clients.c.store_id)
                    .join(store_clients, store_clients.c.client_id == Client.id)
                    .where(Client.business_id == business_id)
                )
                for client, s_id in res_contacts.all():
                    if self._normalize_str(client.name) in norm_text:
                        res_s = await self.db.execute(select(Store).where(Store.id == s_id))
                        return res_s.scalars().first(), "high"
                
                # 3. Fallback: Region/Market match (Low Confidence)
                stores_in_context = []
                for s in all_stores:
                    if (s.region and self._is_exact_match(s.region, text)) or \
                       (s.market and self._is_exact_match(s.market, text)):
                        stores_in_context.append(s)
                
                if len(stores_in_context) == 1:
                    common_words = {"norte", "sur", "este", "oeste", "centro"}
                    found_val = stores_in_context[0].region or stores_in_context[0].market
                    confidence = "low" if self._normalize_str(found_val) in common_words else "medium"
                    return stores_in_context[0], confidence
                
                return None, "none"

            # SEARCH LOGIC: Confidence-aware locking
            found_store, confidence = await find_store_in_text(query_text)
            target_store = None

            if active_store_id:
                # WE ARE LOCKED: Only switch if the new match is HIGH confidence
                if found_store and confidence == "high" and found_store.id != active_store_id:
                    target_store = found_store
                    is_context_shift = True
                    discovery_scope = "LOCAL"
                    reasoning.append(f"Context shift detected to {target_store.name} (High Confidence).")
                else:
                    res_active = await self.db.execute(select(Store).where(Store.id == active_store_id))
                    target_store = res_active.scalars().first()
                    discovery_scope = "LOCAL"
                    reasoning.append(f"Staying locked to {target_store.name}.")
            else:
                # WE ARE UNLOCKED: Any match (even low) can set the lock
                if found_store:
                    target_store = found_store
                    is_context_shift = True
                    if discovery_scope != "GLOBAL":
                        discovery_scope = "LOCAL"
                    reasoning.append(f"No lock found. Resolved to {target_store.name} (Confidence: {confidence}).")

            # If still nothing, look at history (Only if unlocked)
            if not target_store and active_store_id is None and history:
                for m in reversed(history[-5:]):
                    hist_store, hist_conf = await find_store_in_text(m["content"])
                    if hist_store:
                        target_store = hist_store
                        discovery_scope = "LOCAL"
                        reasoning.append(f"Resolved to {target_store.name} from history.")
                        break

            if not target_store or discovery_scope == "GLOBAL":
                # Task 109.4: Global Discovery Mode
                reasoning.append("Entering Global Discovery Mode.")
                discovery_results = await self.search_store_profiles(query_text, business_id)
                if discovery_results:
                    resp = await self.generate_discovery_response(query_text, discovery_results)
                    return resp, " | ".join(reasoning)
                
                if discovery_scope == "GLOBAL":
                    return "No encontré información relevante en la búsqueda global. ¿Podrías ser más específico?", " | ".join(reasoning)
                return "No pude identificar la tienda específica. ¿A cuál te diriges o de qué región quieres saber?", " | ".join(reasoning)
            
            # 2. Update Session Focus
            if chat_id and target_store.id != active_store_id:
                from app.core.memory import ChatMemory
                memory = ChatMemory()
                await memory.update_metadata(chat_id, {"active_store_id": target_store.id})
                is_context_shift = True
                logger.debug("Activated SESSION LOCK for '%s'.", target_store.name)

            # 3. Sequential Data Retrieval
            context = await self.get_store_context(target_store.id)
            
            search_limit = 15
            
            # Query Stripping to prevent Keyword Poisoning
            clean_query = query_text
            if store_name_to_strip and store_name_to_strip != "Ninguna detectada":
                # Simple case-insensitive replacement
                pattern = re.compile(re.escape(store_name_to_strip), re.IGNORECASE)
                clean_query = pattern.sub("", query_text).strip()
                reasoning.append(f"Stripped store name from query. Cleaned query: '{clean_query}'")

            similar_notes = await self.find_similar_notes(clean_query, business_id, store_id=target_store.id, discovery_scope=discovery_scope, limit=search_limit)
            reasoning.append(f"Retrieved {len(similar_notes)} similar notes via Hybrid Search.")
            
            provider = await ConfigService.get(self.db, "ACTIVE_AI_PROVIDER", "openai")
            base_model = await ConfigService.get(self.db, f"{provider.upper()}_MODEL", "gpt-4o-mini")
            api_key = await ConfigService.get(self.db, f"{provider.upper()}_API_KEY")
            synthesis_model = await ConfigService.get(self.db, "SYNTHESIS_MODEL", None)
            synthesis_model = synthesis_model or base_model

            # --- TRINITY PIPELINE: STAGE 1 - SYNTHESIS ---
            synthesis_template = prompt_env.get_template("synthesizer.j2")
            synthesis_prompt = synthesis_template.render(
                store=context,
                notes=similar_notes,
                query=query_text
            )

            synthesis_response = await litellm.acompletion(
                model=f"{provider}/{synthesis_model}" if "/" not in synthesis_model else synthesis_model,
                messages=[{"role": "user", "content": synthesis_prompt}],
                api_key=api_key,
                timeout=30.0
            )
            dossier = synthesis_response.choices[0].message.content or "No se pudo sintetizar la información."
            reasoning.append(f"Synthesized dossier using {synthesis_model}.")

            # --- TRINITY PIPELINE: STAGE 2 - PERSONA ---
            persona_template = prompt_env.get_template("visit_briefer.j2")
            persona_prompt = persona_template.render(
                dossier=dossier,
                store_name=target_store.name,
                query=query_text,
                history=history[-3:] if history else []
            )

            response = await litellm.acompletion(
                model=f"{provider}/{base_model}" if "/" not in base_model else base_model,
                messages=[{"role": "user", "content": persona_prompt}],
                api_key=api_key,
                timeout=45.0
            )

            ai_content = response.choices[0].message.content or "No se pudo generar la respuesta final."
            reasoning.append(f"Generated final response using {base_model}.")
            
            if is_context_shift:
                ai_content = f"**[Nueva sesión: {target_store.name} | Historial reiniciado]**\n\n{ai_content}"
                
            return ai_content, " | ".join(reasoning)

        except Exception as e:
            logger.exception("generate_brief failed: %s", e)
            return "Lo siento, tuve un problema al generar el reporte de inteligencia.", f"ERROR: {str(e)}"


    async def find_similar_notes(self, query_text: str, business_id: str, limit: int = 5, store_id: str = None, filters: Dict[str, str] = None, discovery_scope: str = "GLOBAL") -> List[Dict[str, Any]]:
        """Perform Hybrid Vector + Keyword search against the unified knowledge corpus (Task 111.6)."""
        if not query_text or not query_text.strip():
            logger.warning("find_similar_notes called with empty query_text. Returning empty list.")
            return []
            
        try:
            # 1. Generate Query Embedding for Semantic Search
            query_vector = await self.embeddings.get_embedding(query_text)
            
            # Base filters for both searches
            base_filters = [KnowledgeCorpus.business_id == business_id]
            
            # Task 113.1: Strict Identity Locking in LOCAL scope
            if discovery_scope == "LOCAL":
                if not store_id:
                    logger.warning("LOCAL scope requested but no store_id provided. Returning empty hits.")
                    return []
                base_filters.append(or_(
                    KnowledgeCorpus.metadata_json['store_id'].astext == str(store_id),
                    KnowledgeCorpus.metadata_json['store_ids'].contains([str(store_id)])
                ))
            elif store_id:
                # If GLOBAL but we have a store_id, we still prioritize it but don't hard-lock (optional logic)
                # For now, let's keep it consistent: if store_id is passed, we filter by it.
                base_filters.append(or_(
                    KnowledgeCorpus.metadata_json['store_id'].astext == str(store_id),
                    KnowledgeCorpus.metadata_json['store_ids'].contains([str(store_id)])
                ))

            # Apply Global Filters (Task 111.5)
            if filters:
                for key, val in filters.items():
                    if key in ['region', 'market', 'segment']:
                        plural_key = f"{key}s"
                        base_filters.append(or_(
                            KnowledgeCorpus.metadata_json[key].astext == str(val),
                            KnowledgeCorpus.metadata_json[plural_key].contains([str(val)])
                        ))
                    else:
                        base_filters.append(KnowledgeCorpus.metadata_json[key].astext == str(val))

            # 2. Semantic Search Query
            semantic_stmt = select(KnowledgeCorpus).where(*base_filters).order_by(
                KnowledgeCorpus.embedding.cosine_distance(query_vector)
            ).limit(25) # Internal limit for re-ranking
            
            # 3. Keyword Search Query (PostgreSQL FTS)
            keyword_stmt = select(KnowledgeCorpus).where(
                *base_filters,
                func.to_tsvector('spanish', KnowledgeCorpus.content).op('@@')(func.plainto_tsquery('spanish', query_text))
            ).limit(25)

            # Execute parallelized search via asyncio.gather (Task 201.1)
            semantic_res, keyword_res = await asyncio.gather(
                self.db.execute(semantic_stmt),
                self.db.execute(keyword_stmt)
            )

            semantic_hits = semantic_res.scalars().all()
            keyword_hits = keyword_res.scalars().all()

            # 4. Reciprocal Rank Fusion (RRF)
            k = 60
            scores = {} # corpus_id -> (score, entry)

            for rank, entry in enumerate(semantic_hits):
                scores[entry.id] = [1.0 / (k + rank + 1), entry]

            for rank, entry in enumerate(keyword_hits):
                if entry.id in scores:
                    scores[entry.id][0] += 1.0 / (k + rank + 1)
                else:
                    scores[entry.id] = [1.0 / (k + rank + 1), entry]

            # Sort by fused score
            sorted_hits = sorted(scores.values(), key=lambda x: x[0], reverse=True)
            
            # 5. Format results
            results = []
            for score, entry in sorted_hits[:limit]:
                meta = entry.metadata_json or {}
                results.append({
                    "id": entry.id,
                    "type": entry.entity_type,
                    "content": entry.content,
                    "risks": meta.get("risks"),
                    "opportunities": meta.get("opportunities"),
                    "execution": meta.get("execution_level"),
                    "comm_style": meta.get("comm_style"),
                    "date": entry.created_at.strftime("%Y-%m-%d"),
                    "score": round(score, 4)
                })
            
            return results
        except Exception as e:
            logger.exception("hybrid find_similar_notes failed: %s", e)
            return []

    async def update_account_intelligence(self, store_id: str, business_id: str) -> Optional[str]:
        """
        Trigger a re-synthesis of the Account Intelligence Dossier (Task 107.13).
        Calculates a fresh 'Fat Table' entry for the store.
        """
        try:
            # 1. Sequential Retrieval (Stabilized for SQLAlchemy Async)
            context = await self.get_store_context(store_id)
            similar_notes = await self.find_similar_notes("General summary and vital signs", business_id, store_id=store_id, limit=10)
            provider = await ConfigService.get(self.db, "ACTIVE_AI_PROVIDER", "openai")

            # 2. Get AI config
            base_model = await ConfigService.get(self.db, f"{provider.upper()}_MODEL", "gpt-4o-mini")
            api_key = await ConfigService.get(self.db, f"{provider.upper()}_API_KEY")
            synthesis_model = await ConfigService.get(self.db, "SYNTHESIS_MODEL", None)
            synthesis_model = synthesis_model or base_model

            # 3. Perform Synthesis
            synthesis_template = prompt_env.get_template("synthesizer.j2")
            synthesis_prompt = synthesis_template.render(
                store=context,
                notes=similar_notes,
                query="Generate a complete strategic dossier for this account."
            )

            synthesis_response = await litellm.acompletion(
                model=f"{provider}/{synthesis_model}" if "/" not in synthesis_model else synthesis_model,
                messages=[{"role": "user", "content": synthesis_prompt}],
                api_key=api_key,
                timeout=30
            )
            dossier_text = synthesis_response.choices[0].message.content
            
            if not dossier_text:
                return None

            # 4. Save to Fat Table (UPSERT pattern)
            res = await self.db.execute(
                select(AccountIntelligence).where(AccountIntelligence.store_id == store_id)
            )
            intel = res.scalars().first()
            
            if intel:
                intel.dossier_json = {"content": dossier_text}
                intel.version += 1
                intel.last_synthesized_at = datetime.utcnow()
            else:
                intel = AccountIntelligence(
                    business_id=business_id,
                    store_id=store_id,
                    dossier_json={"content": dossier_text},
                    last_synthesized_at=datetime.utcnow()
                )
                self.db.add(intel)
            
            await self.db.commit()
            logger.info("Updated Account Intelligence for store %s", store_id)
            return dossier_text

        except Exception as e:
            logger.exception("update_account_intelligence failed: %s", e)
            await self.db.rollback()
            return None

    async def get_store_context(self, store_id: str) -> Dict[str, Any]:
        """Fetch full relational context for a specific store (Account)."""
        # Sequential fetching (Stabilized for SQLAlchemy Async)
        store_stmt = (
            select(Store)
            .where(Store.id == store_id)
            .options(
                selectinload(Store.clients).selectinload(Client.trade_notes),
                selectinload(Store.notes),
                selectinload(Store.business_profile)
            )
        )
        store_res = await self.db.execute(store_stmt)
        store = store_res.scalars().first()
        if not store:
            return {}

        comp_stmt = select(Competitor).where(Competitor.store_id == store_id)
        comp_res = await self.db.execute(comp_stmt)

        # Fetch Contacts from Many-to-Many with full structured data
        contacts = []
        for c in store.clients:
            contact_info = {
                "name": c.name,
                "role": c.role or "Personal de la tienda",
                "birthday": c.birthday.strftime("%Y-%m-%d") if c.birthday else "Desconocido",
                "gender": c.gender or "No especificado",
                "trade_notes": [
                    {
                        "comm_style": n.comm_style,
                        "frequency": n.visit_frequency,
                        "notes": n.general_notes,
                        "last_visit": n.last_visit_date.strftime("%Y-%m-%d") if n.last_visit_date else None
                    } for n in c.trade_notes
                ]
            }
            contacts.append(contact_info)
        
        # Fetch Latest Notes (Already loaded via selectinload)
        notes = [{
            "content": n.note, 
            "execution_level": n.execution_level,
            "date": n.created_at.strftime("%Y-%m-%d")
        } for n in store.notes[:15]]

        # Format Competitors from results
        competitors = [
            {
                "name": c.name, 
                "presence": c.presence_level,
                "strengths": c.strengths,
                "weaknesses": c.weaknesses
            } for c in comp_res.scalars().all()
        ]

        return {
            "name": store.name,
            "market": store.market,
            "region": store.region,
            "segment": store.segment,
            "contacts": contacts,
            "history": notes,
            "competitors": competitors,
            "delivery_zip_codes": store.delivery_zip_codes or []
        }

    async def search_store_profiles(self, query_text: str, business_id: str, limit: int = 5, filters: Dict[str, str] = None) -> List[Dict[str, Any]]:
        """Perform semantic search across all store profiles via the Knowledge Corpus (Task 111.4 & 111.5)."""
        try:
            query_vector = await self.embeddings.get_embedding(query_text)
            
            # Search Corpus for 'store' entity types
            base_filters = [
                KnowledgeCorpus.business_id == business_id,
                KnowledgeCorpus.entity_type == "store"
            ]

            # Apply Global Filters (Task 111.5)
            if filters:
                for key, val in filters.items():
                    base_filters.append(KnowledgeCorpus.metadata_json[key].astext == str(val))

            stmt = select(KnowledgeCorpus).where(*base_filters)
            res = await self.db.execute(
                stmt.order_by(KnowledgeCorpus.embedding.cosine_distance(query_vector))
                .limit(limit)
            )
            
            results = []
            for entry in res.scalars().all():
                meta = entry.metadata_json or {}
                results.append({
                    "name": meta.get("name"),
                    "region": meta.get("region"),
                    "market": meta.get("market"),
                    "segment": meta.get("segment"),
                    "address": meta.get("address")
                })
            return results
        except Exception as e:
            logger.error("search_store_profiles failed: %s", e)
            return []

    async def generate_discovery_response(self, query: str, stores: List[Dict]) -> str:
        """Use a specialized prompt to answer broad regional/discovery questions."""
        provider = await ConfigService.get(self.db, "ACTIVE_AI_PROVIDER", "openai")
        model = await ConfigService.get(self.db, f"{provider.upper()}_MODEL", "gpt-4o-mini")
        api_key = await ConfigService.get(self.db, f"{provider.upper()}_API_KEY")

        stores_context = "\n".join([
            f"- {s['name']} (Región: {s['region'] or 'N/A'}, Mercado: {s['market'] or 'N/A'}, Segmento: {s['segment'] or 'N/A'})"
            for s in stores
        ])

        prompt = f"""
        Eres un Asistente de Inteligencia de Ventas (Sherpa).
        El usuario ha hecho una pregunta global sobre las cuentas/tiendas.
        
        Pregunta del usuario: "{query}"
        
        Aquí tienes las tiendas más relevantes encontradas en la base de datos:
        {stores_context}
        
        Responde a la pregunta del usuario basándote únicamente en esta lista. 
        Sé conciso, profesional y estratégico. Si la pregunta es sobre una región específica, 
        confirma qué tiendas están allí.
        """

        try:
            response = await litellm.acompletion(
                model=f"{provider}/{model}" if "/" not in model else model,
                messages=[{"role": "user", "content": prompt}],
                api_key=api_key,
                timeout=30.0
            )
            return response.choices[0].message.content or "No pude procesar la respuesta global."
        except Exception as e:
            logger.error("ERROR in generate_discovery_response: %s", e)
            return "Encontré algunas tiendas pero tuve un error al resumir la información."
