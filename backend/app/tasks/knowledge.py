from app.core.celery_app import celery_app
from app.core.database import SessionLocal
from app.core.embeddings import EmbeddingService
from app.models.trade import Store, StoreNote, Competitor, CustomerNote
from app.models.knowledge import KnowledgeCorpus
from app.models.crm import Client
from sqlalchemy.future import select
import asyncio
import logging

logger = logging.getLogger(__name__)

from sqlalchemy.orm import selectinload

async def _write_to_dlq(task_name: str, entity_type: str, entity_id: str, business_id: str, error_message: str, retry_count: int):
    from app.models.dlq import VectorizationDLQ
    async with SessionLocal() as db:
        try:
            dlq_entry = VectorizationDLQ(
                business_id=business_id,
                entity_type=entity_type,
                entity_id=entity_id,
                task_name=task_name,
                error_message=error_message,
                retry_count=retry_count,
                status="pending"
            )
            db.add(dlq_entry)
            await db.commit()
            logger.info(f"Successfully recorded failure to DLQ: {task_name} for {entity_type} {entity_id}")
        except Exception as e:
            logger.error(f"Failed to write to DLQ: {e}")
            await db.rollback()

async def _sync_vector_logic(entity_id: str, entity_type: str, business_id: str):
    """Internal logic to handle vectorization and corpus updates."""
    import hashlib
    async with SessionLocal() as db:
        try:
            # 1. Map entity type to Model
            model_map = {
                "store": Store,
                "store_note": StoreNote,
                "competitor": Competitor,
                "customer_note": CustomerNote,
                "client": Client
            }
            
            if entity_type not in model_map:
                logger.error(f"Unsupported entity type for vectorization: {entity_type}")
                return

            model = model_map[entity_type]
            
            # 2. Fetch the entity with necessary relationships for get_semantic_summary
            stmt = select(model).where(model.id == entity_id)
            
            if entity_type == "store":
                stmt = stmt.options(selectinload(Store.clients))
            elif entity_type == "store_note":
                stmt = stmt.options(selectinload(StoreNote.store))
            elif entity_type == "competitor":
                stmt = stmt.options(selectinload(Competitor.store))
            elif entity_type == "customer_note":
                stmt = stmt.options(selectinload(CustomerNote.client))
            elif entity_type == "client":
                stmt = stmt.options(selectinload(Client.stores), selectinload(Client.trade_notes))
            
            res = await db.execute(stmt)
            entity = res.scalars().first()
            
            if not entity:
                logger.warning(f"Entity {entity_id} of type {entity_type} not found for vectorization.")
                return

            # 3. Generate Semantic Summary
            content = entity.get_semantic_summary()
            if not content:
                logger.warning(f"No content generated for entity {entity_id}")
                return

            # Compute hash of new content
            content_hash = hashlib.sha256(content.encode("utf-8")).hexdigest()

            # 5. Check if entry exists and compare hash before generating embedding
            deterministic_id = KnowledgeCorpus.generate_id(entity_type, entity_id)
            
            corpus_res = await db.execute(
                select(KnowledgeCorpus).where(KnowledgeCorpus.id == deterministic_id)
            )
            corpus_entry = corpus_res.scalars().first()
            
            metadata = {}
            if hasattr(entity, 'get_knowledge_metadata'):
                metadata = entity.get_knowledge_metadata() or {}
            
            metadata["content_hash"] = content_hash

            skip_embedding = False
            vector = None
            
            if corpus_entry:
                old_metadata = corpus_entry.metadata_json or {}
                if old_metadata.get("content_hash") == content_hash and corpus_entry.embedding is not None:
                    skip_embedding = True
                    vector = corpus_entry.embedding
                    logger.info(f"Content hash unchanged for {entity_type} {entity_id}. Skipping embedding API call.")

            if not skip_embedding:
                # 4. Generate Embedding (Expensive Call)
                embeddings = EmbeddingService(db)
                vector = await embeddings.get_embedding(content)

            if corpus_entry:
                corpus_entry.content = content
                if vector is not None:
                    corpus_entry.embedding = vector
                corpus_entry.metadata_json = metadata
            else:
                new_entry = KnowledgeCorpus(
                    id=deterministic_id,
                    business_id=business_id,
                    entity_type=entity_type,
                    entity_id=entity_id,
                    content=content,
                    embedding=vector,
                    metadata_json=metadata
                )
                db.add(new_entry)

            if hasattr(entity, 'embedding') and vector is not None:
                entity.embedding = vector

            await db.commit()
            logger.info(f"Successfully vectorized {entity_type} {entity_id}")
            
        except Exception as e:
            logger.error(f"Error in _sync_vector_logic for {entity_type} {entity_id}: {e}")
            await db.rollback()
            raise e

async def _delete_vector_logic(entity_id: str, entity_type: str, business_id: str):
    """Internal logic to handle asynchronous deletion of vector/corpus data."""
    async with SessionLocal() as db:
        try:
            # 1. Generate deterministic ID of primary entity
            deterministic_id = KnowledgeCorpus.generate_id(entity_type, entity_id)
            
            # 2. Find and delete primary entry
            stmt = select(KnowledgeCorpus).where(KnowledgeCorpus.id == deterministic_id)
            res = await db.execute(stmt)
            entry = res.scalars().first()
            if entry:
                await db.delete(entry)
                logger.info(f"Deleted KnowledgeCorpus entry for {entity_type} {entity_id}")
            
            # 3. Special cascade delete for client (delete associated customer notes)
            if entity_type == "client":
                from app.models.trade import CustomerNote
                notes_stmt = select(CustomerNote.id).where(CustomerNote.client_id == entity_id)
                notes_res = await db.execute(notes_stmt)
                note_ids = notes_res.scalars().all()
                for note_id in note_ids:
                    note_deterministic_id = KnowledgeCorpus.generate_id("customer_note", note_id)
                    note_corpus_stmt = select(KnowledgeCorpus).where(KnowledgeCorpus.id == note_deterministic_id)
                    note_corpus_res = await db.execute(note_corpus_stmt)
                    note_entry = note_corpus_res.scalars().first()
                    if note_entry:
                        await db.delete(note_entry)
                        logger.info(f"Cascade deleted KnowledgeCorpus customer note entry {note_id} for client {entity_id}")
                        
            await db.commit()
        except Exception as e:
            logger.error(f"Error in _delete_vector_logic for {entity_type} {entity_id}: {e}")
            await db.rollback()
            raise e

async def _update_account_intel_logic(store_id: str, business_id: str):
    """Internal logic to trigger dossier synthesis and update the fat table."""
    from app.services.graphrag import GraphRAGService
    async with SessionLocal() as db:
        try:
            rag_service = GraphRAGService(db)
            await rag_service.update_account_intelligence(store_id, business_id)
            logger.info(f"Successfully updated account intelligence for store {store_id}")
        except Exception as e:
            logger.error(f"Error in _update_account_intel_logic for store {store_id}: {e}")
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
        if self.request.retries >= self.max_retries:
            logger.error(f"Max retries exhausted for sync_vector_task ({entity_type} {entity_id}). Writing to DLQ.")
            asyncio.run(_write_to_dlq(
                task_name="sync_vector_task",
                entity_type=entity_type,
                entity_id=entity_id,
                business_id=business_id,
                error_message=str(exc),
                retry_count=self.request.retries
            ))
        logger.error(f"Retrying sync_vector_task for {entity_id} due to: {exc}")
        raise self.retry(exc=exc)

@celery_app.task(
    bind=True, 
    name="delete_vector_task",
    max_retries=5, 
    default_retry_delay=30,
    autoretry_for=(Exception,),
    retry_backoff=True
)
def delete_vector_task(self, entity_id: str, entity_type: str, business_id: str):
    """Celery task to handle background vector deletion."""
    try:
        return asyncio.run(_delete_vector_logic(entity_id, entity_type, business_id))
    except Exception as exc:
        if self.request.retries >= self.max_retries:
            logger.error(f"Max retries exhausted for delete_vector_task ({entity_type} {entity_id}). Writing to DLQ.")
            asyncio.run(_write_to_dlq(
                task_name="delete_vector_task",
                entity_type=entity_type,
                entity_id=entity_id,
                business_id=business_id,
                error_message=str(exc),
                retry_count=self.request.retries
            ))
        logger.error(f"Retrying delete_vector_task for {entity_id} due to: {exc}")
        raise self.retry(exc=exc)

@celery_app.task(
    bind=True, 
    name="update_account_intelligence_task",
    max_retries=3, 
    default_retry_delay=60,
    autoretry_for=(Exception,),
    retry_backoff=True
)
def update_account_intelligence_task(self, store_id: str, business_id: str):
    """Celery task to handle background dossier synthesis (Fat Table)."""
    try:
        return asyncio.run(_update_account_intel_logic(store_id, business_id))
    except Exception as exc:
        logger.error(f"Retrying update_account_intelligence_task for {store_id} due to: {exc}")
        raise self.retry(exc=exc)
