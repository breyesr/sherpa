import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, AsyncMock, patch
from app.main import app
from app.core.database import get_db
from app.models.demo import DemoRequest
from app.models.user import User


def test_register_endpoint_is_disabled():
    client = TestClient(app)
    response = client.post(
        "/api/v1/auth/register",
        json={"email": "new_user@example.com", "password": "secure_password"}
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Registration disabled"

def test_request_demo_endpoint_creates_request():
    mock_session = AsyncMock()
    
    # Mock no existing demo request found
    mock_scalars = MagicMock()
    mock_scalars.first.return_value = None
    mock_result = MagicMock()
    mock_result.scalars.return_value = mock_scalars
    mock_session.execute.return_value = mock_result
    
    app.dependency_overrides[get_db] = lambda: mock_session
    
    try:
        client = TestClient(app)
        payload = {
            "name": "Jane Doe",
            "business_name": "Doe Trade LLC",
            "email": "jane@example.com",
            "phone_number": "+1234567890",
            "primary_use_case": "trade"
        }
        response = client.post("/api/v1/auth/request-demo", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Jane Doe"
        assert data["business_name"] == "Doe Trade LLC"
        assert data["email"] == "jane@example.com"
        assert data["phone_number"] == "+1234567890"
        assert data["primary_use_case"] == "trade"
        
        # Verify db.add and db.commit were called
        mock_session.add.assert_called_once()
        mock_session.commit.assert_called_once()
    finally:
        app.dependency_overrides.pop(get_db, None)

def test_update_demo_request_status():
    from app.api.auth import get_current_user
    mock_admin = User(id="admin_123", email="admin@example.com", is_admin=True, role="admin")
    
    app.dependency_overrides[get_current_user] = lambda: mock_admin
    
    mock_session = AsyncMock()
    from datetime import datetime
    mock_demo = DemoRequest(
        id="demo_123",
        name="Jane Doe",
        business_name="Doe Trade LLC",
        email="jane@example.com",
        phone_number="+1234567890",
        primary_use_case="trade",
        status="pending",
        created_at=datetime.utcnow()
    )

    
    # Mock lookup
    mock_scalars = MagicMock()
    mock_scalars.first.return_value = mock_demo
    mock_result = MagicMock()
    mock_result.scalars.return_value = mock_scalars
    mock_session.execute.return_value = mock_result
    
    app.dependency_overrides[get_db] = lambda: mock_session
    
    try:
        client = TestClient(app)
        response = client.patch(
            "/api/v1/admin/demo-requests/demo_123/status",
            json={"status": "contacted"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "contacted"
        assert mock_demo.status == "contacted"
        mock_session.commit.assert_called_once()
    finally:
        app.dependency_overrides.pop(get_current_user, None)
        app.dependency_overrides.pop(get_db, None)

