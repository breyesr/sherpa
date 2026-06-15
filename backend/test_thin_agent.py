import asyncio
import os
import sys
import json
from sqlalchemy.future import select
from app.core.database import SessionLocal
from app.models.business import BusinessProfile, VerticalType
from app.services.orchestrator import B2BOrchestrator
from app.models.crm import Client

async def test_scenarios():
    print("--- Testing Thin Agent B2B Orchestrator ---")
    async with SessionLocal() as db:
        # Pick the business ID that has Tienda La Norteña
        target_biz_id = "069b397d-5646-70aa-8000-55dbb6e613c4"
        from sqlalchemy.orm import selectinload
        res = await db.execute(
            select(BusinessProfile)
            .where(BusinessProfile.id == target_biz_id)
            .options(selectinload(BusinessProfile.agents))
        )
        biz = res.scalars().first()
        if not biz:
            print(f"Business {target_biz_id} not found. Picking first available.")
            res = await db.execute(select(BusinessProfile).where(BusinessProfile.vertical_type == VerticalType.TRADE).options(selectinload(BusinessProfile.agents)))
            biz = res.scalars().first()
        if not biz:
            print("No B2B business found for testing.")
            return

        orchestrator = B2BOrchestrator(db)
        
        scenarios = [
            "Llegando a Tienda La Norteña, ¿qué sabemos?",
            "Hay mucha competencia de Marca X aquí.",
            "Viendo a Doña María en Súper Mercadito. Se queja de precios. Agendame para el lunes a las 10am."
        ]

        for msg in scenarios:
            print(f"\n[TESTING MESSAGE]: {msg}")
            
            # Simulate a client (can be any)
            res_client = await db.execute(select(Client).where(Client.business_id == biz.id).limit(1))
            client = res_client.scalars().first()

            response, reasoning = await orchestrator.route_message(
                business=biz,
                client=client,
                user_message=msg,
                history=[],
                identifier="test_chat_id"
            )

            print(f"Reasoning Trace: {reasoning}")
            print(f"Final Response: {response}")

if __name__ == "__main__":
    sys.path.append(os.path.join(os.getcwd(), "backend"))
    asyncio.run(test_scenarios())
