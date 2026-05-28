from app.core.celery_app import celery_app
from app.core.database import SessionLocal
from app.services.ingestion import IngestionAgent
from app.models.business import BusinessProfile
from sqlalchemy.future import select
import asyncio

async def run_ingestion(business_id: str, user_message: str):
    async with SessionLocal() as db:
        agent = IngestionAgent(db)
        result = await agent.process_report(business_id, user_message)
        
        # TODO: Send confirmation message back to WhatsApp/Telegram
        print(f"DEBUG INGESTION TASK RESULT: {result}")
        return result

@celery_app.task(bind=True, name="process_b2b_ingestion", max_retries=3, default_retry_delay=5)
def process_b2b_ingestion(self, business_id: str, user_message: str):
    """Celery task to handle B2B intelligence ingestion."""
    try:
        return asyncio.run(run_ingestion(business_id, user_message))
    except Exception as exc:
        print(f"ERROR: process_b2b_ingestion failed. Retrying... {exc}")
        raise self.retry(exc=exc)
