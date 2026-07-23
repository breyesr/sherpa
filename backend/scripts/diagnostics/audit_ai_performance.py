import asyncio
import os
import sys
from sqlalchemy.future import select
from sqlalchemy import text
from app.core.database import SessionLocal
from app.models.messaging import Message, Conversation
from app.models.business import BusinessProfile, VerticalType

async def audit_b2b_performance():
    print("--- Sherpa AI B2B Performance Audit ---")
    async with SessionLocal() as db:
        # 1. Identify B2B Businesses (TRADE Vertical)
        res = await db.execute(select(BusinessProfile).where(BusinessProfile.vertical_type == VerticalType.TRADE))
        b2b_businesses = res.scalars().all()
        
        if not b2b_businesses:
            print("No B2B businesses found.")
            return

        for biz in b2b_businesses:
            print(f"\nAuditing Business: {biz.name} (ID: {biz.id})")
            
            # 2. Fetch recent messages with reasoning traces
            res_msgs = await db.execute(
                select(Message, Conversation)
                .join(Conversation)
                .where(Conversation.business_id == biz.id)
                .where(Message.reasoning_trace != None)
                .order_by(Message.created_at.desc())
                .limit(20)
            )
            data = res_msgs.all()
            
            if not data:
                print("  No recent reasoning traces found for B2B.")
                continue

            print(f"  Found {len(data)} recent traced interactions.")
            
            failures = {
                "intent_misclassification": 0,
                "context_loss": 0,
                "entity_resolution_failure": 0,
                "reasoning_loops": 0
            }

            for msg, conv in data:
                print(f"\n  [Interaction] {msg.created_at}")
                print(f"  User: {msg.content[:100]}...")
                print(f"  Reasoning: {msg.reasoning_trace}")
                
                # Heuristic analysis of reasoning trace
                trace_lower = msg.reasoning_trace.lower()
                if "intent classified as chat" in trace_lower and any(word in msg.content.lower() for word in ["pedido", "tienda", "visita"]):
                    failures["intent_misclassification"] += 1
                    print("  >> POTENTIAL FAILURE: Intent misclassified as CHAT when user likely meant REPORT or QUERY.")
                
                if "no dossier found" in trace_lower and "local" in trace_lower:
                    failures["entity_resolution_failure"] += 1
                    print("  >> POTENTIAL FAILURE: Failed to resolve entity or dossier for local scope.")

            print(f"\n  [Summary for {biz.name}]")
            for k, v in failures.items():
                print(f"    {k}: {v}")

if __name__ == "__main__":
    # Add backend to path to allow imports
    sys.path.append(os.path.join(os.getcwd(), "backend"))
    asyncio.run(audit_b2b_performance())
