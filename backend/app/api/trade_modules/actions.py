"""
Store Actions & Objectives CRUD sub-router.
"""
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload, joinedload

from app.core.database import get_db
from app.api.auth import get_current_user, require_feature, require_any_feature
from app.models.user import User
from app.models.business import BusinessProfile
from app.models.trade import Store, Competitor, ActionTemplate, StoreAction, StoreActionObjective, ActionCategory, ActionStatus
from app.schemas.trade import (
    CompetitorResponse, CompetitorCreate,
    ActionTemplateCreate, ActionTemplateResponse, ActionTemplateUpdate,
    StoreActionCreate, StoreActionResponse, StoreActionUpdate,
    StoreActionObjectiveCreate, StoreActionObjectiveResponse
)

router = APIRouter()

async def get_business(db: AsyncSession, user_id: str) -> BusinessProfile:
    result = await db.execute(select(BusinessProfile).where(BusinessProfile.user_id == user_id))
    business = result.scalars().first()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    return business

@router.get("/objectives", response_model=List[StoreActionObjectiveResponse], dependencies=[Depends(require_feature("b2b_solutions"))])
async def list_objectives(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """List all dynamic action objectives for the business."""
    business = await get_business(db, current_user.id)
    result = await db.execute(
        select(StoreActionObjective)
        .where(StoreActionObjective.business_id == business.id)
        .order_by(StoreActionObjective.created_at.desc())
    )
    return result.scalars().all()

list_store_action_objectives = list_objectives

@router.post("/objectives", response_model=StoreActionObjectiveResponse, dependencies=[Depends(require_feature("b2b_solutions"))])
async def create_objective(
    obj_in: StoreActionObjectiveCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Create a new custom action objective."""
    business = await get_business(db, current_user.id)
    res_exist = await db.execute(
        select(StoreActionObjective)
        .where(StoreActionObjective.business_id == business.id, StoreActionObjective.name == obj_in.name)
    )
    if res_exist.scalars().first():
        raise HTTPException(status_code=400, detail=f"Objective '{obj_in.name}' already exists")
        
    obj = StoreActionObjective(
        business_id=business.id,
        **obj_in.model_dump()
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj

create_store_action_objective = create_objective

@router.delete("/objectives/{obj_id}", dependencies=[Depends(require_feature("b2b_solutions"))])
async def delete_objective(
    obj_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Delete a custom action objective."""
    business = await get_business(db, current_user.id)
    result = await db.execute(
        select(StoreActionObjective)
        .where(StoreActionObjective.id == obj_id, StoreActionObjective.business_id == business.id)
    )
    obj = result.scalars().first()
    if not obj:
        raise HTTPException(status_code=404, detail="Objective not found")
        
    await db.delete(obj)
    await db.commit()
    return {"status": "success", "message": "Objective deleted"}

@router.get("/action-templates", response_model=List[ActionTemplateResponse], dependencies=[Depends(require_feature("b2b_solutions"))])
async def list_action_templates(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """List action templates."""
    business = await get_business(db, current_user.id)
    result = await db.execute(
        select(ActionTemplate)
        .where(ActionTemplate.business_id == business.id)
        .order_by(ActionTemplate.created_at.desc())
    )
    return result.scalars().all()

@router.post("/action-templates", response_model=ActionTemplateResponse, dependencies=[Depends(require_feature("b2b_solutions"))])
async def create_action_template(
    template_in: ActionTemplateCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Create a new action template."""
    business = await get_business(db, current_user.id)
    template = ActionTemplate(**template_in.model_dump(), business_id=business.id)
    db.add(template)
    await db.commit()
    await db.refresh(template)
    return template

@router.get("/actions", response_model=List[StoreActionResponse], dependencies=[Depends(require_feature("b2b_solutions"))])
async def list_store_actions(
    store_id: Optional[str] = None,
    category: Optional[ActionCategory] = None,
    status_val: Optional[ActionStatus] = Query(default=None, alias="status"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """List store actions."""
    business = await get_business(db, current_user.id)
    query = select(StoreAction).where(StoreAction.business_id == business.id)
    if store_id:
        query = query.where(StoreAction.store_id == store_id)
    if category:
        query = query.where(StoreAction.category == category)
    if status_val:
        query = query.where(StoreAction.status == status_val)
        
    result = await db.execute(
        query.options(
            joinedload(StoreAction.store),
            joinedload(StoreAction.assigned_to),
            joinedload(StoreAction.template)
        ).order_by(StoreAction.created_at.desc())
    )
    actions = result.scalars().all()
    for act in actions:
        act.store_name = act.store.name if act.store else None
        act.assigned_to_name = act.assigned_to.name if act.assigned_to else None
        act.template_name = act.template.name if act.template else None
    return actions

@router.post("/actions", response_model=StoreActionResponse, dependencies=[Depends(require_feature("b2b_solutions"))])
async def create_store_action(
    action_in: StoreActionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Create a store action with full validation."""
    business = await get_business(db, current_user.id)
    
    # Verify target store exists & belongs to business
    res_store = await db.execute(
        select(Store).where(Store.id == action_in.store_id, Store.business_id == business.id)
    )
    store = res_store.scalars().first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
        
    action_data = action_in.model_dump()
    
    # Sanitize empty-string FK fields sent by frontend
    for fk_field in ("assigned_to_id", "template_id", "note_source_id"):
        if fk_field in action_data and action_data[fk_field] == "":
            action_data[fk_field] = None

    # Auto-assign fields from template if template_id is provided
    if action_data.get("template_id"):
        res_tpl = await db.execute(
            select(ActionTemplate)
            .where(ActionTemplate.id == action_data["template_id"], ActionTemplate.business_id == business.id)
        )
        template = res_tpl.scalars().first()
        if not template:
            raise HTTPException(status_code=400, detail="Invalid template ID")
        
        action_data["category"] = template.category
        if template.objective:
            action_data["objective"] = template.objective
        action_data["result_unit"] = template.default_unit
        
        details = action_data.get("details") or {}
        details["title"] = template.name
        details["description"] = template.description or ""
        action_data["details"] = details
        
    # Verify objective is valid for this business and matches the specified category
    res_obj = await db.execute(
        select(StoreActionObjective).where(
            StoreActionObjective.business_id == business.id,
            StoreActionObjective.name == action_data["objective"],
            StoreActionObjective.category == action_data["category"]
        )
    )
    if not res_obj.scalars().first():
        raise HTTPException(
            status_code=400,
            detail=f"Invalid objective '{action_data['objective']}' for category '{action_data['category']}'"
        )
        
    # Validate SHARE_OF_SHELF percentage goals
    if action_data["objective"] == "SHARE_OF_SHELF" and action_data.get("details"):
        target_val = action_data["details"].get("target_value")
        if target_val is not None:
            try:
                val_float = float(target_val)
                if val_float < 1.0 or val_float > 100.0:
                    raise HTTPException(status_code=400, detail="Goal percentage must be between 1 and 100")
            except (ValueError, TypeError):
                raise HTTPException(status_code=400, detail="Invalid metric goal value")
            
    # Strip timezone info from datetime fields to prevent asyncpg DataError
    if action_data.get("due_date") and action_data["due_date"].tzinfo:
        action_data["due_date"] = action_data["due_date"].replace(tzinfo=None)
            
    action = StoreAction(
        business_id=business.id,
        author_id=current_user.id,
        **action_data
    )
    
    db.add(action)
    await db.commit()
    
    # Reload enriched action
    result = await db.execute(
        select(StoreAction)
        .where(StoreAction.id == action.id)
        .options(
            joinedload(StoreAction.store),
            joinedload(StoreAction.assigned_to),
            joinedload(StoreAction.template)
        )
    )
    enriched = result.scalars().first()
    enriched.store_name = enriched.store.name if enriched.store else None
    enriched.assigned_to_name = enriched.assigned_to.name if enriched.assigned_to else None
    enriched.template_name = enriched.template.name if enriched.template else None
    return enriched

@router.patch("/actions/{action_id}", response_model=StoreActionResponse, dependencies=[Depends(require_feature("b2b_solutions"))])
async def update_store_action(
    action_id: str,
    action_in: StoreActionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Update a store action, with strict validation on completion."""
    business = await get_business(db, current_user.id)
    result = await db.execute(
        select(StoreAction)
        .where(StoreAction.id == action_id, StoreAction.business_id == business.id)
        .options(
            joinedload(StoreAction.store),
            joinedload(StoreAction.assigned_to),
            joinedload(StoreAction.template)
        )
    )
    action = result.scalars().first()
    if not action:
        raise HTTPException(status_code=404, detail="Action not found")
        
    update_data = action_in.model_dump(exclude_unset=True)
    
    if update_data.get("status") == ActionStatus.COMPLETED:
        res_val = update_data.get("result_value", action.result_value)
        if res_val is None:
            raise HTTPException(status_code=400, detail="Must record result_value before completing an action")
        if not update_data.get("resolved_at") and not action.resolved_at:
            update_data["resolved_at"] = datetime.utcnow()

    for field, value in update_data.items():
        setattr(action, field, value)

    db.add(action)
    await db.commit()
    await db.refresh(action)

    action.store_name = action.store.name if action.store else None
    action.assigned_to_name = action.assigned_to.name if action.assigned_to else None
    action.template_name = action.template.name if action.template else None
    return action

@router.delete("/actions/{action_id}", dependencies=[Depends(require_feature("b2b_solutions"))])
async def delete_store_action(
    action_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Delete a store action."""
    business = await get_business(db, current_user.id)
    result = await db.execute(
        select(StoreAction)
        .where(StoreAction.id == action_id, StoreAction.business_id == business.id)
    )
    action = result.scalars().first()
    if not action:
        raise HTTPException(status_code=404, detail="Action not found")
        
    await db.delete(action)
    await db.commit()
    return {"status": "success", "message": "Action deleted"}

@router.get("/competitors", response_model=List[CompetitorResponse], dependencies=[Depends(require_feature("sales_intelligence"))])
async def list_competitors(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """List competitors."""
    business = await get_business(db, current_user.id)
    res_comp = await db.execute(
        select(Competitor).where(Competitor.business_id == business.id).order_by(Competitor.name)
    )
    return res_comp.scalars().all()

@router.post("/competitors", response_model=CompetitorResponse, dependencies=[Depends(require_feature("sales_intelligence"))])
async def create_competitor(
    competitor_in: CompetitorCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Create a competitor entry."""
    business = await get_business(db, current_user.id)
    competitor = Competitor(**competitor_in.model_dump(), business_id=business.id)
    db.add(competitor)
    await db.commit()
    await db.refresh(competitor)

    sync_vector_task.delay(competitor.id, "competitor", business.id)
    return competitor

from app.tasks.knowledge import sync_vector_task
