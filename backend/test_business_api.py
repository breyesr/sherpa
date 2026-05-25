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
                selectinload(BusinessProfile.agents),
                selectinload(BusinessProfile.integrations)
            )
        )
        business = result.scalars().first()
        
        if not business:
            print("No business found in DB.")
            return

        print(f"Business: {business.name} ({business.id})")
        print(f"Vertical Type: {business.vertical_type}")
        print(f"Integrations Count: {len(business.integrations)}")
        
        # Test Schema Serialization
        response = BusinessProfileResponse.model_validate(business)
        print("\nSerialized Response:")
        print(json.dumps(response.model_dump(), indent=2, default=str))
        
        # Assertion
        assert response.vertical_type == "BASIC", f"Expected BASIC, got {response.vertical_type}"
        print("\n✅ Verification Successful: vertical_type is correctly implemented and serialized.")

if __name__ == "__main__":
    asyncio.run(test_business_me())
