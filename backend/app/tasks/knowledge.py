from app.core.celery_app import celery_app
from app.core.database import SessionLocal
from app.core.embeddings import EmbeddingService
from app.models.trade import Store, StoreNote, Competitor, CustomerNote
from app.models.knowledge import KnowledgeCorpus, KnowledgeEntityType
from sqlalchemy.future import select
from sqlalchemy import update
import asyncio
import logging

logger = logging.getLogger(__name__)

async def _sync_vector_logic(entity_id: str, entity_type: str, business_id: str):
    """Internal logic to handle vectorization and corpus updates."""
    async with SessionLocal() as db:
        try:
            # 1. Map entity type to Model
            model_map = {
                "store": Store,
                "store_note": StoreNote,
                "competitor": Competitor,
                "customer_note": CustomerNote
            }
            
            if entity_type not in model_map:
                logger.error(f"Unsupported entity type for vectorization: {entity_type}")
                return

            model = model_map[entity_type]
            
            # 2. Fetch the entity
            res = await db.execute(select(model).where(model.id == entity_id))
            entity = res.scalars().first()
            
            if not entity:
                logger.warning(f"Entity {entity_id} of type {entity_type} not found for vectorization.")
                return

            # 3. Generate Semantic Summary
            # Most models implement get_semantic_summary()
            content = entity.get_semantic_summary()
            if not content:
                logger.warning(f"No content generated for entity {entity_id}")
                return

            # 4. Generate Embedding (Expensive Call)
            embeddings = EmbeddingService(db)
            vector = await embeddings.get_embedding(content)

            # 5. Idempotent Upsert into KnowledgeCorpus
            # Check if entry exists
            corpus_res = await db.execute(
                select(KnowledgeCorpus).where(
                    KnowledgeCorpus.entity_id == entity_id,
                    KnowledgeCorpus.entity_type == entity_type
                )
            )
            corpus_entry = corpus_res.scalars().first()
            
            metadata = {}
            if hasattr(entity, 'get_knowledge_metadata'):
                metadata = entity.get_knowledge_metadata()

            if corpus_entry:
                corpus_entry.content = content
                corpus_entry.embedding = vector
                corpus_entry.metadata_json = metadata
            else:
                new_entry = KnowledgeCorpus(
                    business_id=business_id,
                    entity_type=entity_type,
                    entity_id=entity_id,
                    content=content,
                    embedding=vector,
                    metadata_json=metadata
                )
                db.add(new_entry)

            # 6. Legacy Compatibility: Update original entity embedding if column exists
            # (Handled gracefully if column was dropped in d5aaaa9de0ec)
            # We check if the entity has an 'embedding' attribute
            if hasattr(entity, 'embedding'):
                entity.embedding = vector

            await db.commit()
            logger.info(f"Successfully vectorized {entity_type} {entity_id}")
            
        except Exception as e:
            logger.error(f"Error in _sync_vector_logic for {entity_type} {entity_id}: {e}")
            await db.rollback()
            raise e

@celery_app.task(
    bind=True, 
    name="sync_vector_task",
    max_retries=5, 
    default_retry_delay=30,
    autoretry_for=(Exception,),
    retry_backoff=True
)
def sync_vector_task(self, entity_id: str, entity_type: str, business_id: str):
    """Celery task to handle background vectorization."""
    try:
        return asyncio.run(_sync_vector_logic(entity_id, entity_type, business_id))
    except Exception as exc:
        logger.error(f"Retrying sync_vector_task for {entity_id} due to: {exc}")
        raise self.retry(exc=exc)
