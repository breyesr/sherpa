from fastapi import APIRouter
from app.api.auth import router as auth_router
from app.api.business import router as business_router
from app.api.integrations import router as integration_router
from app.api.crm import router as crm_router
from app.api.services import router as services_router
from app.api.inbox import router as inbox_router
from app.api.whatsapp import router as whatsapp_router
from app.api.telegram import router as telegram_router
from app.api.admin import router as admin_router

api_router = APIRouter()
api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
api_router.include_router(business_router, prefix="/business", tags=["business"])
api_router.include_router(integration_router, prefix="/integrations", tags=["integrations"])
api_router.include_router(crm_router, prefix="/crm", tags=["crm"])
api_router.include_router(services_router, prefix="/services", tags=["services"])
api_router.include_router(inbox_router, prefix="/inbox", tags=["inbox"])
api_router.include_router(whatsapp_router, prefix="/whatsapp", tags=["whatsapp"])
api_router.include_router(telegram_router, prefix="/telegram", tags=["telegram"])
api_router.include_router(admin_router, prefix="/admin", tags=["admin"])
