# Project: Sherpa MVP

## Global Rules
- **Stack**: Python 3.11, FastAPI, SQLAlchemy 2.x, Next.js 14, TypeScript 5.x, PostgreSQL, Redis.
- **Tone**: Professional, clear, service-oriented.
- **File Structure**: Monorepo split into `/backend` and `/frontend`.
## Handoff Protocol
1. **DevOps** must define and spin up `docker-compose.yml` (DB, Redis) before backend work begins.
2. **Backend Dev** must update `openapi.json` and schema documentation before frontend integration.
3. **Frontend Dev** must generate types using `npm run gen:api` immediately upon API changes.

## Deployment Guardrails (CRITICAL)
- **Production/Staging Builder**: ALWAYS use **Nixpacks** for Railway deployments. 
- **Docker Usage**: `Dockerfile` and `docker-compose.yml` are strictly for **Local Development**.
- **Service Mapping**: Sherpa uses three distinct Railway services (`sherpa`, `worker`, `web`). Never attempt to unify these into a single Docker service without explicit user approval.
- **Reference**: See `docs/deployment_guide.md` for full service mapping and root directory configurations.


## Project Context
Sherpa is a SaaS platform automating appointment scheduling and reminders via messaging systems like WhatsApp or Telegram and Google Calendar for service-based businesses. 

**HARD CONSTRAINTS**: Explicitly exclude form builders, advanced conversational AI, multi-branch setups, segmented CRM, and MercadoPago.

## Roles & Responsibilities
- **ScaleMaster**: Lead architect synthesizing all scale audits into `scalability_report.md`.
- **Product Manager**: Owns the task breakdown (Epics/Features) and enforces MVP exclusions. Owns `docs/backlog.md`.
- **Backend Dev**: Implements FastAPI architecture, Alembic migrations, and JWT auth routes. Owns `/backend` and `openapi.json`.
- **Frontend Dev**: Implements Next.js 14 App Router, Tailwind design system, and Zustand state. Owns `/frontend`.
- **DevOps**: Configures Docker, environment variables, and GitHub Actions CI/CD. Owns `infra/` and `.github/`.
- **UX/UI Expert**: Translates MVP requirements into accessible user flows and interface guidelines using Tailwind/shadcn conventions. Owns `docs/design_system.md`.