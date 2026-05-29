import instructor
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from jinja2 import Environment, FileSystemLoader, select_autoescape
import litellm
from app.core.system_config import ConfigService
from app.core.database import SessionLocal
from app.models.trade import Store, StoreNote, Competitor
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
    region: Optional[str] = Field(None, description="Region of the competitor")
    market: Optional[str] = Field(None, description="Market type of the competitor")
    presence_level: Optional[str] = Field(None, description="Presence level (high, low, medium)")

class ExtractionResult(BaseModel):
    store_name: Optional[str] = Field(None, description="Name of the store or account")
    store_region: Optional[str] = Field(None, description="Region of the store")
    store_market: Optional[str] = Field(None, description="Market type of the store")
    store_segment: Optional[str] = Field(None, description="Segment of the store")
    
    contact_name: Optional[str] = Field(None, description="Name of the contact person")
    contact_role: Optional[str] = Field(None, description="Job role of the contact")
    
    general_note: str = Field(..., description="Main takeaway of the visit")
    risks: Optional[str] = Field(None, description="Identified risks or threats")
    opportunities: Optional[str] = Field(None, description="Identified opportunities")
    preferred_actions: Optional[str] = Field(None, description="Suggested next steps")
    execution_level: Optional[str] = Field(None, description="Execution level (high, medium, low)")
    
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
        """The full ingestion pipeline: Extract -> Link -> Save -> Sync."""
        # 1. Extraction
        extracted = await self.extract_intelligence(user_message)
        
        # 2. Entity Linking (Fuzzy match store)
        store = None
        if extracted.store_name:
            res = await self.db.execute(
                select(Store).where(
                    Store.business_id == business_id,
                    Store.name.ilike(f"%{extracted.store_name}%")
                )
            )
            store = res.scalars().first()

        # 3. Save to Database
        if store:
            # Update Store Metadata if missing
            if extracted.store_region and not store.region: store.region = extracted.store_region
            if extracted.store_market and not store.market: store.market = extracted.store_market
            if extracted.store_segment and not store.segment: store.segment = extracted.store_segment
            
            # Generate Embedding for RAG
            vector = await self.embeddings.get_embedding(extracted.general_note)
            
            new_note = StoreNote(
                store_id=store.id,
                note=extracted.general_note,
                risks=extracted.risks,
                opportunities=extracted.opportunities,
                preferred_actions=extracted.preferred_actions,
                execution_level=extracted.execution_level,
                embedding=vector
            )
            self.db.add(new_note)
            
            # Save/Update Competitors
            for comp in extracted.competitors:
                # Fuzzy match existing competitor for this store
                comp_res = await self.db.execute(
                    select(Competitor).where(Competitor.store_id == store.id, Competitor.name.ilike(f"%{comp.name}%"))
                )
                existing_comp = comp_res.scalars().first()
                
                if existing_comp:
                    if comp.strengths: existing_comp.strengths = comp.strengths
                    if comp.weaknesses: existing_comp.weaknesses = comp.weaknesses
                    if comp.region: existing_comp.region = comp.region
                    if comp.market: existing_comp.market = comp.market
                    if comp.presence_level: existing_comp.presence_level = comp.presence_level
                else:
                    new_comp = Competitor(
                        business_id=business_id,
                        store_id=store.id,
                        name=comp.name,
                        strengths=comp.strengths,
                        weaknesses=comp.weaknesses,
                        region=comp.region,
                        market=comp.market,
                        presence_level=comp.presence_level
                    )
                    self.db.add(new_comp)
            
            await self.db.commit()
            return {"status": "success", "store": store.name, "note_id": new_note.id}
        
        return {"status": "partial", "reason": "Store not found", "extracted": extracted.dict()}
