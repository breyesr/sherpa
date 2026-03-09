from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings
from pathlib import Path

class Settings(BaseSettings):
    PROJECT_NAME: str = "Sherpa MVP"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "supersecretkey_please_change_in_production"
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
    SQLALCHEMY_DATABASE_URI: str | None = None

    @field_validator("SQLALCHEMY_DATABASE_URI", mode="before")
    @classmethod
    def assemble_db_connection(cls, v: str | None, info) -> str:
        if isinstance(v, str):
            return v
        return f"postgresql+asyncpg://{info.data.get('POSTGRES_USER')}:{info.data.get('POSTGRES_PASSWORD')}@{info.data.get('POSTGRES_SERVER')}/{info.data.get('POSTGRES_DB')}"

    REDIS_HOST: str = "localhost"
    
    # EXTERNAL INTEGRATIONS - MUST BE IN .ENV FILE
    GOOGLE_CLIENT_ID: str = "PLACEHOLDER"
    GOOGLE_CLIENT_SECRET: str = "PLACEHOLDER"
    GOOGLE_REDIRECT_URI: str = "http://127.0.0.1:8000/api/v1/integrations/google/callback"
    
    OPENAI_API_KEY: str = "PLACEHOLDER"
    BASE_URL: str = "http://localhost:8000"

    model_config = {
        "case_sensitive": True,
        "env_file": ".env",
        "extra": "ignore"
    }

settings = Settings()
