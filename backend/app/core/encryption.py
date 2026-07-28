import base64
import logging
from cryptography.fernet import Fernet
from app.core.config import settings

logger = logging.getLogger(__name__)

def get_encryption_key() -> bytes:
    # Use ENCRYPTION_KEY if set, otherwise fallback to SECRET_KEY
    raw_key = settings.ENCRYPTION_KEY or settings.SECRET_KEY
    key = raw_key.encode()
    if len(key) < 32:
        key = key.ljust(32, b'0')
    elif len(key) > 32:
        key = key[:32]
    return base64.urlsafe_b64encode(key)

_fernet = Fernet(get_encryption_key())

def encrypt_value(value: str) -> str:
    if value is None:
        return ""
    if value == "":
        return ""
    return _fernet.encrypt(value.encode()).decode()

def decrypt_value(encrypted_value: str) -> str:
    if not encrypted_value:
        return ""
    try:
        # If it doesn't look like a Fernet token, return it as-is
        if not encrypted_value.startswith("gAAAA"):
            return encrypted_value
        return _fernet.decrypt(encrypted_value.encode()).decode()
    except Exception as e:
        logger.error("CRITICAL: Failed to decrypt value! Error: %s", e)
        if encrypted_value.startswith("gAAAA"):
            return ""
        return encrypted_value
