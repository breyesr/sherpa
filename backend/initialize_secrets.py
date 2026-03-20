import asyncio
import os
from app.core.database import SessionLocal
from app.core.system_config import ConfigService

async def initialize_secrets():
    async with SessionLocal() as db:
        print("--- INITIALIZING SYSTEM SECRETS (NON-DESTRUCTIVE) ---")
        
        # 1. AI Provider
        existing_provider = await ConfigService.get(db, "ACTIVE_AI_PROVIDER")
        if not existing_provider:
            provider = os.getenv("ACTIVE_AI_PROVIDER", "openai")
            await ConfigService.set(db, "ACTIVE_AI_PROVIDER", provider, "The active LLM provider")
            print(f"Set ACTIVE_AI_PROVIDER to: {provider}")
        else:
            print(f"ACTIVE_AI_PROVIDER already exists: {existing_provider}")

        # Helper to safely import key if missing
        async def import_if_missing(key_name: str, env_name: str, description: str):
            existing = await ConfigService.get(db, key_name)
            if not existing:
                env_val = os.getenv(env_name)
                if env_val and env_val != "PLACEHOLDER":
                    await ConfigService.set(db, key_name, env_val, description)
                    print(f"Imported {key_name} from environment.")
                else:
                    print(f"Skipping {key_name}: No valid env var found.")
            else:
                print(f"{key_name} already exists in database. Skipping import.")

        # 2. Sync all keys
        await import_if_missing("OPENAI_API_KEY", "OPENAI_API_KEY", "OpenAI API Key")
        await import_if_missing("ANTHROPIC_API_KEY", "ANTHROPIC_API_KEY", "Anthropic API Key")
        await import_if_missing("GEMINI_API_KEY", "GEMINI_API_KEY", "Google Gemini API Key")
        await import_if_missing("GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_ID", "Google OAuth Client ID")
        await import_if_missing("GOOGLE_CLIENT_SECRET", "GOOGLE_CLIENT_SECRET", "Google OAuth Client Secret")
        await import_if_missing("GOOGLE_REDIRECT_URI", "GOOGLE_REDIRECT_URI", "Google OAuth Redirect URI")

        print("--- SECRETS INITIALIZATION COMPLETE ---")

if __name__ == "__main__":
    if os.getenv("DATABASE_URL") or os.getenv("SQLALCHEMY_DATABASE_URI"):
        asyncio.run(initialize_secrets())
    else:
        print("Skipping secret initialization: No database connection found.")
