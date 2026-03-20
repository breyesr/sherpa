import asyncio
import os
from app.core.database import SessionLocal
from app.core.system_config import ConfigService

async def initialize_secrets():
    async with SessionLocal() as db:
        print("--- INITIALIZING SYSTEM SECRETS ---")
        
        # 1. AI Provider
        provider = os.getenv("ACTIVE_AI_PROVIDER", "openai")
        await ConfigService.set(db, "ACTIVE_AI_PROVIDER", provider, "The active LLM provider (openai, gemini, anthropic)")
        print(f"Set ACTIVE_AI_PROVIDER to: {provider}")

        # 2. API Keys from Env
        openai_key = os.getenv("OPENAI_API_KEY")
        if openai_key:
            await ConfigService.set(db, "OPENAI_API_KEY", openai_key, "OpenAI API Key")
            print("Imported OPENAI_API_KEY from environment.")

        anthropic_key = os.getenv("ANTHROPIC_API_KEY")
        if anthropic_key:
            await ConfigService.set(db, "ANTHROPIC_API_KEY", anthropic_key, "Anthropic API Key")
            print("Imported ANTHROPIC_API_KEY from environment.")

        gemini_key = os.getenv("GEMINI_API_KEY")
        if gemini_key:
            await ConfigService.set(db, "GEMINI_API_KEY", gemini_key, "Google Gemini API Key")
            print("Imported GEMINI_API_KEY from environment.")

        google_id = os.getenv("GOOGLE_CLIENT_ID")
        if google_id:
            await ConfigService.set(db, "GOOGLE_CLIENT_ID", google_id, "Google OAuth Client ID")
            print("Imported GOOGLE_CLIENT_ID from environment.")

        google_secret = os.getenv("GOOGLE_CLIENT_SECRET")
        if google_secret:
            await ConfigService.set(db, "GOOGLE_CLIENT_SECRET", google_secret, "Google OAuth Client Secret")
            print("Imported GOOGLE_CLIENT_SECRET from environment.")

        google_uri = os.getenv("GOOGLE_REDIRECT_URI")
        if google_uri:
            await ConfigService.set(db, "GOOGLE_REDIRECT_URI", google_uri, "Google OAuth Redirect URI")
            print("Imported GOOGLE_REDIRECT_URI from environment.")

        print("--- SECRETS INITIALIZATION COMPLETE ---")

if __name__ == "__main__":
    if os.getenv("DATABASE_URL") or os.getenv("SQLALCHEMY_DATABASE_URI"):
        asyncio.run(initialize_secrets())
    else:
        print("Skipping secret initialization: No database connection found.")
