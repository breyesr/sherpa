import asyncio
import sys
import os

# Add the backend directory to sys.path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from app.core.database import SessionLocal
from app.models.trade import Store, StoreNote, Competitor, CustomerNote
from app.models.crm import Client
from app.models.knowledge import KnowledgeCorpus
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("backfill_corpus")

async def backfill_corpus():
    logger.info("🚀 Starting Knowledge Corpus Backfill...")
    
    async with SessionLocal() as db:
        # 1. Models to backfill (Entity Type, Model Class, Relationship Loads)
        targets = [
            ("store", Store, [selectinload(Store.clients)]),
            ("store_note", StoreNote, [selectinload(StoreNote.store)]),
            ("competitor", Competitor, [selectinload(Competitor.store)]),
            ("customer_note", CustomerNote, [selectinload(CustomerNote.client)]),
            ("client", Client, [selectinload(Client.trade_notes)])
        ]
        
        total_migrated = 0
        total_skipped = 0
        total_updated = 0
        
        for entity_type, model, options in targets:
            logger.info(f"--- Processing {entity_type}s ---")
            
            stmt = select(model)
            if options:
                stmt = stmt.options(*options)
                
            res = await db.execute(stmt)
            entities = res.scalars().all()
            
            logger.info(f"Found {len(entities)} {entity_type} records.")
            
            for entity in entities:
                # We migrate if it has an embedding
                # (Some models like Client/Store have direct embedding columns)
                # (Others might rely on the summary being generated and then vectorized)
                # FOR THE BACKFILL: We prioritize records that ALREADY have embeddings to avoid expensive OpenAI calls now.
                embedding = getattr(entity, "embedding", None)
                
                if embedding is None:
                    total_skipped += 1
                    continue
                
                # Generate Deterministic ID
                corpus_id = KnowledgeCorpus.generate_id(entity_type, entity.id)
                
                # Get Content & Metadata
                content = entity.get_semantic_summary()
                metadata = {}
                if hasattr(entity, "get_knowledge_metadata"):
                    metadata = entity.get_knowledge_metadata()
                
                # Get Business ID
                business_id = getattr(entity, "business_id", None)
                if not business_id:
                    logger.warning(f"Entity {entity.id} ({entity_type}) missing business_id. Skipping.")
                    continue

                # Upsert Logic
                res_c = await db.execute(select(KnowledgeCorpus).where(KnowledgeCorpus.id == corpus_id))
                corpus_entry = res_c.scalars().first()
                
                if corpus_entry:
                    corpus_entry.content = content
                    corpus_entry.embedding = embedding
                    corpus_entry.metadata_json = metadata
                    total_updated += 1
                else:
                    new_entry = KnowledgeCorpus(
                        id=corpus_id,
                        business_id=business_id,
                        entity_type=entity_type,
                        entity_id=entity.id,
                        content=content,
                        embedding=embedding,
                        metadata_json=metadata
                    )
                    db.add(new_entry)
                    total_migrated += 1
            
            # Commit per model type
            await db.commit()
            logger.info(f"Finished {entity_type}. Migrated: {total_migrated}, Updated: {total_updated}")

    logger.info(f"✅ Backfill Complete!")
    logger.info(f"✨ Created: {total_migrated} entries")
    logger.info(f"🔄 Updated: {total_updated} entries")
    logger.info(f"⏩ Skipped: {total_skipped} entries (no existing embedding)")

if __name__ == "__main__":
    asyncio.run(backfill_corpus())
