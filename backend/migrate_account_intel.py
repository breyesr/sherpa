import asyncio
import sys
import os

# Add the backend directory to sys.path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from app.core.database import SessionLocal
from app.models.trade import AccountIntelligence, Store
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
logger = logging.getLogger("migrate_account_intel")

async def migrate_account_intel():
    logger.info("🚀 Starting Account Intelligence Migration to Knowledge Corpus...")
    
    async with SessionLocal() as db:
        # Load AccountIntelligence with related Store for names
        stmt = select(AccountIntelligence).options(selectinload(AccountIntelligence.store))
        res = await db.execute(stmt)
        records = res.scalars().all()
        
        logger.info(f"Found {len(records)} AccountIntelligence records.")
        
        if not records:
            logger.info("No records found to migrate.")
            return

        embedder = EmbeddingService(db)
        
        total_migrated = 0
        total_updated = 0
        
        for record in records:
            logger.info(f"Processing dossier for store: {getattr(record.store, 'name', 'ID: ' + record.store_id)}")
            
            # Generate Deterministic ID
            entity_type = KnowledgeEntityType.ACCOUNT_SUMMARY
            corpus_id = KnowledgeCorpus.generate_id(entity_type, record.id)
            
            # Get Content & Metadata
            content = record.get_semantic_summary()
            metadata = record.get_knowledge_metadata()
            
            # Generate Embedding (Since it doesn't exist on the source model)
            try:
                embedding = await embedder.get_embedding(content)
            except Exception as e:
                logger.error(f"Failed to generate embedding for {record.id}: {e}")
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
                    business_id=record.business_id,
                    entity_type=entity_type,
                    entity_id=record.id,
                    content=content,
                    embedding=embedding,
                    metadata_json=metadata
                )
                db.add(new_entry)
                total_migrated += 1
                
        await db.commit()
        logger.info(f"✅ Migration Complete!")
        logger.info(f"✨ Created: {total_migrated} entries")
        logger.info(f"🔄 Updated: {total_updated} entries")

if __name__ == "__main__":
    asyncio.run(migrate_account_intel())
