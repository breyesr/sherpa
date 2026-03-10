# Sherpa MVP – Deployment Guide

This document explains how to move Sherpa from your local machine to a live production environment.

## 🏗️ Architecture Overview
*   **Frontend:** Next.js 14 (Deployed on **Vercel**).
*   **API:** FastAPI (Deployed on **Railway**).
*   **Worker:** Celery (Deployed on **Railway**).
*   **Scheduler:** Celery Beat (Deployed on **Railway**).
*   **Database:** PostgreSQL 16 (Provisioned on **Railway**).
*   **Cache/Broker:** Redis 7 (Provisioned on **Railway**).

---

## 1. Backend Setup (Railway.app)

### Step A: Provision Infrastructure
1.  Create a new project on Railway.
2.  Add **PostgreSQL** and **Redis** from the "Provision" menu.
3.  Connect your GitHub repository.

### Step B: Service Configuration
You will need to create three services in Railway from the same repository:
1.  **API Service:**
    *   Root Directory: `/backend`
    *   Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
2.  **Worker Service:**
    *   Root Directory: `/backend`
    *   Start Command: `celery -A app.core.celery_app worker --loglevel=info`
3.  **Beat Service (Scheduler):**
    *   Root Directory: `/backend`
    *   Start Command: `celery -A app.core.celery_app beat --loglevel=info`

### Step C: Environment Variables (Railway)
Copy these to the "Variables" tab in Railway:
*   `SECRET_KEY`: A long random string.
*   `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_PORT`, `POSTGRES_SERVER`: Railway provides these automatically when you link the DB.
*   `REDIS_HOST`: Provided by Railway Redis.
*   `BASE_URL`: Your live API URL (e.g., `https://sherpa-api.up.railway.app`).

---

## 2. Frontend Setup (Vercel)

### Step A: Deployment
1.  Connect your GitHub repo to Vercel.
2.  Set the **Root Directory** to `frontend`.
3.  Vercel will auto-detect Next.js.

### Step B: Environment Variables (Vercel)
*   `NEXT_PUBLIC_API_URL`: The URL of your Railway API (e.g., `https://sherpa-api.up.railway.app/api/v1`).

---

## 3. First-Time Live Configuration

Once both are live:
1.  **Login:** Register a new account on your live domain.
2.  **Admin Rights:** Since you are the owner, you must manually mark your user as an admin in the database.
    *   Go to the Railway PostgreSQL dashboard.
    *   Run: `UPDATE users SET is_admin = true WHERE email = 'your@email.com';`
3.  **Admin Panel:** Log in and go to `/admin`.
    *   Enter your **OpenAI/Gemini/Claude** keys.
    *   Enter your **Google Cloud** Client ID and Secret.
4.  **Google OAuth:** Ensure your Google Cloud Console has your live Railway URL (`https://.../api/v1/integrations/google/callback`) in the "Authorized Redirect URIs" list.

---

## 🔒 Security Reminders
*   **Secrets:** Never commit `.env` files to GitHub.
*   **Database:** Enable automated backups in the Railway dashboard.
*   **Tokens:** All tokens are encrypted at rest using the `SECRET_KEY` you define in Railway. If you change this key, all existing connections (Google/WhatsApp) will break.
