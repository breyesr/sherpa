from typing import List, Dict, Any, Optional
from sqlalchemy.future import select
from sqlalchemy import text
from sqlalchemy.orm import selectinload
from app.models.trade import Store, StoreNote, CustomerNote, Competitor, store_clients
from app.models.crm import Client
from app.core.embeddings import EmbeddingService
from pgvector.sqlalchemy import Vector
import json
import traceback
import unicodedata

from jinja2 import Environment, FileSystemLoader, select_autoescape
import litellm
from app.core.system_config import ConfigService

# Setup prompt template environment
prompt_env = Environment(
    loader=FileSystemLoader("app/core/prompts"),
    autoescape=select_autoescape()
)

class GraphRAGService:
    def __init__(self, db: Any):
        self.db = db
        self.embeddings = EmbeddingService(db)

    def _normalize_str(self, text: str) -> str:
        """Remove accents and normalize string for comparison."""
        if not text: return ""
        # Normalize to NFKD and remove non-spacing mark (accents)
        normalized = unicodedata.normalize('NFKD', text)
        return "".join([c for c in normalized if not unicodedata.combining(c)]).lower().strip()

    async def generate_brief(self, query_text: str, business_id: str, history: list = None, chat_id: str = None) -> str:
        """Generate a strategic pre-visit brief using Hybrid RAG with session awareness."""
        try:
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

            target_store = None
            
            # Helper to search for store in a string
            async def find_store_in_text(text: str) -> Optional[Store]:
                if not text: return None
                norm_text = self._normalize_str(text)
                
                # 1. Direct Store Name Match
                for s in all_stores:
                    if self._normalize_str(s.name) in norm_text:
                        return s
                
                # 2. Contact Name Match
                res_contacts = await self.db.execute(
                    select(Client, store_clients.c.store_id)
                    .join(store_clients, store_clients.c.client_id == Client.id)
                    .where(Client.business_id == business_id)
                )
                for client, s_id in res_contacts.all():
                    if self._normalize_str(client.name) in norm_text:
                        res_s = await self.db.execute(select(Store).where(Store.id == s_id))
                        return res_s.scalars().first()
                
                # 3. Fallback: Region/Market match (Multi-store ambiguity)
                stores_in_context = []
                for s in all_stores:
                    if (s.region and self._normalize_str(s.region) in norm_text) or \
                       (s.market and self._normalize_str(s.market) in norm_text):
                        stores_in_context.append(s)
                
                if len(stores_in_context) == 1:
                    return stores_in_context[0]
                
                # Task 109.1 Fix: If multiple stores match a region (e.g. 'Norte'), 
                # prioritize the one already active in the session.
                if len(stores_in_context) > 1 and active_store_id:
                    for s in stores_in_context:
                        if s.id == active_store_id:
                            return s

                return None

            # Search in current query first
            target_store = await find_store_in_text(query_text)

            # If not found, check the active session store (Task 109.1)
            if not target_store and active_store_id:
                # Does the query contain pronouns or context indicating 'the current store'?
                # e.g. "qué acciones hemos hecho con ellos", "qué mas sabes"
                context_cues = ["ellos", "esta tienda", "este local", "esta cuenta", "aquí", "de ellos", "su estado"]
                query_norm = self._normalize_str(query_text)
                
                if any(cue in query_norm for cue in context_cues) or len(query_norm.split()) < 4:
                    res_active = await self.db.execute(select(Store).where(Store.id == active_store_id))
                    target_store = res_active.scalars().first()
                    if target_store:
                        print(f"DEBUG GRAPHRAG: Using session-locked store '{target_store.name}' based on contextual cues.")

            # Last resort: look back in history
            if not target_store and history:
                for m in reversed(history[-5:]):
                    target_store = await find_store_in_text(m["content"])
                    if target_store:
                        break

            if not target_store:
                # Task 109.4: Global Discovery Mode
                # If no specific store is found, search across ALL store profiles semantically
                discovery_results = await self.search_store_profiles(query_text, business_id)
                if discovery_results:
                    return await self.generate_discovery_response(query_text, discovery_results)
                
                return "No pude identificar la tienda específica ni encontré coincidencias regionales. ¿Podrías darme el nombre, la región o el mercado?"
            
            # 2. Update Session Focus (Self-healing session lock)
            if chat_id and target_store.id != active_store_id:
                from app.core.memory import ChatMemory
                memory = ChatMemory()
                await memory.update_metadata(chat_id, {"active_store_id": target_store.id})
                print(f"DEBUG GRAPHRAG: Updated session lock to '{target_store.name}'.")

            # 3. Fetch Relational Context (Strictly for this store)
            context = await self.get_store_context(target_store.id)
            
            # 4. Fetch Similar Notes
            similar_notes = await self.find_similar_notes(query_text, business_id, store_id=target_store.id)
            
            # 4. Generate LLM Response (Conversational & Focused)
            template = prompt_env.get_template("visit_briefer.j2")
            prompt = template.render(
                store=context,
                notes=similar_notes,
                query=query_text,
                history=history[-3:] if history else []
            )

            provider = await ConfigService.get(self.db, "ACTIVE_AI_PROVIDER", "openai")
            model = await ConfigService.get(self.db, f"{provider.upper()}_MODEL", "gpt-4o-mini")
            api_key = await ConfigService.get(self.db, f"{provider.upper()}_API_KEY")

            response = await litellm.acompletion(
                model=f"{provider}/{model}" if "/" not in model else model,
                messages=[{"role": "user", "content": prompt}],
                api_key=api_key,
                timeout=45.0
            )

            ai_content = response.choices[0].message.content or "No se pudo generar la respuesta."
            
            # Task 109.3: Explicit Shift Acknowledgment
            if is_context_shift:
                ai_content = f"**[Cambiando el enfoque a {target_store.name}]**\n\n{ai_content}"
                
            return ai_content

        except Exception as e:
            print(f"ERROR: generate_brief failed: {e}")
            traceback.print_exc()
            return "Lo siento, tuve un problema al generar el reporte de inteligencia."

    async def find_similar_notes(self, query_text: str, business_id: str, limit: int = 5, store_id: str = None) -> List[Dict[str, Any]]:
        """Perform vector similarity search strictly filtered by store_id with keyword boosting for contacts."""
        try:
            # 1. Identify if a specific contact name is mentioned in the query or context
            # (We look at the query_text for common names of contacts in this store)
            boosted_clients = []
            if store_id:
                res_clients = await self.db.execute(
                    select(Client).join(store_clients, store_clients.c.client_id == Client.id)
                    .where(store_clients.c.store_id == store_id)
                )
                for c in res_clients.scalars().all():
                    if c.name.lower() in query_text.lower():
                        boosted_clients.append(c)

            # 2. Generate Query Embedding
            query_vector = await self.embeddings.get_embedding(query_text)
            
            # 3. Search Store Notes
            stmt = select(StoreNote, Store.name.label("store_name")).join(Store)
            filters = [Store.business_id == business_id]
            if store_id:
                filters.append(StoreNote.store_id == store_id)

            store_res = await self.db.execute(
                stmt.where(*filters)
                .order_by(StoreNote.embedding.cosine_distance(query_vector))
                .limit(limit)
            )
            
            results = []
            for note, store_name in store_res.all():
                results.append({
                    "type": "store_note",
                    "store": store_name,
                    "content": f"[SOURCE: Store {store_name}] {note.note}",
                    "risks": note.risks,
                    "opportunities": note.opportunities,
                    "execution": note.execution_level,
                    "date": note.created_at.isoformat()
                })
            
            # 4. Search Customer Notes (Semantic)
            cust_stmt = select(CustomerNote, Client.name.label("client_name")).join(Client)
            cust_filters = [CustomerNote.business_id == business_id]
            
            if store_id:
                cust_stmt = cust_stmt.join(store_clients, store_clients.c.client_id == Client.id).where(store_clients.c.store_id == store_id)

            cust_res = await self.db.execute(
                cust_stmt.where(*cust_filters)
                .order_by(CustomerNote.embedding.cosine_distance(query_vector))
                .limit(3)
            )

            found_note_ids = set()
            for c_note, client_name in cust_res.all():
                found_note_ids.add(c_note.id)
                results.append({
                    "id": c_note.id,
                    "type": "customer_note",
                    "client": client_name,
                    "content": c_note.general_notes,
                    "comm_style": c_note.comm_style,
                    "frequency": c_note.visit_frequency,
                    "date": c_note.created_at.isoformat()
                })

            # 5. Keyword Boost: If we identified a client by name, pull ALL their notes even if not semantically matching
            if boosted_clients:
                for bc in boosted_clients:
                    boost_res = await self.db.execute(
                        select(CustomerNote).where(CustomerNote.client_id == bc.id, CustomerNote.id.not_in(found_note_ids))
                    )
                    for bn in boost_res.scalars().all():
                        results.append({
                            "type": "customer_note",
                            "client": bc.name,
                            "content": bn.general_notes,
                            "comm_style": bn.comm_style,
                            "frequency": bn.visit_frequency,
                            "date": bn.created_at.isoformat(),
                            "boosted": True
                        })
                
            return results
        except Exception as e:
            print(f"ERROR: GraphRAG Similarity Search failed: {e}")
            return []

    async def get_store_context(self, store_id: str) -> Dict[str, Any]:
        """Fetch full relational context for a specific store (Account)."""
        res = await self.db.execute(
            select(Store)
            .where(Store.id == store_id)
            .options(
                selectinload(Store.clients).selectinload(Client.trade_notes),
                selectinload(Store.notes),
                selectinload(Store.business_profile)
            )
        )
        store = res.scalars().first()
        if not store:
            return {}

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
        
        # Fetch Latest Notes
        notes = [{
            "content": n.note, 
            "execution_level": n.execution_level,
            "date": n.created_at.strftime("%Y-%m-%d")
        } for n in store.notes[:5]]

        # Fetch Competitors linked to this store
        comp_res = await self.db.execute(
            select(Competitor).where(Competitor.store_id == store_id)
        )
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
            "competitors": competitors
        }

    async def search_store_profiles(self, query_text: str, business_id: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Perform semantic search across all store profiles (Task 109.5)."""
        try:
            query_vector = await self.embeddings.get_embedding(query_text)
            
            # Search Stores by profile embedding
            stmt = select(Store).where(Store.business_id == business_id)
            res = await self.db.execute(
                stmt.order_by(Store.embedding.cosine_distance(query_vector))
                .limit(limit)
            )
            
            stores = res.scalars().all()
            results = []
            for s in stores:
                results.append({
                    "name": s.name,
                    "region": s.region,
                    "market": s.market,
                    "segment": s.segment,
                    "address": s.address
                })
            return results
        except Exception as e:
            print(f"ERROR: search_store_profiles failed: {e}")
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
            print(f"ERROR in generate_discovery_response: {e}")
            return "Encontré algunas tiendas pero tuve un error al resumir la información."
