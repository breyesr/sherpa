"""
Shared constants and default configuration objects across the Sherpa backend.
"""

# Default features configuration for business profiles
DEFAULT_FEATURES_CONFIG = {
    "scheduling": {"enabled": True},
    "business_identity": {"enabled": True},
    "crm_suite": {"enabled": True},
    "campaign_flow": {"enabled": False},
    "b2b_solutions": {"enabled": False},
    "sales_intelligence": {"enabled": False},
    "services": {"enabled": True},
    "products": {"enabled": False}
}

# The standard set of store action objectives for TRADE CRM flows
DEFAULT_STORE_ACTION_OBJECTIVES = [
    "THREAT_RESPONSE",
    "SHARE_OF_SHELF",
    "NEW_PRODUCT_INTRODUCTION",
    "INVENTORY_VELOCITY_OOS_PREVENTION",
    "PERFECT_STORE_ASSORTMENT_COMPLIANCE",
    "SEASONAL_EVENT_ACTIVATION",
    "TRADE_LOYALTY_VOLUME_PUSHING",
    "POSM_MAINTENANCE_ASSET_PURITY"
]

# Supported file extensions for uploads in data gateway
ALLOWED_FILE_EXTENSIONS = {".csv", ".xlsx", ".xls", ".json"}

# Monthly free WhatsApp message limit for businesses
DEFAULT_WHATSAPP_LIMIT = 200

# Directory for importing file uploads
UPLOAD_DIR = "uploads/imports"
