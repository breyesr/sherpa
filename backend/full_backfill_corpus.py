import asyncio
import sys
import os

# Add the backend directory to sys.path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from app.core.database import SessionLocal
from app.models.trade import Store, StoreNote, Competitor, CustomerNote, AccountIntelligence
from app.models.crm import Client
from app.models.knowledge import KnowledgeCorpus, KnowledgeEntityType
from app.core.embeddings import EmbeddingService
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("full_backfill")

async def full_backfill():
    logger.info("🚀 Starting COMPLETE Knowledge Corpus Backfill...")
    
    async with SessionLocal() as db:
        embedder = EmbeddingService(db)
        
        # Models to backfill (Entity Type, Model Class, Relationship Loads)
        targets = [
            (KnowledgeEntityType.STORE, Store, [selectinload(Store.clients)]),
            (KnowledgeEntityType.CLIENT, Client, [selectinload(Client.trade_notes), selectinload(Client.stores)]),
            (KnowledgeEntityType.STORE_NOTE, StoreNote, [selectinload(StoreNote.store)]),
            (KnowledgeEntityType.CUSTOMER_NOTE, CustomerNote, [selectinload(CustomerNote.client).selectinload(Client.stores)]),
            (KnowledgeEntityType.COMPETITOR, Competitor, [selectinload(Competitor.store)]),
            (KnowledgeEntityType.ACCOUNT_SUMMARY, AccountIntelligence, [selectinload(AccountIntelligence.store)])
        ]
        
        total_created = 0
        total_updated = 0
        total_failed = 0
        
        for entity_type, model, options in targets:
            logger.info(f"--- Processing {entity_type}s ---")
            
            stmt = select(model)
            if options:
                stmt = stmt.options(*options)
                
            res = await db.execute(stmt)
            entities = res.scalars().all()
            
            logger.info(f"Found {len(entities)} {entity_type} records.")
            
            for entity in entities:
                try:
                    # 1. Get Content & Metadata
                    content = entity.get_semantic_summary()
                    if not content or len(content.strip()) < 5:
                        logger.warning(f"Skipping {entity.id} ({entity_type}): Content too short.")
                        continue

                    metadata = {}
                    if hasattr(entity, "get_knowledge_metadata"):
                        metadata = entity.get_knowledge_metadata()
                    
                    # 2. Get/Generate Embedding
                    # Use existing if available (Store, Client, etc), otherwise generate
                    embedding = getattr(entity, "embedding", None)
                    if embedding is None:
                        logger.info(f"Generating embedding for {entity_type} {entity.id}...")
                        embedding = await embedder.get_embedding(content)

                    # 3. Generate Deterministic ID
                    corpus_id = KnowledgeCorpus.generate_id(entity_type, entity.id)
                    
                    # 4. Get Business ID
                    business_id = getattr(entity, "business_id", None)
                    if not business_id:
                        logger.warning(f"Entity {entity.id} ({entity_type}) missing business_id. Skipping.")
                        continue

                    # 5. Upsert Logic
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
                        total_created += 1
                except Exception as e:
                    logger.error(f"❌ Failed to process {entity_type} {entity.id}: {e}")
                    total_failed += 1
            
            # Commit per model type to save progress
            await db.commit()
            logger.info(f"Progress for {entity_type}: Created: {total_created}, Updated: {total_updated}")

    logger.info(f"✅ Full Backfill Complete!")
    logger.info(f"✨ Total Created: {total_created} entries")
    logger.info(f"🔄 Total Updated: {total_updated} entries")
    logger.info(f"⚠️ Total Failed: {total_failed} entries")

if __name__ == "__main__":
    asyncio.run(full_backfill())
