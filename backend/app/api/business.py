from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from datetime import datetime, timedelta

from app.core.database import get_db
from app.core.config import settings
from app.models.user import User
from app.models.business import BusinessProfile, Agent, VerticalType
from app.schemas.business import (
    BusinessProfileCreate,
    BusinessProfileUpdate,
    BusinessProfileResponse,
    AgentUpdate,
    AgentResponse
)

from app.schemas.crm import AppointmentResponse
from app.api.auth import get_current_user
from app.core.limiter import limiter

DEFAULT_FEATURES_CONFIG = {
    "scheduling": {"enabled": True},
    "business_identity": {"enabled": True},
    "crm_suite": {"enabled": True},
    "campaign_flow": {"enabled": False},
    "b2b_solutions": {"enabled": False},
    "sales_intelligence": {"enabled": False}
}

def get_default_routing_config(vertical_type: str) -> dict:
    if vertical_type == "TRADE":
        return {
            "prospective_clients": {"enabled": True},
            "distributors_retailers": {"enabled": True},
            "sales_reps": {"enabled": True}
        }
    else:
        return {
            "prospective_clients": {"enabled": False},
            "distributors_retailers": {"enabled": False},
            "sales_reps": {"enabled": True}
        }

def get_default_features_config(vertical_type: str) -> dict:
    if vertical_type == "TRADE":
        return {
            "scheduling": {"enabled": True},
            "business_identity": {"enabled": True},
            "crm_suite": {"enabled": True},
            "campaign_flow": {"enabled": True},
            "b2b_solutions": {"enabled": True},
            "sales_intelligence": {"enabled": True}
        }
    else:
        return {
            "scheduling": {"enabled": True},
            "business_identity": {"enabled": True},
            "crm_suite": {"enabled": True},
            "campaign_flow": {"enabled": False},
            "b2b_solutions": {"enabled": False},
            "sales_intelligence": {"enabled": False}
        }

router = APIRouter()

async def get_full_business(db: AsyncSession, user_id: str) -> BusinessProfile:
    """Helper to fetch a business by user_id with all relationships eagerly loaded."""
    result = await db.execute(
        select(BusinessProfile)
        .where(BusinessProfile.user_id == user_id)
        .options(
            selectinload(BusinessProfile.agents),
            selectinload(BusinessProfile.integrations)
        )

    )
    return result.scalars().first()

from pydantic import BaseModel
from app.core.ai_service import AIService

class TestChatRequest(BaseModel):
    message: str
    assistant_config: Optional[AgentUpdate] = None
    simulate_role: Optional[str] = "sales_rep"  # "prospective_client", "distributor_retailer", "sales_rep"

from sqlalchemy import func
from app.models.crm import Client, Appointment

@router.get("/stats")
async def get_business_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    business = await get_full_business(db, current_user.id)
    if not business:
        raise HTTPException(status_code=404, detail="Business profile not found")
    
    print(f"DEBUG STATS: Fetching for business {business.id} ({business.name})")
    
    # 1. Total Clients
    client_count_res = await db.execute(
        select(func.count(Client.id)).where(Client.business_id == business.id)
    )
    total_clients = client_count_res.scalar() or 0
    print(f"DEBUG STATS: total_clients={total_clients}")
    
    # 2. Total Appointments (All time)
    apt_count_res = await db.execute(
        select(func.count(Appointment.id)).where(Appointment.business_id == business.id)
    )
    total_appointments = apt_count_res.scalar() or 0
    print(f"DEBUG STATS: total_appointments={total_appointments}")
    
    # 3. Flagged Clients (Action Required)
    # Use a safer check for JSONB
    flagged_count_res = await db.execute(
        select(func.count(Client.id)).where(
            Client.business_id == business.id,
            func.coalesce(func.json_extract_path_text(Client.custom_fields, 'needs_review'), 'false') == 'true'
        )
    )
    flagged_clients = flagged_count_res.scalar() or 0
    print(f"DEBUG STATS: flagged_clients={flagged_clients}")
    
    # 4. Today's Appointments
    from zoneinfo import ZoneInfo
    from datetime import timezone
    biz_tz = ZoneInfo(business.timezone or "UTC")
    now_local = datetime.now(biz_tz)
    today_start_local = now_local.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end_local = today_start_local + timedelta(days=1)
    
    # Convert local boundaries back to UTC for DB query
    today_start = today_start_local.astimezone(timezone.utc).replace(tzinfo=None)
    today_end = today_end_local.astimezone(timezone.utc).replace(tzinfo=None)
    
    today_count_res = await db.execute(
        select(func.count(Appointment.id)).where(
            Appointment.business_id == business.id,
            Appointment.start_time >= today_start,
            Appointment.start_time < today_end,
            Appointment.status != "cancelled"
        )
    )
    today_appointments = today_count_res.scalar() or 0
    print(f"DEBUG STATS: today_appointments={today_appointments} (Local Range: {today_start_local} to {today_end_local})")
    
    # 5. Upcoming & Recent (Focus on the last 24h + future)
    yesterday = (now_local - timedelta(days=1)).astimezone(timezone.utc).replace(tzinfo=None)
    upcoming_res = await db.execute(
        select(Appointment)
        .where(
            Appointment.business_id == business.id,
            Appointment.start_time >= yesterday,
            Appointment.status != "cancelled"
        )
        .options(selectinload(Appointment.client), selectinload(Appointment.service))
        .order_by(Appointment.start_time)
        .limit(10)
    )
    upcoming = upcoming_res.scalars().all()
    print(f"DEBUG STATS: upcoming_count={len(upcoming)}")
    
    # 6. Serialize for response
    serialized_upcoming = [AppointmentResponse.from_orm(a) for a in upcoming]
    
    return {
        "total_clients": total_clients,
        "total_appointments": total_appointments,
        "flagged_clients": flagged_clients,
        "today_appointments": today_appointments,
        "upcoming": serialized_upcoming,
        "business_name": business.name
    }

@router.post("/test-chat")
@limiter.limit("10/minute")
async def test_chat(
    request: Request,
    payload: TestChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    business = await get_full_business(db, current_user.id)
    if not business:
        raise HTTPException(status_code=404, detail="Business profile not found")
    
    # If the user is previewing new config, temporarily override it
    if payload.assistant_config:
        if not business.assistant_config:
            # Create a temporary agent if none exists
            from app.models.business import Agent
            temp_agent = Agent(business_id=business.id, role="general")
            # We don't add it to DB, just use it for the session
            business.agents.append(temp_agent)
            
        for field, value in payload.assistant_config.dict(exclude_unset=True).items():
            setattr(business.assistant_config, field, value)
            
    # 1. Check if the simulated flow is enabled in company's features and routing configurations
    simulate_role = payload.simulate_role or "sales_rep"
    
    from app.models.business import VerticalType
    if business.vertical_type == VerticalType.BASIC:
        simulate_role = "customer"
    
    # Check feature flag entitlement first
    feat_cfg = business.features_config or DEFAULT_FEATURES_CONFIG
    feature_enabled = True
    if simulate_role == "customer":
        feature_enabled = feat_cfg.get("scheduling", {}).get("enabled", True)
    elif simulate_role == "prospective_client":
        feature_enabled = feat_cfg.get("campaign_flow", {}).get("enabled", False)
    elif simulate_role == "distributor_retailer":
        feature_enabled = feat_cfg.get("b2b_solutions", {}).get("enabled", False)
    elif simulate_role == "sales_rep":
        feature_enabled = feat_cfg.get("crm_suite", {}).get("enabled", True)

    cfg = business.routing_config or {}
    flow_enabled = False
    if simulate_role == "customer":
        flow_enabled = cfg.get("prospective_clients", {}).get("enabled", True)
    elif simulate_role == "prospective_client":
        flow_enabled = cfg.get("prospective_clients", {}).get("enabled", False)
    elif simulate_role == "distributor_retailer":
        flow_enabled = cfg.get("distributors_retailers", {}).get("enabled", False)
    elif simulate_role == "sales_rep":
        flow_enabled = cfg.get("sales_reps", {}).get("enabled", True)
        
    if not feature_enabled or not flow_enabled:
        return {"response": "Este servicio no está habilitado actualmente para este número en la configuración de la empresa."}

    # 2. Dispatch to the correct underlying message pipeline
    if simulate_role == "customer":
        ai_service = AIService(business, db)
        test_id = f"sandbox_cust_{current_user.id}"
        response = await ai_service.get_response(
            identifier=test_id,
            user_message=payload.message,
            metadata={
                "name": "B2C Customer Test",
                "platform": "sandbox",
                "flow": "customer"
            }
        )
    elif simulate_role == "prospective_client":
        from app.services.prospect_qualifier import ProspectQualifier
        qualifier = ProspectQualifier(db)
        test_phone = f"sandbox_prosp_{current_user.id}"
        response, _ = await qualifier.get_response(
            business_id=business.id,
            sender_phone=test_phone,
            user_message=payload.message
        )
    elif simulate_role == "distributor_retailer":
        from sqlalchemy.orm import selectinload
        cli_res = await db.execute(
            select(Client)
            .where(Client.business_id == business.id)
            .options(selectinload(Client.stores))
        )
        clients = cli_res.scalars().all()
        # Find first client linked to physical stores
        distributor = next((c for c in clients if c.stores), None)
        client_id = distributor.id if distributor else None
        
        ai_service = AIService(business, db)
        test_id = f"sandbox_dist_{current_user.id}"
        response = await ai_service.get_response(
            identifier=test_id,
            user_message=payload.message,
            metadata={
                "name": distributor.name if distributor else "Distribuidor Test",
                "platform": "sandbox",
                "flow": "distributor",
                "client_id": client_id
            }
        )
    else: # sales_rep
        ai_service = AIService(business, db)
        test_id = f"sandbox_rep_{current_user.id}"
        response = await ai_service.get_response(
            identifier=test_id,
            user_message=payload.message,
            metadata={
                "name": current_user.email,
                "platform": "sandbox",
                "flow": "sales_rep"
            }
        )
    
    return {"response": response}

@router.get("/me", response_model=BusinessProfileResponse)
async def get_business_me(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    business = await get_full_business(db, current_user.id)
    if not business:
        raise HTTPException(status_code=404, detail="Business profile not found")
    return business

@router.post("/me", response_model=BusinessProfileResponse)
async def create_business_me(
    business_in: BusinessProfileCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    try:
        # Check if exists
        result = await db.execute(
            select(BusinessProfile).where(BusinessProfile.user_id == current_user.id)
        )
        business = result.scalars().first()
        
        if not business:
            v_type = business_in.vertical_type or VerticalType.BASIC
            business = BusinessProfile(
                user_id=current_user.id,
                name=business_in.name,
                category=business_in.category,
                contact_phone=business_in.contact_phone,
                vertical_type=v_type,
                routing_config=business_in.routing_config or get_default_routing_config(v_type),
                features_config=business_in.features_config or get_default_features_config(v_type)
            )
            db.add(business)
            await db.flush() # Get the ID without committing yet
            
            # Auto-create default agent
            agent = Agent(business_id=business.id)
            db.add(agent)
        else:
            business.name = business_in.name
            business.category = business_in.category
            business.contact_phone = business_in.contact_phone
            db.add(business)

        await db.commit()
        # Return fully loaded business
        return await get_full_business(db, current_user.id)
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/me/activate-trial", response_model=BusinessProfileResponse)
async def activate_trial(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    result = await db.execute(
        select(BusinessProfile).where(BusinessProfile.user_id == current_user.id)
    )
    business = result.scalars().first()
    if not business:
        raise HTTPException(status_code=404, detail="Business profile not found")
    
    business.trial_expires_at = datetime.utcnow() + timedelta(days=30)
    business.is_active = True
    
    db.add(business)
    await db.commit()
    return await get_full_business(db, current_user.id)

@router.patch("/me", response_model=BusinessProfileResponse)
async def update_business_me(
    business_in: BusinessProfileUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    # Use the helper to get the business with all relations
    business = await get_full_business(db, current_user.id)
    
    if not business:
        # Auto-create if it doesn't exist (robust for admins/legacy)
        print(f"DEBUG: Business not found for user {current_user.id}, creating new profile.")
        v_type = business_in.vertical_type or VerticalType.BASIC
        business = BusinessProfile(
            user_id=current_user.id,
            name=business_in.name or "My Business",
            category=business_in.category,
            contact_phone=business_in.contact_phone,
            timezone=business_in.timezone or "UTC",
            crm_config=business_in.crm_config or [],
            vertical_type=v_type,
            routing_config=business_in.routing_config or get_default_routing_config(v_type),
            features_config=business_in.features_config or get_default_features_config(v_type)
        )
        db.add(business)
        await db.flush()
        
        # Also auto-create the default agent
        agent = Agent(business_id=business.id)
        db.add(agent)
    else:
        # Standard update
        update_data = business_in.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(business, field, value)
        db.add(business)
    
    try:
        await db.commit()
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
        
    return await get_full_business(db, current_user.id)

@router.patch("/me/assistant", response_model=AgentResponse)
async def update_assistant_me(
    agent_in: AgentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    # Need to load agents to update the default one
    result = await db.execute(
        select(BusinessProfile)
        .where(BusinessProfile.user_id == current_user.id)
        .options(selectinload(BusinessProfile.agents))
    )
    business = result.scalars().first()
    if not business:
        raise HTTPException(status_code=404, detail="Business profile not found")
    
    if not business.assistant_config:
        agent = Agent(business_id=business.id)
        db.add(agent)
        await db.flush()
        await db.refresh(business, attribute_names=["agents"])
    
    update_data = agent_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(business.assistant_config, field, value)
    
    db.add(business.assistant_config)
    await db.commit()
    return business.assistant_config
