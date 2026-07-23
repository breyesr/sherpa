"""
Shared Core Constants across backend services and API routers.
"""

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

DEFAULT_ROUTING_CONFIG_TRADE = {
    "prospective_clients": {"enabled": True},
    "distributors_retailers": {"enabled": True},
    "sales_reps": {"enabled": True},
    "allowed_zip_codes": []
}

DEFAULT_ROUTING_CONFIG_BASIC = {
    "prospective_clients": {"enabled": True},
    "distributors_retailers": {"enabled": False},
    "sales_reps": {"enabled": True},
    "allowed_zip_codes": []
}
