from typing import TypedDict, Annotated, List, Union, Dict, Any
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages

class AgentState(TypedDict):
    """
    The state of our Agentic RAG graph.
    """
    # Messages are standard for chat agents, 'add_messages' ensures we append instead of overwrite
    messages: Annotated[List[BaseMessage], add_messages]
    
    # B2B Specific Context
    business_id: str
    store_id: Union[str, None]
    
    # Internal logic tracking
    reasoning: List[str]
    
    # Configuration for tools
    discovery_scope: str # "LOCAL" or "GLOBAL"
    
    # Output storage
    final_response: str
