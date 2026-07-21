import asyncio
from app.core.database import SessionLocal
from app.models.integration import Integration
from app.core.security import decrypt_token
from sqlalchemy import select

async def main():
    async with SessionLocal() as db:
        result = await db.execute(select(Integration).where(Integration.provider == 'telegram'))
        integrations = result.scalars().all()
        print(f"Total telegram integrations in DB: {len(integrations)}")
        for idx, integration in enumerate(integrations):
            try:
                decrypted_token = decrypt_token(integration.access_token)
                # Mask the token for safety but keep enough to compare
                masked = decrypted_token[:6] + "..." + decrypted_token[-6:] if len(decrypted_token) > 12 else "..."
            except Exception as e:
                masked = f"ERROR DECRYPTING: {e}"
            print(f"{idx+1}. ID: {integration.id}, Business ID: {integration.business_id}")
            print(f"   Settings: {integration.settings}")
            print(f"   Decrypted Bot Token (masked): {masked}")

if __name__ == "__main__":
    asyncio.run(main())
