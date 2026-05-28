# Sherpa Deployment Guide (Railway)

## Architecture Overview
Sherpa uses a **Multi-service Project** on Railway. All services point to the same GitHub repository but target different directories and commands.

### 1. Service: `Backend API` (formerly 'sherpa')
- **Role**: FastAPI Backend
- **Root Directory**: `/backend`
- **Builder**: Nixpacks
- **Start Command**: Managed via `backend/railway.json`
- **Health Check**: `/health` (or `/` which redirects)

### 2. Service: `Asynchronous Processor` (formerly 'worker')
- **Role**: Celery Background Tasks (Reminders, Calendar Sync, & B2B AI Ingestion)
- **Root Directory**: `/backend`
- **Builder**: Nixpacks
- **Start Command**: `celery -A app.core.celery_app worker --loglevel=warning`
- **Dependencies**: Requires `OPENAI_API_KEY` for B2B intelligence extraction.

### 3. Service: `Frontend Dashboard` (formerly 'web')
- **Role**: Next.js 14 App
- **Root Directory**: `/frontend`
- **Builder**: Nixpacks
- **Start Command**: `npm run start`

## Critical Constraints (Read Before Modifying)
- **DO NOT** change the Builder from `Nixpacks` to `Docker` in the Railway UI or `railway.json` for production services without explicit user permission.
- **Dockerfiles** in this project are for **Local Development Only** (`docker-compose.yml`).
- If you modify the `backend/` code, ensure you check the `Procfile` and `railway.json` for consistency.
- The `Frontend Dashboard` service depends on the `Backend API` service being healthy.
