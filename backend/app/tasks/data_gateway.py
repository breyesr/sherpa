from app.core.celery_app import celery_app
from app.core.database import SessionLocal
from app.models.data_gateway import DataImport, ImportStatus
from app.models.crm import Client
from sqlalchemy.future import select
import csv
import os
import asyncio
from typing import Dict, Any

@celery_app.task(name="app.tasks.data_gateway.process_data_import")
def process_data_import(import_id: str):
    """Background task to process a CSV/XLSX data import."""
    # Run the async logic in a sync wrapper for Celery
    loop = asyncio.get_event_loop()
    return loop.run_until_complete(_process_data_import_async(import_id))

async def _process_data_import_async(import_id: str):
    async with SessionLocal() as db:
        data_import = await db.get(DataImport, import_id)
        if not data_import:
            return f"Import {import_id} not found"
            
        if data_import.status != ImportStatus.PENDING:
            return f"Import {import_id} is already in state {data_import.status}"
            
        data_import.status = ImportStatus.PROCESSING
        await db.commit()
        
        try:
            results = {"processed": 0, "created": 0, "updated": 0, "errors": 0, "details": []}
            
            if not os.path.exists(data_import.file_path):
                raise FileNotFoundError(f"File {data_import.file_path} missing")
                
            with open(data_import.file_path, mode='r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    try:
                        await _process_row(db, data_import, row, results)
                        results["processed"] += 1
                    except Exception as e:
                        results["errors"] += 1
                        results["details"].append({"row": results["processed"], "error": str(e)})
                        
            data_import.status = ImportStatus.COMPLETED
            data_import.results = results
            
        except Exception as e:
            data_import.status = ImportStatus.FAILED
            data_import.error_message = str(e)
            
        await db.commit()
        return f"Import {import_id} finished with status {data_import.status}"

async def _process_row(db: Any, data_import: DataImport, row: Dict[str, str], results: Dict[str, Any]):
    """Process a single row from the CSV based on mapping."""
    entity_type = data_import.entity_type
    mapping = data_import.mapping
    
    # Map row to entity data
    entity_data = {}
    custom_fields = {}
    
    for csv_header, model_field in mapping.items():
        if csv_header not in row:
            continue
            
        value = row[csv_header].strip()
        if not value:
            continue
            
        if model_field.startswith("custom_fields."):
            field_name = model_field.split(".")[1]
            custom_fields[field_name] = value
        else:
            entity_data[model_field] = value
            
    if entity_type == "client":
        await _sync_client(db, data_import.business_id, entity_data, custom_fields, results)
    else:
        raise ValueError(f"Unsupported entity type: {entity_type}")

async def _sync_client(db: Any, business_id: str, data: Dict[str, Any], custom_fields: Dict[str, Any], results: Dict[str, Any]):
    """Sync a single client record."""
    # Identify client by phone or email
    query = select(Client).where(Client.business_id == business_id)
    if "phone" in data:
        normalized_phone = Client.normalize_id(data["phone"])
        query = query.where(Client.phone == normalized_phone)
    elif "email" in data:
        query = query.where(Client.email == data["email"])
    else:
        # Create new if no identifier but name exists
        if "name" not in data:
            raise ValueError("Row missing identifier (phone/email) and name")
        client = None
    
    if "phone" in data or "email" in data:
        res = await db.execute(query)
        client = res.scalars().first()
    
    if client:
        # Update
        for k, v in data.items():
            setattr(client, k, v)
        if custom_fields:
            # Re-assign to trigger SQLAlchemy change detection
            current_custom = dict(client.custom_fields or {})
            current_custom.update(custom_fields)
            client.custom_fields = current_custom
        results["updated"] += 1
    else:
        # Create
        if "name" not in data:
            raise ValueError("New client missing name")
            
        client = Client(
            business_id=business_id,
            name=data.get("name"),
            phone=data.get("phone"),
            email=data.get("email"),
            custom_fields=custom_fields
        )
        db.add(client)
        results["created"] += 1
