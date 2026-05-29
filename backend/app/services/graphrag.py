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

    async def generate_brief(self, query_text: str, business_id: str) -> str:
        """Generate a strategic pre-visit brief using Hybrid RAG."""
        try:
            # 1. Identify Store from Query (Intelligent fuzzy match)
            # We look for store names, regions, or markets in the query text
            res = await self.db.execute(
                select(Store)
                .where(Store.business_id == business_id)
                .options(selectinload(Store.clients), selectinload(Store.notes))
            )
            all_stores = res.scalars().all()
            
            target_store = None
            # Prioritize Exact Name Match
            for s in all_stores:
                if s.name.lower() in query_text.lower():
                    target_store = s
                    break
            
            # Fallback: Region/Market match if only one store exists in that context
            if not target_store:
                stores_in_context = []
                for s in all_stores:
                    if (s.region and s.region.lower() in query_text.lower()) or \
                       (s.market and s.market.lower() in query_text.lower()):
                        stores_in_context.append(s)
                
                if len(stores_in_context) == 1:
                    target_store = stores_in_context[0]

            if not target_store:
                return "No pude identificar la tienda específica. ¿Podrías darme el nombre, la región o el mercado?"

            # 2. Fetch Relational Context
            context = await self.get_store_context(target_store.id)
            
            # 3. Fetch Similar Notes (Vector)
            similar_notes = await self.find_similar_notes(query_text, business_id)
            
            # 4. Generate LLM Brief
            template = prompt_env.get_template("visit_briefer.j2")
            prompt = template.render(
                store=context,
                notes=similar_notes
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

            return response.choices[0].message.content or "No se pudo generar el brief."

        except Exception as e:
            print(f"ERROR: generate_brief failed: {e}")
            traceback.print_exc()
            return "Lo siento, tuve un problema al generar el reporte de inteligencia."

    async def find_similar_notes(self, query_text: str, business_id: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Perform vector similarity search for relevant intelligence notes."""
        try:
            # 1. Generate Query Embedding
            query_vector = await self.embeddings.get_embedding(query_text)
            
            # 2. Search Store Notes
            # We use L2 distance (<->) or Cosine distance (<=>)
            store_res = await self.db.execute(
                select(StoreNote, Store.name.label("store_name"))
                .join(Store)
                .where(Store.business_id == business_id)
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
                    "date": note.created_at.isoformat()
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
