import sys
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy.pool import NullPool, AsyncAdaptedQueuePool
from app.core.config import settings

# Detect if the current process is a Celery process (worker/beat).
# When Celery is invoked, "celery" is present in sys.argv.
is_celery = any("celery" in arg for arg in sys.argv)

if is_celery:
    engine = create_async_engine(
        settings.SQLALCHEMY_DATABASE_URI,
        echo=False,
        poolclass=NullPool
    )
else:
    engine = create_async_engine(
        settings.SQLALCHEMY_DATABASE_URI,
        echo=False,
        poolclass=AsyncAdaptedQueuePool,
        pool_size=5,
        max_overflow=10,
        pool_recycle=1800
    )

SessionLocal = async_sessionmaker(
    autocommit=False, 
    autoflush=False, 
    bind=engine,
    expire_on_commit=False  # This prevents the object from becoming 'invalid' after saving
)

Base = declarative_base()

async def get_db():
    async with SessionLocal() as session:
        yield session
