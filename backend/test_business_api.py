import asyncio
import json
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.core.database import SessionLocal
from app.models.business import BusinessProfile
from app.schemas.business import BusinessProfileResponse

async def test_business_me():
    async with SessionLocal() as db:
        # Fetch any business to test
        result = await db.execute(
            select(BusinessProfile)
            .options(
                selectinload(BusinessProfile.assistant_config),
                selectinload(BusinessProfile.integrations)
            )
        )
        business = result.scalars().first()
        
        if not business:
            print("No business found in DB.")
            return

        print(f"Business: {business.name} ({business.id})")
        print(f"Integrations Count: {len(business.integrations)}")
        for i in business.integrations:
            print(f"  - Provider: {i.provider}, ID: {i.id}")

        # Test Schema Serialization
        response = BusinessProfileResponse.model_validate(business)
        print("\nSerialized Response:")
        print(json.dumps(response.model_dump(), indent=2, default=str))

if __name__ == "__main__":
    asyncio.run(test_business_me())
