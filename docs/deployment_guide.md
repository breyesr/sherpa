# Sherpa Deployment & Process Separation Guide

This guide explains how to configure Railway to achieve independent horizontal scaling and safe migrations.

## 1. Process Separation (Independent Services)

To prevent background tasks from affecting API performance, we split the backend into three distinct services in Railway.

### Step A: Create the Services
In your Railway project, add three new services pointing to the same repository and the `backend/` directory:

1.  **Sherpa API** (The Web server)
    -   **Start Command:** `./pre_deploy.sh && PYTHONPATH=. uvicorn app.main:app --host 0.0.0.0 --port $PORT`
    -   **Custom Domain:** Yes
2.  **Sherpa Worker** (Background Jobs)
    -   **Start Command:** `PYTHONPATH=. celery -A app.core.celery_app worker --loglevel=info`
    -   **Custom Domain:** No
3.  **Sherpa Beat** (Periodic Scheduler)
    -   **Start Command:** `PYTHONPATH=. celery -A app.core.celery_app beat --loglevel=info`
    -   **Custom Domain:** No

## 2. Safe Migrations (Gating)

Currently, `pre_deploy.sh` (which runs `alembic upgrade head`) is included in the API start command. This is safe **only if you have 1 instance** of the API.

### For Scaling to Multiple Instances:
To prevent race conditions when scaling the API to 2+ instances:

1.  Remove `./pre_deploy.sh &&` from the **Sherpa API** start command.
2.  Create a 4th service called **Sherpa Migrator**.
3.  Set its start command to `./pre_deploy.sh`.
4.  Configure it to run once per deployment (or trigger it manually before updating the other services).

## 3. Environment Variables
Ensure all 4 services (API, Worker, Beat, Migrator) share the same environment variables, especially:
- `DATABASE_URL`
- `REDIS_URL`
- `OPENAI_API_KEY` (and other LLM keys)
- `TELEGRAM_BOT_TOKEN`
- `WHATSAPP_ACCESS_TOKEN`
