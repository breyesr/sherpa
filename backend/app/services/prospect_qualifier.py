import os
import json
import traceback
import asyncio
from typing import Dict, Any, List, Optional, Union, Tuple, TypedDict, Annotated
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage, ToolMessage, BaseMessage
from langchain_core.tools import tool
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from psycopg_pool import AsyncConnectionPool
from langgraph.graph.message import add_messages

from app.core.system_config import ConfigService
from app.core.config import settings
from app.models.business import BusinessProfile
from app.models.trade import Store, Product, Category, StoreAction, ActionCategory, ActionObjective, ActionStatus, store_clients
from app.models.crm import Client

import logging

logger = logging.getLogger("prospect_qualifier")

class ProspectQualifierState(TypedDict):
    messages: Annotated[List[BaseMessage], add_messages]
    business_id: str
    sender_phone: str
    
    # Prospect Data
    product: Optional[str]
    quantity: Optional[int]
    location: Optional[str]
    phone: Optional[str]
    email: Optional[str]
    company: Optional[str]
    
    # Execution flag
    is_completed: bool
    final_response: str

class ProspectQualifier:
    def __init__(self, db: AsyncSession):
        self.db = db
        
    def _get_pool_uri(self):
        """Get psycopg compatible URI."""
        return settings.SQLALCHEMY_DATABASE_URI.replace("postgresql+asyncpg://", "postgresql://")

    async def _setup_graph(self, business_id: str, product_list_str: str, checkpointer=None):
        """Build the LangGraph state machine for qualification."""
        
        @tool
        def update_prospect_data(
            product: Optional[str] = None,
            quantity: Optional[int] = None,
            location: Optional[str] = None,
            phone: Optional[str] = None,
            email: Optional[str] = None,
            company: Optional[str] = None
        ):
            """
            Actualiza los datos del prospecto. Llama a esta herramienta de inmediato si el usuario
            proporciona cualquiera de los siguientes campos: ID del producto, cantidad, ubicación de entrega, teléfono, email, o nombre de la empresa.
            """
            update = {}
            if product is not None:
                update["product"] = product
            if quantity is not None:
                update["quantity"] = quantity
            if location is not None:
                update["location"] = location
            if phone is not None:
                update["phone"] = phone
            if email is not None:
                update["email"] = email
            if company is not None:
                update["company"] = company
            return update

        tools = [update_prospect_data]
        tool_node = ToolNode(tools)
        
        # Setup Model
        provider = await ConfigService.get(self.db, "ACTIVE_AI_PROVIDER", "openai")
        model_name = await ConfigService.get(self.db, f"{provider.upper()}_MODEL", "gpt-4o-mini")
        api_key = await ConfigService.get(self.db, f"{provider.upper()}_API_KEY")
        
        llm = ChatOpenAI(
            model=model_name,
            api_key=api_key,
            temperature=0
        ).bind_tools(tools)

        async def call_model(state: ProspectQualifierState):
            messages = state["messages"]
            
            # System Prompt
            system_prompt = f"""Eres el Asistente de Calificación de Clientes para la campaña de prospección de la empresa.
Tu objetivo es guiar una conversación amigable en WhatsApp para recopilar 6 datos clave del prospecto:
1. Producto de interés (debe coincidir con uno de los productos de nuestro catálogo listado abajo)
2. Cantidad requerida
3. Ubicación/Dirección de entrega
4. Teléfono de contacto
5. Correo electrónico (email)
6. Nombre de la empresa (compañía)

Catálogo de productos disponibles:
{product_list_str}

Instrucciones:
- Saluda amigablemente y pregunta en qué producto y cantidad está interesado.
- Si el usuario menciona un producto, asócialo con uno del catálogo. Llama a la herramienta `update_prospect_data` con el ID del producto (ej: 'id_del_producto') y la cantidad.
- Si te proporciona otros datos (ubicación, teléfono, email, empresa), llama a `update_prospect_data` con esos valores de inmediato.
- Sé natural y conversacional en español. No pidas todos los datos de golpe; pídelos de 1 en 1 o máximo de 2 en 2 para mantener la conversación fluida.
- Cada vez que detectes nueva información del usuario para cualquiera de los 6 campos, DEBES llamar a la herramienta `update_prospect_data`.

Estado actual de los datos recopilados:
- Producto (ID): {state.get('product') or 'No proporcionado'}
- Cantidad: {state.get('quantity') or 'No proporcionada'}
- Ubicación: {state.get('location') or 'No proporcionada'}
- Teléfono: {state.get('phone') or 'No proporcionado'}
- Email: {state.get('email') or 'No proporcionado'}
- Empresa: {state.get('company') or 'No proporcionada'}

Si ya tienes los 6 datos recopilados en el estado, indica de forma educada al usuario que estás procesando su solicitud y que en un momento recibirá los detalles.
"""
            system_msg = SystemMessage(content=system_prompt)
            response = await llm.ainvoke([system_msg] + messages)
            return {"messages": [response]}

        async def run_tools_and_update_state(state: ProspectQualifierState):
            tool_output = await tool_node.ainvoke(state)
            new_messages = tool_output.get("messages", [])
            state_update = {"messages": new_messages}
            
            for msg in new_messages:
                if isinstance(msg, ToolMessage) and msg.name == "update_prospect_data":
                    try:
                        # Parse tool output to merge back to state
                        # Note: tool returns dict format as json string
                        data = json.loads(msg.content.replace("'", '"'))
                        state_update.update(data)
                    except Exception as e:
                        logger.error(f"Error parsing tool output in graph: {e}")
            
            return state_update

        async def qualify_lead(state: ProspectQualifierState):
            prod_id = state.get("product")
            qty = state.get("quantity")
            loc = state.get("location")
            phone_num = state.get("phone")
            email_addr = state.get("email")
            comp = state.get("company")
            biz_id = state.get("business_id")
            
            # Fetch Product
            res_prod = await self.db.execute(select(Product).where(Product.id == prod_id))
            product = res_prod.scalars().first()
            
            if not product:
                err_response = "Hubo un error al procesar tu solicitud. El producto seleccionado no coincide con nuestro catálogo."
                return {
                    "is_completed": True,
                    "final_response": err_response,
                    "messages": [AIMessage(content=err_response)]
                }
            
            threshold = product.wholesale_threshold or 0
            
            # Qualification evaluation
            if qty >= threshold:
                # 1. Create/Find Client
                # Check if client already exists by phone hash
                id_hash = Client.hash_id(phone_num)
                res_cli = await self.db.execute(
                    select(Client).where(Client.business_id == biz_id, Client.whatsapp_id_hash == id_hash)
                )
                client = res_cli.scalars().first()
                
                if not client:
                    client = Client(
                        business_id=biz_id,
                        name=f"Lead {comp}",
                        phone=phone_num,
                        email=email_addr,
                        custom_fields={"company": comp}
                    )
                    self.db.add(client)
                    await self.db.flush()
                
                # 2. Create Store
                store = Store(
                    business_id=biz_id,
                    name=f"{comp} (WhatsApp Lead)",
                    address=loc,
                    phone=phone_num,
                    email=email_addr
                )
                self.db.add(store)
                await self.db.flush()
                
                # Link Client to Store
                await self.db.execute(
                    store_clients.insert().values(store_id=store.id, client_id=client.id)
                )
                
                # 3. Create StoreAction
                action = StoreAction(
                    business_id=biz_id,
                    store_id=store.id,
                    assigned_to_id=client.id,
                    category=ActionCategory.COMMERCIAL,
                    objective=ActionObjective.GENERAL,
                    status=ActionStatus.PROPOSED,
                    details={
                        "lead_source": "WhatsApp Prospection",
                        "product_interest": product.name,
                        "requested_quantity": qty,
                        "notes": f"Lead mayorista interesada en comprar {qty} unidades de {product.name} en {loc}."
                    }
                )
                self.db.add(action)
                await self.db.commit()
                
                response = f"¡Perfecto! Hemos registrado tu solicitud como cliente mayorista para {qty} unidades de {product.name}. Un representante comercial se pondrá en contacto contigo pronto al {phone_num} para programar una llamada de coordinación."
            else:
                # Direct to physical local stores
                res_stores = await self.db.execute(
                    select(Store).where(
                        Store.business_id == biz_id,
                        Store.address.ilike(f"%{loc}%")
                    )
                )
                stores = res_stores.scalars().all()
                if not stores:
                    res_stores = await self.db.execute(
                        select(Store).where(Store.business_id == biz_id).limit(3)
                    )
                    stores = res_stores.scalars().all()
                
                store_list_str = "\n".join([f"- {s.name}: {s.address or 'Sin dirección'}" for s in stores])
                response = f"Muchas gracias por tu interés en {product.name}. Como tu pedido de {qty} unidades es menor a nuestro volumen mayorista ({threshold} unidades), te invitamos a adquirir el producto en una de nuestras tiendas físicas autorizadas:\n{store_list_str}"
            
            return {
                "is_completed": True,
                "final_response": response,
                "messages": [AIMessage(content=response)]
            }

        # Build Graph
        workflow = StateGraph(ProspectQualifierState)
        workflow.add_node("agent", call_model)
        workflow.add_node("tools", run_tools_and_update_state)
        workflow.add_node("qualify_lead", qualify_lead)
        
        workflow.set_entry_point("agent")
        
        def route_after_agent(state: ProspectQualifierState):
            last_message = state["messages"][-1]
            if last_message.tool_calls:
                return "tools"
            
            # Check if all 6 fields are collected
            required_fields = ["product", "quantity", "location", "phone", "email", "company"]
            has_all = all(state.get(f) is not None for f in required_fields)
            
            if has_all and not state.get("is_completed"):
                return "qualify_lead"
            
            return END

        workflow.add_conditional_edges("agent", route_after_agent)
        workflow.add_edge("tools", "agent")
        workflow.add_edge("qualify_lead", END)
        
        return workflow.compile(checkpointer=checkpointer)

    async def get_response(self, business_id: str, sender_phone: str, user_message: str) -> Tuple[str, bool]:
        """Main entry point to qualify lead over WhatsApp campaign."""
        try:
            # 1. Fetch product list
            stmt = select(Product).join(Category).where(Category.business_id == business_id)
            products = (await self.db.execute(stmt)).scalars().all()
            product_list_str = "\n".join([f"- ID: {p.id}, Nombre: {p.name}, Umbral Mayorista: {p.wholesale_threshold or 'Ninguno'}" for p in products])
            
            # 2. Run graph with checkpointer
            uri = self._get_pool_uri()
            thread_id = f"prospect_{sender_phone}"
            
            async with AsyncConnectionPool(uri, kwargs={"autocommit": True}) as pool:
                checkpointer = AsyncPostgresSaver(pool)
                await checkpointer.setup()
                
                app = await self._setup_graph(business_id, product_list_str, checkpointer)
                config = {"configurable": {"thread_id": thread_id}}
                
                final_state = await app.ainvoke(
                    {
                        "messages": [HumanMessage(content=user_message)],
                        "business_id": business_id,
                        "sender_phone": sender_phone,
                        "is_completed": False,
                        "final_response": ""
                    },
                    config=config
                )
                
            # 3. Check if qualifier finalized the process
            is_completed = final_state.get("is_completed", False)
            if is_completed:
                return final_state["final_response"], True
                
            # Otherwise extract the last AIMessage content
            messages = final_state["messages"]
            for msg in reversed(messages):
                if isinstance(msg, AIMessage) and msg.content:
                    return msg.content, False
            
            return "Lo siento, tuve un problema al procesar tu mensaje. ¿Podrías repetir?", False
            
        except Exception as e:
            logger.error(f"ProspectQualifier execution error: {e}")
            traceback.print_exc()
            return "Lo siento, tuve un problema interno. Por favor, intenta de nuevo más tarde.", False
