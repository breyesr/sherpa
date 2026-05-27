import instructor
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from jinja2 import Environment, FileSystemLoader, select_autoescape
import litellm
from app.core.system_config import ConfigService
from app.core.database import SessionLocal
from app.models.store import Store
from app.models.customer import Customer
from app.models.intelligence import StoreNote, Competitor
from app.core.embeddings import EmbeddingService
from sqlalchemy.future import select
from sqlalchemy import or_

# Setup prompt template environment
prompt_env = Environment(
    loader=FileSystemLoader("app/core/prompts"),
    autoescape=select_autoescape()
)

class CompetitorInfo(BaseModel):
    name: str = Field(..., description="Name of the competitor")
    strengths: Optional[str] = Field(None, description="Reported strengths")
    weaknesses: Optional[str] = Field(None, description="Reported weaknesses")

class ExtractionResult(BaseModel):
    store_name: Optional[str] = Field(None, description="Name of the store or account")
    contact_name: Optional[str] = Field(None, description="Name of the contact person")
    general_note: str = Field(..., description="Main takeaway of the visit")
    risks: Optional[str] = Field(None, description="Identified risks or threats")
    opportunities: Optional[str] = Field(None, description="Identified opportunities")
    preferred_actions: Optional[str] = Field(None, description="Suggested next steps")
    competitors: List[CompetitorInfo] = Field(default_factory=list)

class IngestionAgent:
    def __init__(self, db: Any):
        self.db = db
        self.embeddings = EmbeddingService(db)

    async def extract_intelligence(self, user_message: str) -> ExtractionResult:
        """Extract structured intelligence from unstructured text using Instructor."""
        try:
            template = prompt_env.get_template("ingestion_extractor.j2")
            system_prompt = template.render(user_message=user_message)

            provider = await ConfigService.get(self.db, "ACTIVE_AI_PROVIDER", "openai")
            default_model = "gpt-4o-mini"
            model = await ConfigService.get(self.db, f"{provider.upper()}_MODEL", default_model)
            api_key = await ConfigService.get(self.db, f"{provider.upper()}_API_KEY")

            # Initialize Instructor client
            client = instructor.patch(litellm.completion)

            result = await client.chat.completions.create(
                model=f"{provider}/{model}" if "/" not in model else model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message}
                ],
                response_model=ExtractionResult,
                api_key=api_key
            )
            return result
        except Exception as e:
            print(f"ERROR: IngestionAgent extraction failed: {e}")
            raise

    async def process_report(self, business_id: str, user_message: str) -> Dict[str, Any]:
        """The full ingestion pipeline: Extract -> Link -> Save."""
        # 1. Extraction
        extracted = await self.extract_intelligence(user_message)
        
        # 2. Entity Linking (Fuzzy match store)
        store_id = None
        if extracted.store_name:
            res = await self.db.execute(
                select(Store).where(
                    Store.business_id == business_id,
                    Store.name.ilike(f"%{extracted.store_name}%")
                )
            )
            store = res.scalars().first()
            if store:
                store_id = store.id

        # 3. Save to Database
        if store_id:
            # Generate Embedding for RAG
            vector = await self.embeddings.get_embedding(extracted.general_note)
            
            new_note = StoreNote(
                store_id=store_id,
                note=extracted.general_note,
                risks=extracted.risks,
                opportunities=extracted.opportunities,
                preferred_actions=extracted.preferred_actions,
                embedding=vector
            )
            self.db.add(new_note)
            
            # Save Competitors
            for comp in extracted.competitors:
                new_comp = Competitor(
                    store_id=store_id,
                    name=comp.name,
                    strengths=comp.strengths,
                    weaknesses=comp.weaknesses
                )
                self.db.add(new_comp)
            
            await self.db.commit()
            return {"status": "success", "store": extracted.store_name, "note_id": new_note.id}
        
        return {"status": "partial", "reason": "Store not found", "extracted": extracted.dict()}
