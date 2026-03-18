import pytest
from app.models.crm import Client

def test_id_normalization():
    # symbols and spaces should be removed
    assert Client.normalize_id("+1 234-567 890") == "1234567890"
    assert Client.normalize_id("  123  ") == "123"
    assert Client.normalize_id(None) is None

def test_hash_consistency():
    # Different formats of the same ID must produce the exact same hash
    h1 = Client.hash_id("+1 234")
    h2 = Client.hash_id("1234")
    assert h1 == h2
    assert h1 is not None
