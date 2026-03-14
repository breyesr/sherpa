from typing import Dict, Optional, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.system import SystemConfiguration
from app.core.security import encrypt_token, decrypt_token

class ConfigService:
    @staticmethod
    async def get(db: AsyncSession, key: str, default: Any = None) -> Optional[str]:
        """Fetch and decrypt a system configuration value."""
        result = await db.execute(select(SystemConfiguration).where(SystemConfiguration.key == key))
        config = result.scalars().first()
        if not config:
            return default
        return decrypt_token(config.value)

    @staticmethod
    async def set(db: AsyncSession, key: str, value: str, description: str = None):
        """Encrypt and store a system configuration value."""
        try:
            result = await db.execute(select(SystemConfiguration).where(SystemConfiguration.key == key))
            config = result.scalars().first()
            
            encrypted_value = encrypt_token(value)
            
            if not config:
                config = SystemConfiguration(key=key, value=encrypted_value, description=description)
                db.add(config)
            else:
                config.value = encrypted_value
                if description:
                    config.description = description
            
            await db.commit()
        except Exception as e:
            await db.rollback()
            print(f"ERROR: Failed to save system config '{key}': {e}")
            raise e

    @staticmethod
    async def get_all(db: AsyncSession) -> Dict[str, str]:
        """Fetch all decrypted configurations (Admin only)."""
        result = await db.execute(select(SystemConfiguration))
        configs = result.scalars().all()
        return {c.key: decrypt_token(c.value) for c in configs}
