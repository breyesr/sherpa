import instructor
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from jinja2 import Environment, FileSystemLoader, select_autoescape
import litellm
from app.core.system_config import ConfigService
from app.models.trade import Store, StoreNote, Competitor, StoreAction, ActionCategory
from sqlalchemy.future import select
from sqlalchemy import or_
from app.tasks.knowledge import sync_vector_task, update_account_intelligence_task
import os

# Setup prompt template environment with absolute path for reliability
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROMPTS_DIR = os.path.join(BASE_DIR, "core", "prompts")

prompt_env = Environment(
    loader=FileSystemLoader(PROMPTS_DIR),
    autoescape=select_autoescape()
)

class CompetitorInfo(BaseModel):
    name: str = Field(..., description="Name of the competitor")
    strengths: Optional[str] = Field(None, description="Reported strengths")
    weaknesses: Optional[str] = Field(None, description="Reported weaknesses")
    region: Optional[str] = Field(None, description="Region of the competitor")
    market: Optional[str] = Field(None, description="Market type of the competitor")
    presence_level: Optional[str] = Field(None, description="Presence level (high, low, medium)")

class IngestionAgent:
    def __init__(self, db: Any):
        self.db = db

    async def extract_intelligence(self, business_id: str, user_message: str) -> Any:
        """Extract structured intelligence from unstructured text using Instructor with dynamic schemas."""
        try:
            # Query active objectives for the business
            from app.models.trade import StoreActionObjective
            res_objs = await self.db.execute(
                select(StoreActionObjective.name).where(StoreActionObjective.business_id == business_id)
            )
            objective_names = res_objs.scalars().all()
            if not objective_names:
                objective_names = [
                    "THREAT_RESPONSE",
                    "SHARE_OF_SHELF",
                    "NEW_PRODUCT_INTRODUCTION",
                    "INVENTORY_VELOCITY_OOS_PREVENTION",
                    "PERFECT_STORE_ASSORTMENT_COMPLIANCE",
                    "SEASONAL_EVENT_ACTIVATION",
                    "TRADE_LOYALTY_VOLUME_PUSHING",
                    "POSM_MAINTENANCE_ASSET_PURITY"
                ]
            
            # Create Literal type containing active objective names
            from typing import Literal
            ObjectiveType = Literal[tuple(objective_names)]
            
            from pydantic import create_model
            
            # 1. Dynamic ActionInfo
            DynamicActionInfo = create_model(
                'ActionInfo',
                category=(ActionCategory, Field(..., description="Category of the action: marketing or commercial")),
                objective=(ObjectiveType, Field(..., description=f"Strategic objective: {', '.join(objective_names)}")),
                impact=(str, Field(..., description="Anticipated impact level: high, medium, low")),
                details=(Dict[str, Any], Field(default_factory=dict, description="Structured payload"))
            )
            
            # 2. Dynamic ExtractionResult
            DynamicExtractionResult = create_model(
                'ExtractionResult',
                store_name=(Optional[str], Field(None, description="Name of the store or account")),
                store_region=(Optional[str], Field(None, description="Region of the store")),
                store_market=(Optional[str], Field(None, description="Market type of the store")),
                store_segment=(Optional[str], Field(None, description="Segment of the store")),
                contact_name=(Optional[str], Field(None, description="Name of the contact person")),
                contact_role=(Optional[str], Field(None, description="Job role of the contact")),
                general_note=(str, Field(..., description="Main takeaway of the visit")),
                risks=(Optional[str], Field(None, description="Identified risks or threats")),
                opportunities=(Optional[str], Field(None, description="Identified opportunities")),
                preferred_actions=(Optional[str], Field(None, description="Suggested next steps")),
                execution_level=(Optional[str], Field(None, description="Execution level (high, medium, low)")),
                competitors=(List[CompetitorInfo], Field(default_factory=list)),
                actions=(List[DynamicActionInfo], Field(default_factory=list, description="Structured actions extracted"))
            )

            template = prompt_env.get_template("ingestion_extractor.j2")
            system_prompt = template.render(user_message=user_message)

            provider = await ConfigService.get(self.db, "ACTIVE_AI_PROVIDER", "openai")
            default_model = "gpt-4o-mini"
            model = await ConfigService.get(self.db, f"{provider.upper()}_MODEL", default_model)
            api_key = await ConfigService.get(self.db, f"{provider.upper()}_API_KEY")

            # Initialize Instructor client
            client = instructor.from_litellm(litellm.acompletion)

            result = await client.chat.completions.create(
                model=f"{provider}/{model}" if "/" not in model else model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message}
                ],
                response_model=DynamicExtractionResult,
                api_key=api_key
            )
            return result
        except Exception as e:
            print(f"ERROR: IngestionAgent extraction failed: {e}")
            raise

    async def process_report(self, business_id: str, user_message: str) -> Dict[str, Any]:
        """The full ingestion pipeline: Extract -> Link -> Save -> Sync."""
        # 1. Extraction
        extracted = await self.extract_intelligence(business_id, user_message)
        
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
            
            # 4. Create Note
            new_note = StoreNote(
                store_id=store.id,
                note=extracted.general_note,
                risks=extracted.risks,
                opportunities=extracted.opportunities,
                preferred_actions=extracted.preferred_actions,
                execution_level=extracted.execution_level
            )
            self.db.add(new_note)
            await self.db.flush() # To get the note ID for sourcing
            
            # 5. Save Structured Actions (Task 108.2)
            for action_data in extracted.actions:
                new_action = StoreAction(
                    business_id=business_id,
                    store_id=store.id,
                    category=action_data.category,
                    objective=action_data.objective,
                    impact_level=action_data.impact,
                    details=action_data.details,
                    note_source_id=new_note.id
                )
                self.db.add(new_action)

            # 6. Save/Update Competitors
            competitor_ids = []
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
                    competitor_ids.append(existing_comp.id)
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
                    await self.db.flush() # To get the ID
                    competitor_ids.append(new_comp.id)
            
            await self.db.commit()

            # 7. ASYNC VECTORIZATION & INTELLIGENCE RE-SYNTHESIS
            # Emit tasks for background processing
            sync_vector_task.delay(store.id, "store", business_id)
            sync_vector_task.delay(new_note.id, "store_note", business_id)
            for c_id in competitor_ids:
                sync_vector_task.delay(c_id, "competitor", business_id)
            
            # Trigger Dossier Re-synthesis (Task 107.13)
            update_account_intelligence_task.delay(store.id, business_id)

            return {"status": "success", "store": store.name, "note_id": new_note.id}
        
        return {"status": "partial", "reason": "Store not found", "extracted": extracted.dict()}
