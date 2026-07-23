"""
Shared Pytest Fixtures for Backend Async Unit & Integration Testing.
"""
import pytest
import asyncio
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from app.core.database import Base
from app.models.user import User
from app.models.business import BusinessProfile, VerticalType
from app.api.auth import get_password_hash

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="session")
async def test_engine():
    """Create async in-memory SQLite engine for fast testing."""
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()

@pytest.fixture
async def db_session(test_engine) -> AsyncGenerator[AsyncSession, None]:
    """Provide isolated async database session per test."""
    async_session = async_sessionmaker(test_engine, expire_on_commit=False, class_=AsyncSession)
    async with async_session() as session:
        yield session
        await session.rollback()

@pytest.fixture
async def mock_user(db_session: AsyncSession) -> User:
    """Create a mock user fixture."""
    user = User(
        email="test_user@example.com",
        hashed_password=get_password_hash("testpassword123"),
        role="admin",
        is_admin=True,
        is_active=True
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user

@pytest.fixture
async def mock_business(db_session: AsyncSession, mock_user: User) -> BusinessProfile:
    """Create a mock business profile fixture."""
    business = BusinessProfile(
        user_id=mock_user.id,
        name="Test Business Corp",
        vertical_type=VerticalType.TRADE,
        features_config={
            "scheduling": {"enabled": True},
            "b2b_solutions": {"enabled": True},
            "sales_intelligence": {"enabled": True}
        }
    )
    db_session.add(business)
    await db_session.commit()
    await db_session.refresh(business)
    return business
