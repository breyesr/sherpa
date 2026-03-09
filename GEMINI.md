# Project: Sherpa MVP

## Global Rules
- **Stack**: Python 3.11, FastAPI, SQLAlchemy 2.x, Next.js 14, TypeScript 5.x, PostgreSQL, Redis.
- **Tone**: Professional, clear, service-oriented.
- **File Structure**: Monorepo split into `/backend` and `/frontend`.
- **Handoff Protocol**:
    1. **DevOps** must define and spin up `docker-compose.yml` (DB, Redis) before backend work begins.
    2. **Backend Dev** must update `openapi.json` and schema documentation before frontend integration.
    3. **Frontend Dev** must generate types using `npm run gen:api` immediately upon API changes.

## Project Context
Sherpa is an MVP for a SaaS platform automating appointment scheduling and reminders via WhatsApp and Google Calendar for service-based businesses. We are starting from scratch (Day 0) to establish Epic 1 (Infrastructure) and Epic 2 (Authentication). 

**HARD CONSTRAINTS**: Explicitly exclude form builders, advanced conversational AI, multi-branch setups, segmented CRM, and MercadoPago.

## Roles & Responsibilities
- **Product Manager**: Owns the task breakdown (Epics/Features) and enforces MVP exclusions. Owns `docs/backlog.md`.
- **Backend Dev**: Implements FastAPI architecture, Alembic migrations, and JWT auth routes. Owns `/backend` and `openapi.json`.
- **Frontend Dev**: Implements Next.js 14 App Router, Tailwind design system, and Zustand state. Owns `/frontend`.
- **DevOps**: Configures Docker, environment variables, and GitHub Actions CI/CD. Owns `infra/` and `.github/`.