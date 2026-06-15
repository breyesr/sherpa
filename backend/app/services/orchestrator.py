import json
import traceback
import unicodedata
import asyncio
from typing import Dict, Any, Optional, Tuple, List
from jinja2 import Environment, FileSystemLoader, select_autoescape
import litellm
from app.core.system_config import ConfigService
from sqlalchemy.future import select
from app.models.trade import Store
from app.services.graphrag import GraphRAGService

# Setup prompt template environment
prompt_env = Environment(
    loader=FileSystemLoader("app/core/prompts"),
    autoescape=select_autoescape()
)

from app.services.entity_resolver import EntityResolver
from app.services.trade_tools import TradeToolKit
from app.services.calendar_tools import CalendarToolKit

class B2BOrchestrator:
    def __init__(self, db: Any):
        self.db = db
        self.graphrag = GraphRAGService(db)
        self.trade_toolkit = TradeToolKit(db)
        self.resolver = EntityResolver(db)

    async def _get_planner_response(self, user_message: str, history: list, active_store_id: str = None) -> List[Dict[str, Any]]:
        """Pass 1: Planner LLM call to get tool sequence."""
        try:
            template = prompt_env.get_template("thin_agent_planner.j2")
            
            # Combine tool definitions from all toolkits
            tools = []
            tools.append(self.resolver.get_tool_definition())
            tools.extend(self.trade_toolkit.get_tool_definitions())
            tools.append(self.graphrag.get_tool_definition())
            tools.extend(CalendarToolKit.get_tool_definitions(vertical_type="TRADE"))

            history_str = ""
            if history:
                history_str = "\n".join([f"{m['role']}: {m['content']}" for m in history[-5:]])

            prompt = template.render(
                user_message=user_message,
                history=history_str,
                tools=tools,
                active_store_id=active_store_id
            )

            provider = await ConfigService.get(self.db, "ACTIVE_AI_PROVIDER", "openai")
            model = await ConfigService.get(self.db, f"{provider.upper()}_MODEL", "gpt-4o-mini")
            api_key = await ConfigService.get(self.db, f"{provider.upper()}_API_KEY")

            response = await litellm.acompletion(
                model=f"{provider}/{model}" if "/" not in model else model,
                messages=[{"role": "user", "content": prompt}],
                api_key=api_key,
                response_format={"type": "json_object"},
                timeout=30.0
            )

            content = response.choices[0].message.content
            # The planner might return a single object or a list depending on the prompt instructions
            plan = json.loads(content)
            
            # Guardrail 1: Max Plan Size
            # Prevent token inflation and latency spikes by capping the number of tools planned.
            max_tools = 4
            tools_to_run = []
            
            if isinstance(plan, dict) and "plan" in plan:
                tools_to_run = plan["plan"]
            elif isinstance(plan, list):
                tools_to_run = plan
                
            if len(tools_to_run) > max_tools:
                print(f"WARNING (LLMOps): Planner generated {len(tools_to_run)} tools. Truncating to {max_tools}.")
                tools_to_run = tools_to_run[:max_tools]
                
            return tools_to_run
        except Exception as e:
            print(f"ERROR: Thin Agent Planner failed: {e}")
            traceback.print_exc()
            return []

    async def _execute_plan(self, business: Any, plan: List[Dict[str, Any]], active_store_id: str = None, identifier: str = None) -> List[Dict[str, Any]]:
        """Phase 2: Deterministic execution of the planned tools."""
        results = []
        calendar_toolkit = CalendarToolKit(business, self.db)
        current_store_id = active_store_id
        
        for step in plan:
            name = step.get("name")
            args = step.get("arguments", {})
            
            # Smart Argument Resolution: If a tool needs store_id but it's ambiguous/missing,
            # use the one we just resolved or the active one.
            if "store_id" in args and (not args["store_id"] or str(args["store_id"]).startswith("<")):
                args["store_id"] = current_store_id

            result = {"tool": name, "output": None}
            
            try:
                # Guardrail 2: Timeout wrapper for each tool
                # Ensures a single slow tool (like a DB lock or GraphRAG search) doesn't hang the loop.
                async def run_tool():
                    if name == "resolve_entities":
                        return await self.resolver.resolve_entities(business.id, args.get("text", ""))
                    elif name == "get_account_dossier":
                        sid = args.get("store_id") or current_store_id
                        return await self.trade_toolkit.get_account_dossier(sid)
                    elif name == "query_knowledge":
                        sid = args.get("store_id") or current_store_id
                        return await self.graphrag.query_knowledge(
                            query=args.get("query"),
                            business_id=business.id,
                            store_id=sid,
                            discovery_scope=args.get("discovery_scope", "GLOBAL"),
                            chat_id=identifier
                        )
                    elif name == "log_field_report":
                        sid = args.get("store_id") or current_store_id
                        return await self.trade_toolkit.log_field_report(business.id, args.get("text"), sid)
                    elif name == "create_appointment":
                        sid = args.get("store_id") or current_store_id
                        return await calendar_toolkit.create_appointment(
                            client_identifier=args.get("client_identifier") or identifier,
                            start_time=args.get("start_time"),
                            service_id=args.get("service_id"),
                            notes=args.get("notes"),
                            store_id=sid,
                            customer_id=args.get("customer_id")
                        )
                    else:
                        return f"Unknown tool: {name}"

                # Enforce a 10-second timeout per tool
                res = await asyncio.wait_for(run_tool(), timeout=10.0)
                result["output"] = res
                
                # Update local context for subsequent tools in this same plan
                if name == "resolve_entities" and isinstance(res, dict) and res.get("store_id"):
                    current_store_id = res["store_id"]
                    
            except asyncio.TimeoutError:
                result["output"] = {"success": False, "error": "Tool execution timed out."}
                print(f"WARNING (LLMOps): Tool '{name}' timed out after 10s.")
            except Exception as e:
                result["output"] = {"success": False, "error": f"Execution error: {str(e)}"}
                print(f"ERROR (LLMOps): Tool '{name}' raised an exception: {e}")
            
            results.append(result)
        return results

    async def route_message(self, business: Any, client: Any, user_message: str, history: list = None, metadata: Optional[Dict] = None, identifier: str = None) -> Tuple[str, str]:
        """
        Thin Agent (Two-Pass) Orchestrator.
        1. Plan: Identify tools needed.
        2. Execute: Run tools and collect context.
        3. Synthesize: Generate final response.
        """
        reasoning = []
        
        # 0. Load current session state
        active_store_id = None
        memory = None
        if identifier:
            from app.core.memory import ChatMemory
            memory = ChatMemory()
            session_meta = await memory.get_metadata(identifier)
            active_store_id = session_meta.get("active_store_id")

        # 1. Phase 1: Planning
        plan = await self._get_planner_response(user_message, history, active_store_id)
        reasoning.append(f"Planner selected {len(plan)} tools: {[s['name'] for s in plan]}")

        # 2. Phase 2: Execution
        tool_results = await self._execute_plan(business, plan, active_store_id, identifier)
        print(f"DEBUG THIN AGENT: Tool Results: {json.dumps(tool_results, indent=2)}")
        
        # Post-Execution: Handle side effects (like topic shifts from resolve_entities)
        for res in tool_results:
            if res["tool"] == "resolve_entities" and res["output"].get("store_id"):
                new_store_id = res["output"]["store_id"]
                if new_store_id != active_store_id and memory:
                    await memory.clear_session_data(identifier)
                    await memory.update_metadata(identifier, {"active_store_id": new_store_id})
                    if history is not None: history.clear()
                    reasoning.append(f"Topic Shift detected to {new_store_id}. Session cleared.")
                    active_store_id = new_store_id

        # 3. Phase 3: Synthesis
        try:
            template = prompt_env.get_template("b2b_sales_brain.j2")
            
            history_str = ""
            if history:
                history_str = "\n".join([f"{m['role']}: {m['content']}" for m in history[-5:]])

            # Prepare context package for the prompt
            context_package = json.dumps(tool_results, indent=2)

            prompt = template.render(
                business=business,
                assistant=business.assistant_config,
                client=client,
                user_message=user_message,
                history=history_str,
                tool_results=context_package,
                active_store_id=active_store_id
            )

            provider = await ConfigService.get(self.db, "ACTIVE_AI_PROVIDER", "openai")
            model = await ConfigService.get(self.db, f"{provider.upper()}_MODEL", "gpt-4o")
            api_key = await ConfigService.get(self.db, f"{provider.upper()}_API_KEY")

            response = await litellm.acompletion(
                model=f"{provider}/{model}" if "/" not in model else model,
                messages=[{"role": "user", "content": prompt}],
                api_key=api_key,
                timeout=45.0
            )

            final_text = response.choices[0].message.content
            reasoning.append(f"Synthesis complete using {model}.")
            
            return final_text, " | ".join(reasoning)
            
        except Exception as e:
            print(f"ERROR: Thin Agent Synthesis failed: {e}")
            traceback.print_exc()
            return "Lo siento, tuve un problema procesando la información del negocio. ¿En qué más puedo ayudarte?", "ERROR during synthesis"
