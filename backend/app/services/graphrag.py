from typing import List, Dict, Any, Optional
from sqlalchemy.future import select
from sqlalchemy import text
from sqlalchemy.orm import selectinload
from app.models.trade import Store, StoreNote, CustomerNote, Competitor
from app.core.embeddings import EmbeddingService
from pgvector.sqlalchemy import Vector
import json
import traceback

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

    async def generate_brief(self, query_text: str, business_id: str, history: list = None) -> str:
        """Generate a strategic pre-visit brief using Hybrid RAG."""
        try:
            # 1. Identify Store from Query (Intelligent fuzzy match)
            # We look for store names, regions, or markets in the query text OR history
            res = await self.db.execute(
                select(Store)
                .where(Store.business_id == business_id)
                .options(selectinload(Store.clients), selectinload(Store.notes))
            )
            all_stores = res.scalars().all()
            
            target_store = None
            
            # Helper to search for store in a string
            def find_store_in_text(text: str) -> Optional[Store]:
                if not text: return None
                # Prioritize Exact Name Match
                for s in all_stores:
                    if s.name.lower() in text.lower():
                        return s
                
                # Fallback: Region/Market match if only one store exists in that context
                stores_in_context = []
                for s in all_stores:
                    if (s.region and s.region.lower() in text.lower()) or \
                       (s.market and s.market.lower() in text.lower()):
                        stores_in_context.append(s)
                
                if len(stores_in_context) == 1:
                    return stores_in_context[0]
                return None

            # Search in current query first
            target_store = find_store_in_text(query_text)

            # If not found, look back in history
            if not target_store and history:
                # Iterate history backwards (most recent first)
                for m in reversed(history[-5:]):
                    target_store = find_store_in_text(m["content"])
                    if target_store:
                        print(f"DEBUG GRAPHRAG: Identified store '{target_store.name}' from conversation history.")
                        break

            if not target_store:
                return "No pude identificar la tienda específica. ¿Podrías darme el nombre, la región o el mercado?"

            # 2. Fetch Relational Context (Strictly for this store)
            context = await self.get_store_context(target_store.id)
            
            # 3. Fetch Similar Notes (Strictly filtered by store_id to avoid leakage)
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

            return response.choices[0].message.content or "No se pudo generar la respuesta."

        except Exception as e:
            print(f"ERROR: generate_brief failed: {e}")
            traceback.print_exc()
            return "Lo siento, tuve un problema al generar el reporte de inteligencia."

    async def find_similar_notes(self, query_text: str, business_id: str, limit: int = 5, store_id: str = None) -> List[Dict[str, Any]]:
        """Perform vector similarity search strictly filtered by store_id."""
        try:
            # 1. Generate Query Embedding
            query_vector = await self.embeddings.get_embedding(query_text)
            
            # 2. Search Store Notes
            # We use L2 distance (<->) or Cosine distance (<=>)
            stmt = select(StoreNote, Store.name.label("store_name")).join(Store)
            filters = [Store.business_id == business_id]
            
            # CRITICAL: If a store is identified, ONLY search notes for that store
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
                    "content": note.note,
                    "risks": note.risks,
                    "opportunities": note.opportunities,
                    "execution": note.execution_level,
                    "date": note.created_at.isoformat()
                })
            
            # 3. Search Customer Notes for the same context
            cust_stmt = select(CustomerNote, Client.name.label("client_name")).join(Client)
            cust_filters = [CustomerNote.business_id == business_id]
            
            if store_id:
                from app.models.trade import store_clients
                cust_stmt = cust_stmt.join(store_clients, store_clients.c.client_id == Client.id).where(store_clients.c.store_id == store_id)

            cust_res = await self.db.execute(
                cust_stmt.where(*cust_filters)
                .order_by(CustomerNote.embedding.cosine_distance(query_vector))
                .limit(3)
            )

            for c_note, client_name in cust_res.all():
                results.append({
                    "type": "customer_note",
                    "client": client_name,
                    "content": c_note.general_notes,
                    "comm_style": c_note.comm_style,
                    "frequency": c_note.visit_frequency,
                    "date": c_note.created_at.isoformat()
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
                selectinload(Store.clients),
                selectinload(Store.notes),
                selectinload(Store.business_profile)
            )
        )
        store = res.scalars().first()
        if not store:
            return {}

        # Fetch Contacts from Many-to-Many
        contacts = [{"name": c.name, "role": c.role} for c in store.clients]
        
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
        competitors = [{"name": c.name, "presence": c.presence_level} for c in comp_res.scalars().all()]

        return {
            "name": store.name,
            "market": store.market,
            "region": store.region,
            "segment": store.segment,
            "contacts": contacts,
            "history": notes,
            "competitors": competitors
        }
