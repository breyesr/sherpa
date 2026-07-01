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
        
        sync_queue = []
        try:
            results = {"processed": 0, "created": 0, "updated": 0, "errors": 0, "details": []}
            
            if not os.path.exists(data_import.file_path):
                raise FileNotFoundError(f"File {data_import.file_path} missing")
                
            with open(data_import.file_path, mode='r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    try:
                        sync_item = await _process_row(db, data_import, row, results)
                        if sync_item:
                            sync_queue.append(sync_item)
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

        # Enqueue vector sync tasks after commit
        if data_import.status == ImportStatus.COMPLETED and sync_queue:
            from app.tasks.knowledge import sync_vector_task
            unique_syncs = list(set(sync_queue))
            for entity_id, entity_type in unique_syncs:
                sync_vector_task.delay(entity_id, entity_type, str(data_import.business_id))

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
            # Data Type Casting for numeric fields
            if model_field in ["price", "unit_price"]:
                try:
                    value = float(value)
                except ValueError:
                    value = 0.0
            elif model_field in ["quantity", "duration_minutes"]:
                try:
                    value = int(value)
                except ValueError:
                    value = 0
                    
            entity_data[model_field] = value
            
    if entity_type == "client":
        client = await _sync_client(db, data_import.business_id, entity_data, custom_fields, results)
        return (str(client.id), "client") if client else None
    elif entity_type == "store":
        store = await _sync_store(db, data_import.business_id, entity_data, results)
        return (str(store.id), "store") if store else None
    elif entity_type == "category":
        await _sync_category(db, data_import.business_id, entity_data, results)
        return None
    elif entity_type == "product":
        await _sync_product(db, data_import.business_id, entity_data, results)
        return None
    else:
        raise ValueError(f"Unsupported entity type: {entity_type}")

async def _sync_store(db: Any, business_id: str, data: Dict[str, Any], results: Dict[str, Any]):
    """Sync a single store record."""
    from app.models.trade import Store
    
    # Identify by external_id or name
    query = select(Store).where(Store.business_id == business_id)
    if "external_id" in data:
        query = query.where(Store.external_id == data["external_id"])
    else:
        query = query.where(Store.name == data["name"])
        
    res = await db.execute(query)
    store = res.scalars().first()
    
    if store:
        for k, v in data.items():
            setattr(store, k, v)
        results["updated"] += 1
    else:
        store = Store(business_id=business_id, **data)
        db.add(store)
        results["created"] += 1
    await db.flush()
    return store

async def _sync_category(db: Any, business_id: str, data: Dict[str, Any], results: Dict[str, Any]):
    """Sync a single category record."""
    from app.models.trade import Category
    
    res = await db.execute(select(Category).where(Category.business_id == business_id, Category.name == data["name"]))
    category = res.scalars().first()
    
    if category:
        for k, v in data.items():
            setattr(category, k, v)
        results["updated"] += 1
    else:
        category = Category(business_id=business_id, **data)
        db.add(category)
        results["created"] += 1

async def _sync_product(db: Any, business_id: str, data: Dict[str, Any], results: Dict[str, Any]):
    """Sync a single product record."""
    from app.models.trade import Product, Category
    
    if "category_name" in data:
        cat_name = data.pop("category_name")
        res_cat = await db.execute(select(Category).where(Category.business_id == business_id, Category.name == cat_name))
        cat = res_cat.scalars().first()
        if not cat:
            cat = Category(business_id=business_id, name=cat_name)
            db.add(cat)
            await db.flush()
        data["category_id"] = cat.id
    
    if "category_id" not in data:
        raise ValueError("Product missing category_id or category_name")

    # Identify by sku or name
    query = select(Product).where(Product.category_id == data["category_id"])
    if "sku" in data:
        query = query.where(Product.sku == data["sku"])
    else:
        query = query.where(Product.name == data["name"])
        
    res = await db.execute(query)
    product = res.scalars().first()
    
    if product:
        for k, v in data.items():
            setattr(product, k, v)
        results["updated"] += 1
    else:
        product = Product(**data)
        db.add(product)
        results["created"] += 1

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
    await db.flush()
    return client
