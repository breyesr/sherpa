import hashlib
import hmac
import logging
from fastapi import Request, HTTPException
from app.core.config import settings

logger = logging.getLogger(__name__)

async def verify_meta_signature(request: Request, app_secret: str | None) -> bytes:
    """
    Validates X-Hub-Signature-256 header per Meta's specification.
    Returns the raw body bytes on success, raises 403 on failure.
    """
    body = await request.body()
    
    # Bypass in testing or if secret is not set (e.g. local dev without signature checking)
    if settings.ENVIRONMENT == "testing" or not app_secret:
        if not app_secret:
            logger.warning("META_APP_SECRET is not configured. Webhook signature verification bypassed.")
        return body

    signature_header = request.headers.get("X-Hub-Signature-256", "")
    if not signature_header.startswith("sha256="):
        logger.error("Signature verification failed: Missing X-Hub-Signature-256 header")
        raise HTTPException(status_code=403, detail="Missing signature")
    
    expected_signature = signature_header[7:]  # strip "sha256=" prefix
    
    computed = hmac.new(
        app_secret.encode("utf-8"),
        body,
        hashlib.sha256
    ).hexdigest()
    
    if not hmac.compare_digest(computed, expected_signature):
        logger.error("Signature verification failed: Invalid signature")
        raise HTTPException(status_code=403, detail="Invalid signature")
    
    return body
