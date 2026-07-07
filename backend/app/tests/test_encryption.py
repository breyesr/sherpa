import pytest
from app.core.encryption import encrypt_value, decrypt_value, get_encryption_key
from app.core.config import settings

def test_encryption_decryption_success():
    secret = "my_super_secret_twilio_token_12345!"
    encrypted = encrypt_value(secret)
    assert encrypted != secret
    assert encrypted.startswith("gAAAA")
    
    decrypted = decrypt_value(encrypted)
    assert decrypted == secret

def test_encryption_empty_none():
    assert encrypt_value(None) == ""
    assert encrypt_value("") == ""
    assert decrypt_value(None) == ""
    assert decrypt_value("") == ""

def test_decrypt_plaintext_passthrough():
    plaintext = "already_plaintext_value"
    # Should return value as-is since it doesn't start with gAAAA
    assert decrypt_value(plaintext) == plaintext

def test_decrypt_invalid_fernet_format():
    invalid = "gAAAA_but_invalid_content"
    # Should catch error and return empty string because it starts with gAAAA but is invalid
    assert decrypt_value(invalid) == ""

def test_encryption_key_derivation():
    # Make sure we can derive keys under different configuration states
    original_enc_key = settings.ENCRYPTION_KEY
    try:
        # 1. Fallback to SECRET_KEY
        settings.ENCRYPTION_KEY = None
        key_fallback = get_encryption_key()
        assert len(key_fallback) == 44 # Fernet base64 key length is 44 characters
        
        # 2. Use ENCRYPTION_KEY (under 32 chars)
        settings.ENCRYPTION_KEY = "shortkey"
        key_short = get_encryption_key()
        assert len(key_short) == 44
        assert key_short != key_fallback
        
        # 3. Use ENCRYPTION_KEY (over 32 chars)
        settings.ENCRYPTION_KEY = "a" * 50
        key_long = get_encryption_key()
        assert len(key_long) == 44
    finally:
        settings.ENCRYPTION_KEY = original_enc_key
