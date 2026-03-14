from cryptography.fernet import Fernet
from app.core.config import settings
import base64

# Use the secret key from settings to derive a fernet key
# Fernet keys must be 32 url-safe base64-encoded bytes.
def get_encryption_key():
    # Derive a valid Fernet key from our SECRET_KEY
    key = settings.SECRET_KEY.encode()
    if len(key) < 32:
        key = key.ljust(32, b'0')
    elif len(key) > 32:
        key = key[:32]
    return base64.urlsafe_b64encode(key)

fernet = Fernet(get_encryption_key())

def encrypt_token(token: str) -> str:
    if token is None:
        return ""
    if token == "":
        return ""
    return fernet.encrypt(token.encode()).decode()

def decrypt_token(encrypted_token: str) -> str:
    if not encrypted_token:
        return ""
    try:
        # Check if it's already plain text
        if not encrypted_token.startswith("gAAAA"):
            return encrypted_token
            
        return fernet.decrypt(encrypted_token.encode()).decode()
    except Exception as e:
        print(f"CRITICAL: Failed to decrypt token! Error: {e}")
        if encrypted_token.startswith("gAAAA"):
            return ""
        return encrypted_token
