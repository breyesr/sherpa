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
    print(f"\n================ STARTING DEEP DIVE SESSION ================")
    # history is no longer passed directly, it's managed internally by the AgenticOrchestrator
    for i, msg in enumerate(messages, 1):
        print(f"\n--- TURNO {i} ---")
        print(f"[USER]: {msg}")
        
        response, reasoning = await orch.get_response(
            business_id=biz.id,
            client_id=client.id,
            user_message=msg,
            chat_id=identifier
        )
        
        # Extract just the tool names from reasoning for a cleaner log
        print(f"[MARCO]: {response}")
        print(f"  > [DEBUG LOGIC]: {reasoning}")

async def main():
    async with SessionLocal() as db:
        biz_id = "069b397d-5646-70aa-8000-55dbb6e613c4"
        from sqlalchemy.orm import selectinload
        res = await db.execute(select(BusinessProfile).where(BusinessProfile.id == biz_id).options(selectinload(BusinessProfile.agents)))
        biz = res.scalars().first()
        
        res_client = await db.execute(select(Client).where(Client.business_id == biz_id).limit(1))
        client = res_client.scalars().first()
        
        orch = AgenticOrchestrator(db)
        
        questions = [
            "Hola Marco, soy nuevo en la ruta. Voy para Súper Mercadito del Sur por primera vez. ¿Me puedes dar un resumen general de la tienda y su estado actual?",
            "Perfecto. Entiendo que debo hablar con Doña María. Según tus registros, ¿cómo es ella y cuál es la mejor forma de abordarla hoy?",
            "¿Qué detalles curiosos o temas recurrentes has visto en las notas de las últimas visitas que hemos tenido con ella?",
            "Para llevarle algo de valor, ¿tenemos registro de acciones de marketing, promociones o entrega de material POP que hayamos hecho con ellos recientemente?",
            "¿Y sobre acciones comerciales? ¿Se le ha dado algún descuento especial, crédito o hay alguna negociación pendiente que deba retomar?",
            "Muy útil. Sabiendo todo esto y considerando la competencia que tienen ahí, ¿cuál debería ser mi 'pitch' o argumento de venta principal ahora que cruce la puerta?"
        ]
        
        await run_session(orch, biz, client, "session_deep_dive", questions)

if __name__ == "__main__":
    sys.path.append(os.path.join(os.getcwd(), "backend"))
    asyncio.run(main())
