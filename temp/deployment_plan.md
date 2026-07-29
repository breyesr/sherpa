# Production Release & Deployment Plan

This document outlines the steps required to synchronize your production environment (`main` branch) with the current state of staging.

---

## Phase 1: Code Freeze & Final Staging Sync

Currently, the local branch `feature/backend-architecture` is **3 commits ahead of staging**. These commits contain the latest backend refactors and shared test fixtures.

### Step 1.1: Merge Feature to Staging (Requires Confirmation)
Before deploying to production, these 3 commits should be merged into `staging` to ensure staging matches the codebase to be released:
- `3ef97c9` - feat(202.4): implement shared pytest fixtures in conftest.py
- `f700f5f` - feat(202.3): organize root backend python scripts into structured subdirectories
- `fb39dd7` - feat(202.5): extract shared constants to core/constants.py

> [!IMPORTANT]
> **Staging Merge Protocol**: Per project rules, we must get your explicit confirmation before merging anything into `staging`.

### Step 1.2: Verify Staging Build
Once merged, verify that the Staging branch builds and passes health checks on Railway.

---

## Phase 2: Replicate Railway Configurations to Production

To prevent container crashes and secure resources, the production services in the Railway dashboard should match the optimized configurations of Staging.

### 2.1 Service CPU & Memory Quotas
In the Railway dashboard UI for your **Production Project**, apply the following resource limits:

| Service Name | Process Type | CPU Limit | Memory Limit (RAM) | Sleep on Idle |
| :--- | :--- | :--- | :--- | :--- |
| **Backend API** (`sherpa`) | `web` | `0.5` | `512 MB` | Configurable (Enabled in Staging) |
| **Asynchronous Processor** (`worker`) | `worker` | `0.5` | `512 MB` | **Disabled** (Must listen 24/7) |
| **Frontend Dashboard** (`web`) | `web` | `0.5` | `1024 MB` (1 GB) | Configurable |
| **Database** (PostgreSQL) | DB | - | `512 MB` | **Disabled** |
| **Redis** (Cache/Broker) | Cache | - | `256 MB` | **Disabled** |

> [!NOTE]
> The Frontend Dashboard RAM limit is defined as `1024` in [frontend/railway.json](file:///Users/bernardo/projects/sherpa/frontend/railway.json#L12) and will be automatically applied on build, but ensure the dashboard settings permit this allocation.

### 2.2 Environment Variables Sync
Check that the following environment variables are set in the Production environment in the Railway dashboard:

#### Backend Service (`sherpa` & `worker`)
*   `ENVIRONMENT`: `production`
*   `SECRET_KEY`: **MUST be set to a strong, unique, and secure string.**
    > [!CAUTION]
    > To prevent security vulnerabilities, the application will crash at startup if the `SECRET_KEY` is not set or contains default patterns (like `dev_secret_key` or `supersecretkey`). See [config.py:L12-L19](file:///Users/bernardo/projects/sherpa/backend/app/core/config.py#L12-L19).
*   `ENCRYPTION_KEY`: A unique secure key for encrypting user credentials.
*   `BACKEND_CORS_ORIGINS`: Explicit list of production frontend origins (e.g. `https://web-production-xxxx.up.railway.app`). Do not use regex/wildcard patterns.
*   `DATABASE_URL`: Production Postgres connection string.
*   `REDIS_URL`: Production Redis connection string.
*   `OPENAI_API_KEY`: Production API Key for GraphRAG and voice/text transcription.
*   `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REDIRECT_URI`: Production Google OAuth credentials.
*   `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_WHATSAPP_NUMBER`: Production Twilio WhatsApp credentials.

#### Frontend Service (`web`)
*   `NEXT_PUBLIC_API_URL`: Points to your production Backend API endpoint (e.g. `https://api-prod-xxxx.up.railway.app/api/v1`).

---

## Phase 3: Production Database Backup & Update

To prevent schema mismatch crashes, update the database structure *before* the new code runs on the production servers.

### Step 3.1: Create a PostgreSQL Backup
Run a `pg_dump` of the production database before applying any schema updates. Replace placeholders with your production connection details:
```bash
pg_dump -h <prod-db-host> -U <prod-db-user> -d <prod-db-name> -F c -b -v -f prod_backup_$(date +%F).dump
```

### Step 3.2: Run Alembic Migrations
Run the migrations from your local workspace (pointing to the production database) while on the `staging` branch (which contains the required migration files). This will run the schema updates safely:
```bash
cd backend
DATABASE_URL="postgresql://<prod-db-user>:<prod-db-password>@<prod-db-host>/<prod-db-name>" alembic upgrade head
```
> [!TIP]
> The online migration script in [env.py](file:///Users/bernardo/projects/sherpa/backend/migrations/env.py#L55-L57) automatically ensures that the `pgvector` extension exists on the target database: `CREATE EXTENSION IF NOT EXISTS vector;`.

---

## Phase 4: Merge Staging into Main & Deploy

Once the DB and Railway settings are prepared, you can merge `staging` into `main` to trigger the production deployment.

### Step 4.1: Merge Branches locally
Run the following Git commands to pull staging and merge it into `main`:
```bash
# Ensure local branches are up-to-date
git checkout staging
git pull origin staging

# Switch to main and merge staging
git checkout main
git pull origin main
git merge staging --no-ff -m "Release: Merge staging into main"

# Push changes to deploy
git push origin main
```

### Step 4.2: Automated Post-Deploy Repair & Seeding
Once the merge is pushed, Railway will trigger the production build.
The start command executes [pre_deploy.sh](file:///Users/bernardo/projects/sherpa/backend/pre_deploy.sh) which will automatically:
1. Re-run `alembic upgrade head` (safely checks if migrations are already applied).
2. Execute [production_client_repair.py](file:///Users/bernardo/projects/sherpa/backend/scripts/diagnostics/production_client_repair.py) to resolve any duplicate business profiles or invalid phone-to-identity-hash alignments.
3. Preload Mexican ZIP and municipality records using `seed_postal_codes_if_empty.py` if the table is currently empty.

---

## Phase 5: Custom Domain Configuration

To route your custom domains (`domain.com` for production and `staging.domain.com` for staging) to the Railway services:

### Step 5.1: Bind Custom Domains in Railway UI
1. **Staging Environment**:
   - Go to your Railway Project, select the **Staging** environment, and click on the **Frontend Dashboard** (`web`) service.
   - Go to the **Settings** tab, scroll down to **Domains**, and click **Custom Domain**.
   - Input `staging.domain.com` and copy the generated DNS record target.
2. **Production Environment**:
   - Go to your Railway Project, select the **Production** environment, and click on the **Frontend Dashboard** (`web`) service.
   - Go to the **Settings** tab, scroll down to **Domains**, and click **Custom Domain**.
   - Input `domain.com` (and optionally `www.domain.com`) and copy the generated DNS record target.

### Step 5.2: Configure DNS Records (at your DNS Registrar)
Log in to your DNS registrar (Cloudflare, GoDaddy, Namecheap, etc.) and add the following records:

*   **For Staging (`staging.domain.com`)**:
    *   **Type**: `CNAME`
    *   **Name / Host**: `staging`
    *   **Value / Target**: The target provided by Railway (e.g., `xxx.up.railway.app` or similar).
    *   **Proxy Status** (Cloudflare only): *DNS Only* (or *Proxied* if SSL is handled correctly, but *DNS Only* is recommended during initial setup).
*   **For Production (`domain.com` - Root Domain)**:
    *   Because it's a root domain, standard `CNAME` records cannot be used directly (unless using Cloudflare's CNAME Flattening). Use one of the following:
        *   **Option A**: Create an `ALIAS` or `ANAME` record for `@` pointing to the target provided by Railway.
        *   **Option B (Recommended for general compatibility)**: Create a `CNAME` for `www` pointing to the Railway target, and set a page redirect rule at your registrar to forward `http://domain.com` to `https://www.domain.com`.

### Step 5.3: Update Backend CORS Settings
Because CORS is strictly enforced (wildcards are banned), you must update the backend CORS lists to allow requests from the new domains:

1. **Staging Backend Settings**:
   - Update `BACKEND_CORS_ORIGINS` environment variable in Railway to: `https://staging.domain.com`
2. **Production Backend Settings**:
   - Update `BACKEND_CORS_ORIGINS` environment variable in Railway to: `https://domain.com,https://www.domain.com`

### Step 5.4 (Optional but Recommended): Add Custom API Domains
To avoid exposing raw `xxx.up.railway.app` backend domains, you can configure custom API subdomains:
*   **Staging API**: Bind `api-staging.domain.com` to the Backend API (`sherpa`) service.
    *   Set `NEXT_PUBLIC_API_URL` environment variable on the staging frontend to: `https://api-staging.domain.com/api/v1`
*   **Production API**: Bind `api.domain.com` to the Backend API (`sherpa`) service.
    *   Set `NEXT_PUBLIC_API_URL` environment variable on the production frontend to: `https://api.domain.com/api/v1`
