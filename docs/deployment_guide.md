# Sherpa MVP – Production Deployment Guide (Railway)

This document reflects the verified steps to deploy Sherpa 100% on **Railway.app**.

## 🏗️ Architecture Overview
*   **Web (Frontend):** Next.js 14 (App Router).
*   **API (Backend):** FastAPI (Uvicorn).
*   **Worker (AI Brain):** Celery (Background processor).
*   **Database:** PostgreSQL 16.
*   **Cache/Broker:** Redis 7.

---

## 1. Initial Infrastructure
1.  **Project:** Create an "Empty Project" on Railway.
2.  **Database:** Add **PostgreSQL** and **Redis** from the "Database" menu.
3.  **Repository:** Connect your GitHub repo (`sherpa`).

---

## 2. API Service Setup (The Engine)
1.  **Service Name:** Rename the default box to `api`.
2.  **Root Directory:** Set to `/backend` in Settings.
3.  **Start Command:** 
    `PYTHONPATH=. uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4.  **Networking:** Set the port to **8080** in Settings.
5.  **Pre-deploy Step:** Add `PYTHONPATH=. alembic upgrade head` to ensure database tables are created.
6.  **Variables:**
    *   `SECRET_KEY`: (Random string for encryption).
    *   `BASE_URL`: (Your generated domain, e.g., `https://api-xxx.up.railway.app`).
    *   **References:** Link all variables from the **Postgres** and **Redis** services.

---

## 3. Worker Service Setup (The AI Brain)
1.  **Create Service:** Add a new service from the same GitHub repo.
2.  **Service Name:** Rename to `worker`.
3.  **Root Directory:** Set to `/backend`.
4.  **Start Command:** 
    `C_FORCE_ROOT=1 celery -A app.core.celery_app worker --loglevel=info --concurrency=1 --pool=solo`
5.  **Resources:** Set Memory limit to **1 GB** in the "Scale" settings.
6.  **Variables:** Use "Reference" to copy **all** variables from the `api` service.

---

## 4. Web Service Setup (The Interface)
1.  **Create Service:** Add a new service from the same GitHub repo.
2.  **Service Name:** Rename to `web`.
3.  **Root Directory:** Set to `/frontend`.
4.  **Variables:**
    *   `NEXT_PUBLIC_API_URL`: Your API domain + version (e.g., `https://api-xxx.up.railway.app/api/v1`).
5.  **Networking:** Generate a public domain. This is the link you will use to access Sherpa.

---

## 5. Post-Deployment Configuration
1.  **Admin Rights:** Access your Railway Postgres database and run:
    `UPDATE users SET is_admin = true WHERE email = 'your@email.com';`
2.  **Credentials:** Go to your live `/admin` page and enter:
    *   `OPENAI_API_KEY`, `GEMINI_API_KEY`, or `CLAUDE_API_KEY`.
    *   Google Cloud `CLIENT_ID` and `CLIENT_SECRET`.
3.  **Google OAuth:** Add `https://YOUR_API_DOMAIN/api/v1/integrations/google/callback` to the "Authorized Redirect URIs" in Google Cloud Console.

---

## 🔒 Security
*   **At-Rest Encryption:** Tokens are encrypted using the `SECRET_KEY`. Keep this safe.
*   **Multi-Tenancy:** Data is strictly isolated by `business_id`.
