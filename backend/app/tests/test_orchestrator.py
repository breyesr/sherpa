import asyncio
import os
import sys
from unittest.mock import MagicMock

# Add project root to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../")))

from backend.app.services.orchestrator import B2BOrchestrator

async def test_orchestrator():
    print("Testing B2B Orchestrator Intent Classification...")
    
    # Mock DB and ConfigService
    mock_db = MagicMock()
    
    orchestrator = B2BOrchestrator(mock_db)
    
    test_messages = [
        "Store XYZ is interested in the new plumbing line.",
        "Give me the brief for Hardware ABC.",
        "Book a visit for next Friday at 2pm.",
        "Hi, how's it going?"
    ]
    
    for msg in test_messages:
        result = await orchestrator.classify_intent(msg)
        print(f"Message: '{msg}'")
        print(f"Intent: {result.get('intent')}")
        print(f"Reasoning: {result.get('reasoning')}")
        print("-" * 30)

if __name__ == "__main__":
    # Ensure you have OPENAI_API_KEY set in your environment
    asyncio.run(test_orchestrator())
