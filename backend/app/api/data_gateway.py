from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import json
import os
import uuid
from datetime import datetime

from app.core.database import get_db
from app.api.auth import get_current_user
from app.models.user import User
from app.models.data_gateway import DataImport, ImportStatus
from app.schemas.data_gateway import DataImportResponse, DataGatewaySyncRequest

router = APIRouter()

UPLOAD_DIR = "uploads/imports"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.get("/me/imports", response_model=List[DataImportResponse])
async def get_my_imports(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """List all data imports for the current business."""
    from app.models.business import BusinessProfile
    
    # Get business ID
    res = await db.execute(select(BusinessProfile).where(BusinessProfile.user_id == current_user.id))
    business = res.scalars().first()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
        
    result = await db.execute(
        select(DataImport)
        .where(DataImport.business_id == business.id)
        .order_by(DataImport.created_at.desc())
    )
    return result.scalars().all()

@router.post("/me/imports", response_model=DataImportResponse)
async def create_data_import(
    entity_type: str = Form(...),
    mapping_json: str = Form(...),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Upload a file and initiate a background data import."""
    from app.models.business import BusinessProfile
    
    # Get business ID
    res = await db.execute(select(BusinessProfile).where(BusinessProfile.user_id == current_user.id))
    business = res.scalars().first()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
        
    try:
        mapping = json.loads(mapping_json)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid mapping JSON")
        
    # Save file locally
    file_ext = os.path.splitext(file.filename)[1]
    file_id = str(uuid.uuid4())
    file_path = os.path.join(UPLOAD_DIR, f"{file_id}{file_ext}")
    
    with open(file_path, "wb") as f:
        f.write(await file.read())
        
    # Create record
    data_import = DataImport(
        business_id=business.id,
        file_name=file.filename,
        file_path=file_path,
        entity_type=entity_type,
        mapping=mapping,
        status=ImportStatus.PENDING
    )
    
    db.add(data_import)
    await db.commit()
    await db.refresh(data_import)
    
    # Trigger Celery Task
    from app.tasks.data_gateway import process_data_import
    process_data_import.delay(data_import.id)
    
    return data_import

@router.post("/sync")
async def sync_data(
    request: DataGatewaySyncRequest,
    db: AsyncSession = Depends(get_db),
    # TODO: Add API Key or Internal Auth
) -> Any:
    """Real-time data ingestion endpoint."""
    # This will be implemented to handle single-record updates from external systems
    return {"status": "accepted", "message": "Real-time sync not yet implemented"}
