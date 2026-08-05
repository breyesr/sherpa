from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings
from pathlib import Path

class Settings(BaseSettings):
    PROJECT_NAME: str = "Sherpa MVP"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"
    SECRET_KEY: str = "dev_secret_key_sherpa_local_32chars_len!"

    @field_validator("SECRET_KEY", mode="before")
    @classmethod
    def validate_secret_key(cls, v: str | None, info) -> str:
        import os
        is_railway_or_prod = os.getenv("RAILWAY_ENVIRONMENT") or info.data.get("ENVIRONMENT") in ["production", "staging"]
        if is_railway_or_prod and (not v or "dev_secret_key" in v or "supersecretkey" in v):
            raise ValueError("CRITICAL SECURITY ERROR: You must set a strong, unique SECRET_KEY in environment variables when deploying to Railway/Production.")
        return v or "dev_secret_key_sherpa_local_32chars_len!"

    ENCRYPTION_KEY: str | None = None
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8
    
    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> Union[List[str], str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        return v

    POSTGRES_SERVER: str = "localhost"
    POSTGRES_USER: str = "sherpa"
    POSTGRES_PASSWORD: str = "sherpa_password"
    POSTGRES_DB: str = "sherpa_dev"
    DATABASE_URL: str | None = None
    SQLALCHEMY_DATABASE_URI: str | None = None

    @field_validator("SQLALCHEMY_DATABASE_URI", mode="before")
    @classmethod
    def assemble_db_connection(cls, v: str | None, info) -> str:
        if isinstance(v, str) and v.startswith("postgresql+asyncpg://"):
            return v
        
        db_url = v or info.data.get("DATABASE_URL")
        if not db_url:
            return f"postgresql+asyncpg://{info.data.get('POSTGRES_USER')}:{info.data.get('POSTGRES_PASSWORD')}@{info.data.get('POSTGRES_SERVER')}/{info.data.get('POSTGRES_DB')}"
        
        # Clean Railway strings
        if db_url.startswith("postgres://"):
            return db_url.replace("postgres://", "postgresql+asyncpg://", 1)
        if db_url.startswith("postgresql://"):
            return db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
            
        return db_url

    REDIS_HOST: str = "localhost"
    REDIS_URL: str | None = None
    
    # EXTERNAL INTEGRATIONS - MUST BE IN .ENV FILE
    GOOGLE_CLIENT_ID: str = "PLACEHOLDER"
    GOOGLE_CLIENT_SECRET: str = "PLACEHOLDER"
    GOOGLE_REDIRECT_URI: str = "http://127.0.0.1:8000/api/v1/integrations/google/callback"
    
    OPENAI_API_KEY: str = "PLACEHOLDER"
    BASE_URL: str = "http://localhost:8000"

    # TWILIO PLATFORM SETTINGS (Option B: ISV Model)
    # These are only for the Main Admin / Platform owner
    TWILIO_ACCOUNT_SID: str | None = None
    TWILIO_AUTH_TOKEN: str | None = None
    TWILIO_WHATSAPP_NUMBER: str | None = None # Master sandbox number or main platform number

    # META WHATSAPP CLOUD API PLATFORM SETTINGS
    META_APP_ID: str | None = None
    META_APP_SECRET: str | None = None
    META_SYSTEM_USER_TOKEN: str | None = None
    META_EMBEDDED_SIGNUP_CONFIG_ID: str | None = None
    META_GRAPH_API_VERSION: str = "v22.0"

    model_config = {
        "case_sensitive": True,
        "env_file": ".env",
        "extra": "ignore"
    }

settings = Settings()
