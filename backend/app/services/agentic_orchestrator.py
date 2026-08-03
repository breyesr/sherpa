"""
B2B Agentic Orchestrator for Trade Intelligence.
Routes inbound messages through the LangGraph-based multi-agent pipeline for store visit notes, action extraction, and GraphRAG-enriched responses.
"""

import os
import json
import traceback
import asyncio
from typing import Dict, Any, List, Optional, Union, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage, ToolMessage, BaseMessage
from langchain_core.tools import tool
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from psycopg_pool import AsyncConnectionPool

from app.core.system_config import ConfigService
from app.core.config import settings
from app.core.memory import ChatMemory
from app.services.agent_state import AgentState
from app.services.graphrag import GraphRAGService
from app.services.entity_resolver import EntityResolver
from app.services.trade_tools import TradeToolKit
from app.services.calendar_tools import CalendarToolKit
from app.models.business import BusinessProfile

from jinja2 import Environment, FileSystemLoader, select_autoescape

# Setup prompt template environment
TEMPLATE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "core", "prompts")
prompt_env = Environment(
    loader=FileSystemLoader(TEMPLATE_DIR),
    autoescape=select_autoescape()
)

import logging

logger = logging.getLogger("agentic_orchestrator")

class AgenticOrchestrator:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.graphrag = GraphRAGService(db)
        self.resolver = EntityResolver(db)
        self.trade_toolkit = TradeToolKit(db)
        self.memory = ChatMemory()
        
    def _get_pool_uri(self):
        """Get psycopg compatible URI."""
        return settings.SQLALCHEMY_DATABASE_URI.replace("postgresql+asyncpg://", "postgresql://")

    async def _setup_graph(self, business_id: str, client_id: str, chat_id: str, active_store_id: str = None, checkpointer=None):
        """Build the LangGraph state machine."""
        logger.info(f"Setting up graph for business {business_id}...")
        
        from sqlalchemy.orm import selectinload
        # Fetch Business and Assistant
        res_b = await self.db.execute(
            select(BusinessProfile)
            .where(BusinessProfile.id == business_id)
            .options(selectinload(BusinessProfile.agents))
        )
        business = res_b.scalars().first()
        assistant = business.agents[0] if business.agents else None
        
        # Fetch Client
        from app.models.crm import Client
        from sqlalchemy.orm import selectinload
        res_c = await self.db.execute(
            select(Client)
            .where(Client.id == client_id)
            .options(selectinload(Client.stores))
        )
        client = res_c.scalars().first()

        # Fetch Summary from Memory
        summary = await self.memory.get_summary(chat_id)
        
        @tool
        async def resolve_entities(text: str):
            """
            Identify stores or contacts mentioned in the text. 
            ALWAYS call this first if the user mentions a new account or person.
            """
            return await self.resolver.resolve_entities(business_id, text)

        @tool
        async def query_knowledge(query: str, store_id: Optional[str] = None, discovery_scope: str = "GLOBAL"):
            """
            Search the knowledge base for historical notes, dossiers, and briefings.
            If store_id is provided, it focuses on that account.
            """
            sid = store_id or active_store_id
            return await self.graphrag.query_knowledge(
                query=query,
                business_id=business_id,
                store_id=sid,
                discovery_scope=discovery_scope
            )

        @tool
        async def log_field_report(text: str, store_id: Optional[str] = None):
            """
            Save a new observation, risk, or opportunity from the field.
            Use this when the representative shares new information.
            """
            sid = store_id or active_store_id
            return await self.trade_toolkit.log_field_report(business_id, text, sid)

        calendar_toolkit = CalendarToolKit(business, self.db)
        
        @tool
        async def get_available_slots(date: str, duration_minutes: int = 30):
            """Find free time slots for appointments."""
            return await calendar_toolkit.get_available_slots(date, duration_minutes)

        @tool
        async def create_appointment(client_identifier: str, start_time: str, notes: str, store_id: Optional[str] = None):
            """Book a new visit or appointment."""
            sid = store_id or active_store_id
            return await calendar_toolkit.create_appointment(client_identifier, start_time, notes, store_id=sid)

        @tool
        async def get_stores():
            """
            Retrieve the list of all stores and their regions, segments, and markets managed by this business.
            Use this when the user asks for a list of stores, regions, or locations we manage.
            """
            return await self.trade_toolkit.get_stores(business_id)

        @tool
        async def get_recent_orders(store_id: Optional[str] = None, limit: int = 5):
            """
            Retrieve the recent orders placed for the business, optionally filtered by a specific store_id.
            Use this when the user asks for the latest/recent orders, order history, or last products sold to a store.
            """
            sid = store_id or active_store_id
            return await self.trade_toolkit.get_recent_orders(business_id, store_id=sid, limit=limit)

        tools = [resolve_entities, query_knowledge, log_field_report, get_available_slots, create_appointment, get_stores, get_recent_orders]
        
        # Setup Model
        provider = await ConfigService.get(self.db, "ACTIVE_AI_PROVIDER", "openai")
        model_name = await ConfigService.get(self.db, f"{provider.upper()}_MODEL", "gpt-4o-mini")
        api_key = await ConfigService.get(self.db, f"{provider.upper()}_API_KEY")
        
        llm = ChatOpenAI(
            model=model_name,
            api_key=api_key,
            temperature=0,
            request_timeout=30.0
        ).bind_tools(tools)

        # Define Nodes
        async def call_model(state: AgentState):
            logger.debug(f"Node [agent] - Thinking...")
            messages = state["messages"]
            
            # Prepare all variables required by base_ai.j2 and b2b_sales_brain.j2
            from datetime import datetime
            from zoneinfo import ZoneInfo
            tz = ZoneInfo(business.timezone or "UTC")
            current_time = datetime.now(tz).strftime("%Y-%m-%d %H:%M:%S")

            # Inject system prompt
            template = prompt_env.get_template("b2b_sales_brain.j2")
            system_msg = SystemMessage(content=template.render(
                business=business,
                assistant=assistant,
                client=client,
                current_time=current_time,
                summary=summary,
                greeting_context=assistant.greeting if assistant else "",
                tool_results="", 
                active_store_id=state.get("store_id")
            ))
            
            # Locate last human message to safely prune history without splitting tool calls
            last_human_idx = -1
            for i in range(len(messages) - 1, -1, -1):
                if isinstance(messages[i], HumanMessage) or getattr(messages[i], "type", "") == "human":
                    last_human_idx = i
                    break
            
            def group_by_blocks(msgs):
                blocks = []
                idx = 0
                n_msgs = len(msgs)
                while idx < n_msgs:
                    m = msgs[idx]
                    if hasattr(m, "tool_calls") and m.tool_calls:
                        block = [m]
                        idx += 1
                        while idx < n_msgs and (isinstance(msgs[idx], ToolMessage) or getattr(msgs[idx], "type", "") == "tool"):
                            block.append(msgs[idx])
                            idx += 1
                        blocks.append(block)
                    elif isinstance(m, ToolMessage) or getattr(m, "type", "") == "tool":
                        if blocks:
                            blocks[-1].append(m)
                        else:
                            blocks.append([m])
                        idx += 1
                    else:
                        blocks.append([m])
                        idx += 1
                return blocks

            if last_human_idx != -1:
                current_turn = messages[last_human_idx:]
                history = messages[:last_human_idx]
                
                blocks = group_by_blocks(history)
                pruned_blocks = blocks[-2:] if len(blocks) > 2 else blocks
                pruned_history = [msg for block in pruned_blocks for msg in block]
                pruned_messages = pruned_history + current_turn
            else:
                blocks = group_by_blocks(messages)
                pruned_blocks = blocks[-4:] if len(blocks) > 4 else blocks
                pruned_messages = [msg for block in pruned_blocks for msg in block]
            
            response = await llm.ainvoke([system_msg] + pruned_messages)
            logger.debug(f"Node [agent] - Responded with {len(response.tool_calls)} tool calls.")
            return {"messages": [response]}

        tool_node = ToolNode(tools)

        # Define Graph
        workflow = StateGraph(AgentState)
        workflow.add_node("agent", call_model)
        workflow.add_node("tools", tool_node)
        workflow.set_entry_point("agent")
        
        def should_continue(state: AgentState):
            last_message = state["messages"][-1]
            return "tools" if last_message.tool_calls else END

        workflow.add_conditional_edges("agent", should_continue)
        workflow.add_edge("tools", "agent")

        return workflow.compile(checkpointer=checkpointer)

    async def get_response(self, business_id: str, client_id: str, user_message: str, chat_id: str) -> str:
        """Main entry point to run the agent with ReAct and Persistence."""
        try:
            # 1. Load context from Redis
            session_meta = await self.memory.get_metadata(chat_id)
            active_store_id = session_meta.get("active_store_id")
            
            # Fetch client to check role and prevent context bleed
            from app.models.crm import Client
            res_c = await self.db.execute(
                select(Client).where(Client.id == client_id)
            )
            client_obj = res_c.scalars().first()
            if client_obj and client_obj.role in ("representative", "sales_rep", "agent"):
                active_store_id = None

            uri = self._get_pool_uri()
            async with AsyncConnectionPool(uri, kwargs={"autocommit": True}) as pool:
                checkpointer = AsyncPostgresSaver(pool)
                await checkpointer.setup()
                
                # 2. Setup the Graph
                app = await self._setup_graph(business_id, client_id, chat_id, active_store_id, checkpointer)
                
                # 3. Configure Thread for persistence
                config = {"configurable": {"thread_id": chat_id}}
                
                logger.info(f"Invoking graph for thread {chat_id}...")
                # 4. Run the loop
                final_state = await app.ainvoke(

                    {
                        "messages": [HumanMessage(content=user_message)],
                        "business_id": business_id,
                        "store_id": active_store_id,
                        "reasoning": [],
                        "discovery_scope": "LOCAL" if active_store_id else "GLOBAL",
                        "final_response": ""
                    },
                    config=config
                )
                
            # 5. Extract Final Response and Reasoning (ONLY for the current turn)
            # LangGraph app.invoke returns the FULL state, including past messages.
            # We want to identify messages that were added in THIS specific run.
            messages = final_state["messages"]
            new_messages = messages[len(messages)-len(final_state.get("messages", [])):] # This is a placeholder logic
            
            # Better logic: extract logic from messages that aren't the initial HumanMessage
            reasoning_trace = []
            response_text = "Lo siento, no pude procesar tu solicitud."
            
            # Start from the end and work backwards until we hit the user's input for this turn
            current_turn_messages = []
            user_msg_clean = user_message.strip()
            
            for msg in reversed(messages):
                current_turn_messages.insert(0, msg)
                # Match by content or just stop at the first HumanMessage from the end
                if isinstance(msg, HumanMessage):
                    if msg.content.strip() == user_msg_clean or len(current_turn_messages) > 1:
                        break
            
            for msg in current_turn_messages:
                if isinstance(msg, AIMessage):
                    if msg.tool_calls:
                        for tc in msg.tool_calls:
                            reasoning_trace.append(f"Pensamiento: Necesito usar {tc['name']} con {tc['args']}")
                    
                    if msg.content:
                        response_text = msg.content
                elif isinstance(msg, ToolMessage):
                    reasoning_trace.append(f"Resultado de herramienta [{msg.name}]: {msg.content[:200]}...")

            # 6. Check for store shifts in the messages (using all current turn messages)
            for msg in reversed(current_turn_messages):
                if isinstance(msg, ToolMessage) and msg.name == "resolve_entities":
                    res = json.loads(msg.content) if isinstance(msg.content, str) else msg.content
                    if isinstance(res, dict) and res.get("store_id"):
                        new_sid = res["store_id"]
                        if new_sid != active_store_id:
                            logger.info(f"Context shift detected in LangGraph. Updating Redis to {new_sid}")
                            await self.memory.update_metadata(chat_id, {"active_store_id": new_sid})

            return response_text, " | ".join(reasoning_trace)
        except Exception as e:
            logger.error(f"AgenticOrchestrator failed: {e}")
            traceback.print_exc()
            return f"Error interno: {str(e)}", "Error de ejecución en el orquestador."
