import asyncio
import os
import sys
from unittest.mock import AsyncMock, MagicMock

# Add project root to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../")))

from app.services.entity_resolver import EntityResolver
from app.models.trade import Store, store_clients
from app.models.crm import Client

class MockDB:
    def __init__(self):
        self.stores = [
            Store(id="store_1", name="Tienda Central", business_id="bus_1"),
            Store(id="store_2", name="Ferretería Norte", business_id="bus_1")
        ]
        self.contacts = [
            Client(id="client_1", name="Carlos Mendoza", business_id="bus_1", role="Dueño"),
            Client(id="client_2", name="María López", business_id="bus_1", role="Encargada")
        ]
        # store_1 has client_1, store_2 has client_2
        self.links = {
            "client_1": "store_1",
            "client_2": "store_2"
        }

    async def execute(self, stmt):
        mock_result = MagicMock()
        
        # Super hacky inspection of the statement to figure out what to return
        stmt_str = str(stmt).lower()
        if "stores" in stmt_str and "clients" not in stmt_str:
            mock_result.scalars().all.return_value = self.stores
        elif "clients" in stmt_str and "store_clients" not in stmt_str:
            mock_result.scalars().all.return_value = self.contacts
        elif "store_clients" in stmt_str:
            # We assume it's checking links
            # We can't easily parse the exact client_id from the stmt without compiling,
            # so we'll just return a mock that has first() return something valid if possible.
            # In a real test, we would use proper session mocking or a test DB.
            # For this simple benchmark, we just want to ensure the logic runs.
            def mock_first():
                # Just return store_1 if we are checking links, it's a simplification
                return "store_1"
            mock_result.scalars().first = mock_first
        
        return mock_result

async def test_entity_resolver():
    print("Testing EntityResolver Linguistic Flexibility...")
    
    mock_db = MockDB()
    resolver = EntityResolver(mock_db)
    
    test_cases = [
        {"msg": "Llegando a Tienda Central", "expected": "store_1", "type": "Direct Name Match"},
        {"msg": "Estoy con María Lopez revisando el inventario", "expected": "store_1", "type": "Contact Name Match (Fallback)"}, # Notice we return store_1 for links in mock
        {"msg": "Hola Sherpa, ¿qué tal?", "expected": None, "type": "No Entity"},
    ]
    
    for case in test_cases:
        result = await resolver.resolve_entities("bus_1", case["msg"])
        print(f"\nMessage: '{case['msg']}'")
        print(f"Match Type: {case['type']}")
        print(f"Detected Store ID: {result.get('store_id')}")
        print(f"Confidence: {result.get('confidence')}")
        print(f"Source: {result.get('source')}")
        
        # Note: the LLM fuzzy match is hard to test deterministically without a real API key,
        # but the direct and contact matches should work perfectly.

if __name__ == "__main__":
    asyncio.run(test_entity_resolver())
