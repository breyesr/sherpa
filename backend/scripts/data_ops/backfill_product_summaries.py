"""
Backfill Script: Ingestion-Time Product Summarization (Epic 227)
================================================================
Queries products missing an ai_summary and triggers summarization
either via Celery task dispatch (default) or synchronously (--sync).

Usage:
  python scripts/data_ops/backfill_product_summaries.py [--business-id UUID] [--sync] [--force]
"""

import asyncio
import argparse
import sys
import os
import logging

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.core.database import SessionLocal
from app.models.trade import Product, Category
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("backfill_product_summaries")

async def backfill(business_id: str = None, sync_mode: bool = False, force: bool = False):
    logger.info("Starting Product AI Summary Backfill...")
    if business_id:
        logger.info(f"Filtering for business_id: {business_id}")
    if force:
        logger.info("Force mode enabled: re-summarizing all products")

    async with SessionLocal() as db:
        stmt = select(Product).join(Category)
        if business_id:
            stmt = stmt.where(Category.business_id == business_id)
        if not force:
            stmt = stmt.where(Product.ai_summary.is_(None))

        stmt = stmt.options(selectinload(Product.category))
        res = await db.execute(stmt)
        products = res.scalars().all()

    logger.info(f"Found {len(products)} products to process.")
    if not products:
        logger.info("Nothing to backfill.")
        return

    success_count = 0
    fail_count = 0

    if sync_mode:
        logger.info("Running in SYNC mode (direct LLM execution)...")
        from app.tasks.knowledge import _generate_product_summary_logic
        for p in products:
            try:
                logger.info(f"Summarizing product {p.id} ({p.name})...")
                await _generate_product_summary_logic(p.id)
                success_count += 1
            except Exception as e:
                logger.error(f"Failed to summarize product {p.id}: {e}")
                fail_count += 1
    else:
        logger.info("Running in ASYNC mode (dispatching Celery tasks)...")
        from app.tasks.knowledge import generate_product_summary
        for p in products:
            try:
                generate_product_summary.delay(p.id)
                success_count += 1
            except Exception as e:
                logger.error(f"Failed to dispatch task for product {p.id}: {e}")
                fail_count += 1

    logger.info(f"Backfill complete. Dispatched/Processed: {success_count}, Failed: {fail_count}")

def main():
    parser = argparse.ArgumentParser(description="Backfill product AI summaries")
    parser.add_argument("--business-id", type=str, default=None, help="Filter by business ID")
    parser.add_argument("--sync", action="store_true", help="Execute synchronously without Celery")
    parser.add_argument("--force", action="store_true", help="Re-summarize products that already have ai_summary")
    args = parser.parse_args()

    asyncio.run(backfill(business_id=args.business_id, sync_mode=args.sync, force=args.force))

if __name__ == "__main__":
    main()
