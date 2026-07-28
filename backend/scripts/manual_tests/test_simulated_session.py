import asyncio
import os
import sys
import json
from sqlalchemy.future import select
from app.core.database import SessionLocal
from app.services.agentic_orchestrator import AgenticOrchestrator
from app.models.business import BusinessProfile
from app.models.crm import Client

async def run_session(orch, biz, client, identifier, messages):
    print(f"\n================ STARTING SESSION: {identifier} ================")
    # history is no longer passed directly, it's managed internally by the AgenticOrchestrator
    for msg in messages:
        print(f"\n[USER]: {msg}")
        
        response, reasoning = await orch.get_response(
            business_id=biz.id,
            client_id=client.id,
            user_message=msg,
            chat_id=identifier
        )
        print(f"[REASONING]: {reasoning}")
        print(f"[MARCO]: {response}")

async def main():
    async with SessionLocal() as db:
        biz_id = "069b397d-5646-70aa-8000-55dbb6e613c4"
        from sqlalchemy.orm import selectinload
        res = await db.execute(select(BusinessProfile).where(BusinessProfile.id == biz_id).options(selectinload(BusinessProfile.agents)))
        biz = res.scalars().first()
        
        res_client = await db.execute(select(Client).where(Client.business_id == biz_id).limit(1))
        client = res_client.scalars().first()
        
        orch = AgenticOrchestrator(db)
        
        # Scenario 1: The user's failing flow (GraphRAG neglect)
        await run_session(orch, biz, client, "session_1", [
            "voy a ir a ver a La Tiendita del Oeste, que tenemos de ellos de nuestras últimas visitas?",
            "hemos tenido acciones de marketing con ellos?"
        ])
        
        # Scenario 2: Two stores and people
        await run_session(orch, biz, client, "session_2", [
            "tengo junta con Doña Maria de Súper Mercadito del Sur, qué sabes de ella?",
            "y qué hay de Roberto en La Tiendita del Oeste, cómo le ha ido?"
        ])
        
        # Scenario 3: Complex query
        await run_session(orch, biz, client, "session_3", [
            "quiero comparar Tienda La Norteña con Ferretería Central. ¿Cuál tiene más competencia?"
        ])

if __name__ == "__main__":
    sys.path.append(os.path.join(os.getcwd(), "backend"))
    asyncio.run(main())
