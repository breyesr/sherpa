import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.services.agentic_orchestrator import AgenticOrchestrator
from app.models.business import BusinessProfile
from app.models.crm import Client
from langchain_core.messages import HumanMessage, AIMessage, ToolMessage, SystemMessage

@pytest.mark.anyio
@patch("app.services.agentic_orchestrator.ConfigService")
@patch("app.services.agentic_orchestrator.prompt_env")
@patch("app.services.agentic_orchestrator.ChatOpenAI")
async def test_agent_history_pruning_logic(mock_chat_openai_cls, mock_prompt_env, mock_config_service):
    # Mock ConfigService.get to return default values
    async def mock_config_get(db, key, default=None):
        return default
    mock_config_service.get.side_effect = mock_config_get

    # Setup mock LLM
    mock_llm = MagicMock()
    mock_llm.bind_tools.return_value = mock_llm
    mock_llm.ainvoke = AsyncMock()
    mock_llm.ainvoke.return_value = AIMessage(content="Hello from agent", tool_calls=[])
    mock_chat_openai_cls.return_value = mock_llm
    
    # Setup mock prompt template
    mock_template = MagicMock()
    mock_template.render.return_value = "System instructions"
    mock_prompt_env.get_template.return_value = mock_template
    
    # Mock business, assistant, client
    mock_business = MagicMock(spec=BusinessProfile)
    mock_business.id = "business_123"
    mock_business.timezone = "UTC"
    mock_business.agents = []
    
    mock_client = MagicMock(spec=Client)
    mock_client.id = "client_789"
    
    # Setup mock DB session
    mock_db = AsyncMock()
    mock_execute_res = MagicMock()
    mock_execute_res.scalars.return_value.first.side_effect = [
        mock_business,  # First query: BusinessProfile
        mock_client     # Second query: Client
    ]
    mock_db.execute.return_value = mock_execute_res
    
    orchestrator = AgenticOrchestrator(db=mock_db)
    
    # Mock Redis memory
    mock_memory = AsyncMock()
    mock_memory.get_summary.return_value = "Redis conversation summary context"
    orchestrator.memory = mock_memory
    
    # Construct a historical state:
    # Turn 1: H1 -> AI1
    # Turn 2: H2 -> AI2
    # Turn 3 (Current): H3 (representing current user turn)
    messages = [
        HumanMessage(content="Hello"),
        AIMessage(content="Hi there"),
        HumanMessage(content="How are you?"),
        AIMessage(content="I am good"),
        HumanMessage(content="Let's do work") # Last human message
    ]
    
    # Build graph compile using orchestrator
    from langgraph.checkpoint.memory import MemorySaver
    checkpointer = MemorySaver()
    graph = await orchestrator._setup_graph(
        business_id="business_123",
        client_id="client_789",
        chat_id="chat_abc",
        checkpointer=checkpointer
    )
    
    state = {
        "messages": messages,
        "business_id": "business_123",
        "store_id": "store_123",
        "reasoning": [],
        "discovery_scope": "GLOBAL",
        "final_response": ""
    }
    
    # Execute graph
    await graph.ainvoke(state, config={"configurable": {"thread_id": "chat_abc"}})
    
    # Verify the LLM was invoked with pruned history
    assert mock_llm.ainvoke.call_count == 1
    invoked_list = mock_llm.ainvoke.call_args[0][0]
    
    # Expected: SystemMessage + [H2, AI2, H3]
    # Pruned H1 and AI1
    assert len(invoked_list) == 4
    assert isinstance(invoked_list[0], SystemMessage)
    assert invoked_list[1].content == "How are you?"  # H2
    assert invoked_list[2].content == "I am good"      # AI2
    assert invoked_list[3].content == "Let's do work"   # H3


@pytest.mark.anyio
@patch("app.services.agentic_orchestrator.ConfigService")
@patch("app.services.agentic_orchestrator.prompt_env")
@patch("app.services.agentic_orchestrator.ChatOpenAI")
async def test_agent_history_pruning_with_tools(mock_chat_openai_cls, mock_prompt_env, mock_config_service):
    # Mock ConfigService.get to return default values
    async def mock_config_get(db, key, default=None):
        return default
    mock_config_service.get.side_effect = mock_config_get

    # Setup mock LLM
    mock_llm = MagicMock()
    mock_llm.bind_tools.return_value = mock_llm
    mock_llm.ainvoke = AsyncMock()
    mock_llm.ainvoke.return_value = AIMessage(content="Hello from agent", tool_calls=[])
    mock_chat_openai_cls.return_value = mock_llm
    
    # Setup mock prompt template
    mock_template = MagicMock()
    mock_template.render.return_value = "System instructions"
    mock_prompt_env.get_template.return_value = mock_template
    
    # Mock business, assistant, client
    mock_business = MagicMock(spec=BusinessProfile)
    mock_business.id = "business_123"
    mock_business.timezone = "UTC"
    mock_business.agents = []
    
    mock_client = MagicMock(spec=Client)
    mock_client.id = "client_789"
    
    # Setup mock DB session
    mock_db = AsyncMock()
    mock_execute_res = MagicMock()
    mock_execute_res.scalars.return_value.first.side_effect = [
        mock_business,  # First query: BusinessProfile
        mock_client     # Second query: Client
    ]
    mock_db.execute.return_value = mock_execute_res
    
    orchestrator = AgenticOrchestrator(db=mock_db)
    
    # Mock Redis memory
    mock_memory = AsyncMock()
    mock_memory.get_summary.return_value = "Redis conversation summary context"
    orchestrator.memory = mock_memory
    
    # Construct a historical state with tool call/response:
    # 0: H1
    # 1: AI1 (no tools)
    # 2: H2
    # 3: AI2 (with tool call)
    # 4: ToolMsg (matching tool call)
    # 5: AI3 (answering tool call)
    # 6: H3 (Current turn - last human message)
    from langchain_core.messages import ToolMessage
    messages = [
        HumanMessage(content="Hello"),
        AIMessage(content="Hi there"),
        HumanMessage(content="Search stores"),
        AIMessage(content="", tool_calls=[{"name": "get_stores", "args": {}, "id": "call_123"}]),
        ToolMessage(content="Store list", tool_call_id="call_123", name="get_stores"),
        AIMessage(content="Found stores: Store A, Store B"),
        HumanMessage(content="Okay, select Store A") # Last human message
    ]
    
    # Build graph compile using orchestrator
    from langgraph.checkpoint.memory import MemorySaver
    checkpointer = MemorySaver()
    graph = await orchestrator._setup_graph(
        business_id="business_123",
        client_id="client_789",
        chat_id="chat_abc",
        checkpointer=checkpointer
    )
    
    state = {
        "messages": messages,
        "business_id": "business_123",
        "store_id": "store_123",
        "reasoning": [],
        "discovery_scope": "GLOBAL",
        "final_response": ""
    }
    
    # Execute graph
    await graph.ainvoke(state, config={"configurable": {"thread_id": "chat_abc"}})
    
    # Verify the LLM was invoked with pruned history
    assert mock_llm.ainvoke.call_count == 1
    invoked_list = mock_llm.ainvoke.call_args[0][0]
    
    # Let's see what blocks should exist in history (messages[:6]):
    # Block 0: H1
    # Block 1: AI1
    # Block 2: H2
    # Block 3: AI2 (tool_calls=[...]) + ToolMessage
    # Block 4: AI3
    #
    # We prune history to the last 2 blocks: Block 3 and Block 4.
    # Therefore, pruned_history should be Block 3 + Block 4:
    # [AI2 (with tool call), ToolMessage, AI3]
    # And then we append current_turn: [H3]
    #
    # Total invoked messages: SystemMessage + AI2 + ToolMsg + AI3 + H3
    assert len(invoked_list) == 5
    assert isinstance(invoked_list[0], SystemMessage)
    
    # AI2
    assert isinstance(invoked_list[1], AIMessage)
    assert len(invoked_list[1].tool_calls) == 1
    assert invoked_list[1].tool_calls[0]["id"] == "call_123"
    
    # ToolMsg
    assert isinstance(invoked_list[2], ToolMessage)
    assert invoked_list[2].tool_call_id == "call_123"
    
    # AI3
    assert isinstance(invoked_list[3], AIMessage)
    assert invoked_list[3].content == "Found stores: Store A, Store B"
    
    # H3
    assert isinstance(invoked_list[4], HumanMessage)
    assert invoked_list[4].content == "Okay, select Store A"
