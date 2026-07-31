from typing import Any, List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import joinedload

from app.core.database import get_db
from app.api.auth import get_current_user, require_feature
from app.models.user import User
from app.models.trade import Store, ActionTemplate, StoreAction, StoreActionObjective
from app.schemas.trade import (
    ActionTemplateCreate, ActionTemplateResponse, ActionTemplateUpdate,
    StoreActionCreate, StoreActionResponse, StoreActionUpdate,
    StoreActionObjectiveCreate, StoreActionObjectiveResponse
)

router = APIRouter()

# ==========================================
# --- ACTION TEMPLATE CATALOG ENDPOINTS ---
# ==========================================

@router.get("/action-templates", response_model=List[ActionTemplateResponse], dependencies=[Depends(require_feature("b2b_solutions"))])
async def list_action_templates(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """List all action templates for the business."""
    import app.api.trade as trade
    business = await trade.get_business(db, current_user.id)
    result = await db.execute(
        select(ActionTemplate)
        .where(ActionTemplate.business_id == business.id)
        .order_by(ActionTemplate.name.asc())
    )
    return result.scalars().all()

@router.post("/action-templates", response_model=ActionTemplateResponse, dependencies=[Depends(require_feature("b2b_solutions"))])
async def create_action_template(
    template_in: ActionTemplateCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Create a new action template."""
    import app.api.trade as trade
    business = await trade.get_business(db, current_user.id)
    
    # Verify objective matches category if specified
    if template_in.objective:
        res_obj = await db.execute(
            select(StoreActionObjective).where(
                StoreActionObjective.business_id == business.id,
                StoreActionObjective.name == template_in.objective,
                StoreActionObjective.category == template_in.category
            )
        )
        if not res_obj.scalars().first():
            raise HTTPException(
                status_code=400,
                detail=f"Invalid objective '{template_in.objective}' for category '{template_in.category}'"
            )
            
    template = ActionTemplate(
        business_id=business.id,
        **template_in.model_dump()
    )
    db.add(template)
    await db.commit()
    await db.refresh(template)
    return template

@router.patch("/action-templates/{template_id}", response_model=ActionTemplateResponse, dependencies=[Depends(require_feature("b2b_solutions"))])
async def update_action_template(
    template_id: str,
    template_in: ActionTemplateUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Update an action template."""
    import app.api.trade as trade
    business = await trade.get_business(db, current_user.id)
    result = await db.execute(
        select(ActionTemplate)
        .where(ActionTemplate.id == template_id, ActionTemplate.business_id == business.id)
    )
    template = result.scalars().first()
    if not template:
        raise HTTPException(status_code=404, detail="Action template not found")
        
    update_data = template_in.model_dump(exclude_unset=True)
    
    # Verify objective/category match if updated
    if "objective" in update_data or "category" in update_data:
        val_objective = update_data.get("objective") or template.objective
        val_category = update_data.get("category") or template.category
        if val_objective:
            res_obj = await db.execute(
                select(StoreActionObjective).where(
                    StoreActionObjective.business_id == business.id,
                    StoreActionObjective.name == val_objective,
                    StoreActionObjective.category == val_category
                )
            )
            if not res_obj.scalars().first():
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid objective '{val_objective}' for category '{val_category}'"
                )
                
    for field, value in update_data.items():
        setattr(template, field, value)
        
    await db.commit()
    await db.refresh(template)
    return template

@router.delete("/action-templates/{template_id}", dependencies=[Depends(require_feature("b2b_solutions"))])
async def delete_action_template(
    template_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Delete an action template."""
    import app.api.trade as trade
    business = await trade.get_business(db, current_user.id)
    result = await db.execute(
        select(ActionTemplate)
        .where(ActionTemplate.id == template_id, ActionTemplate.business_id == business.id)
    )
    template = result.scalars().first()
    if not template:
        raise HTTPException(status_code=404, detail="Action template not found")
        
    await db.delete(template)
    await db.commit()
    return {"status": "success", "message": "Action template deleted"}


# ==========================================
# --- STORE ACTIONS (STRATEGY DESK) ---
# ==========================================

@router.get("/actions", response_model=List[StoreActionResponse], dependencies=[Depends(require_feature("b2b_solutions"))])
async def list_store_actions(
    store_id: Optional[str] = None,
    assigned_to_id: Optional[str] = None,
    status: Optional[str] = None,
    category: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """List store actions for the current business with filters."""
    import app.api.trade as trade
    business = await trade.get_business(db, current_user.id)
    
    query = select(StoreAction).where(StoreAction.business_id == business.id)
    
    if store_id:
        query = query.where(StoreAction.store_id == store_id)
    if assigned_to_id:
        query = query.where(StoreAction.assigned_to_id == assigned_to_id)
    if status:
        query = query.where(StoreAction.status == status)
    if category:
        query = query.where(StoreAction.category == category)
        
    query = query.options(
        joinedload(StoreAction.store),
        joinedload(StoreAction.assigned_to),
        joinedload(StoreAction.template)
    ).order_by(StoreAction.created_at.desc()).offset(offset).limit(limit)
    
    res = await db.execute(query)
    actions = res.scalars().all()
    
    # Enrich response properties to eliminate client-side N+1 loops
    for action in actions:
        action.store_name = action.store.name if action.store else None
        action.assigned_to_name = action.assigned_to.name if action.assigned_to else None
        action.template_name = action.template.name if action.template else None
        
    return actions

@router.get("/actions/{action_id}", response_model=StoreActionResponse, dependencies=[Depends(require_feature("b2b_solutions"))])
async def get_store_action(
    action_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Retrieve a single store action."""
    import app.api.trade as trade
    business = await trade.get_business(db, current_user.id)
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
        
    action.store_name = action.store.name if action.store else None
    action.assigned_to_name = action.assigned_to.name if action.assigned_to else None
    action.template_name = action.template.name if action.template else None
    return action

@router.post("/actions", response_model=StoreActionResponse, dependencies=[Depends(require_feature("b2b_solutions"))])
async def create_store_action(
    action_in: StoreActionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Create a manual store action."""
    import app.api.trade as trade
    business = await trade.get_business(db, current_user.id)
    
    # Verify store belongs to this business
    res_store = await db.execute(select(Store).where(Store.id == action_in.store_id, Store.business_id == business.id))
    store = res_store.scalars().first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
        
    action_data = action_in.model_dump()
    
    # Sanitize empty-string FK fields sent by the frontend (dropdowns default to '')
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
        
        # Override properties from template blueprint
        action_data["category"] = template.category
        if template.objective:
            action_data["objective"] = template.objective
        action_data["result_unit"] = template.default_unit
        
        # Merge template's name & description into details JSONB
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
    from app.models.trade import ActionStatus
    import app.api.trade as trade
    
    business = await trade.get_business(db, current_user.id)
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
    
    # Verify objective and category alignment if updated
    if "objective" in update_data or "category" in update_data:
        val_objective = update_data.get("objective") or action.objective
        val_category = update_data.get("category") or action.category
        
        res_obj = await db.execute(
            select(StoreActionObjective).where(
                StoreActionObjective.business_id == business.id,
                StoreActionObjective.name == val_objective,
                StoreActionObjective.category == val_category
            )
        )
        if not res_obj.scalars().first():
            raise HTTPException(
                status_code=400,
                detail=f"Invalid objective '{val_objective}' for category '{val_category}'"
            )
            
    # Strip timezone info from datetime fields to prevent asyncpg DataError
    if update_data.get("due_date") and update_data["due_date"].tzinfo:
        update_data["due_date"] = update_data["due_date"].replace(tzinfo=None)
    
    # STRICT VALIDATION: Require result_value and resolution_notes to mark COMPLETED
    new_status = update_data.get("status")
    if new_status == ActionStatus.COMPLETED or (action.status == ActionStatus.COMPLETED and new_status is None):
        val = update_data.get("result_value") if "result_value" in update_data else action.result_value
        notes = update_data.get("resolution_notes") if "resolution_notes" in update_data else action.resolution_notes
        
        if val is None or not notes:
            raise HTTPException(
                status_code=400,
                detail="Strict Validation: A numeric result_value and resolution_notes are required to complete an action."
            )
        action.resolved_at = datetime.utcnow()
        
    for field, value in update_data.items():
        setattr(action, field, value)
        
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
    import app.api.trade as trade
    business = await trade.get_business(db, current_user.id)
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

@router.get("/objectives", response_model=List[StoreActionObjectiveResponse], dependencies=[Depends(require_feature("b2b_solutions"))])
async def list_objectives(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """List all dynamic action objectives for the business."""
    import app.api.trade as trade
    business = await trade.get_business(db, current_user.id)
    result = await db.execute(
        select(StoreActionObjective)
        .where(StoreActionObjective.business_id == business.id)
        .order_by(StoreActionObjective.created_at.desc())
    )
    return result.scalars().all()

@router.post("/objectives", response_model=StoreActionObjectiveResponse, dependencies=[Depends(require_feature("b2b_solutions"))])
async def create_objective(
    obj_in: StoreActionObjectiveCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Create a new custom action objective."""
    import app.api.trade as trade
    business = await trade.get_business(db, current_user.id)
    
    # Check if objective with the same name already exists for this business
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

@router.delete("/objectives/{obj_id}", dependencies=[Depends(require_feature("b2b_solutions"))])
async def delete_objective(
    obj_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Delete a custom action objective."""
    import app.api.trade as trade
    business = await trade.get_business(db, current_user.id)
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
