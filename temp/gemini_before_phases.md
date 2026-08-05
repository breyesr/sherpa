# Project: Sherpa MVP - Automated Scheduling & CRM

## Global Rules
- **Stack**: Python 3.11, FastAPI, SQLAlchemy 2.x, Next.js 14, TypeScript 5.x, PostgreSQL, Redis.
- **Tone**: Professional, analytical, and production-focused.
- **File Structure**: Monorepo split into /backend and /frontend.
- **Core Docs**:
  - /docs/project/BACKLOG.md: Prioritized epics and tasks (Owned by PM).
  - /docs/project/NORTH_STAR.md: The B2B Sales Intelligence vision and "Marco" persona (The North Star).
  - /docs/project/HANDOFF_STATE.md: MANDATORY state file for session continuity.
  - /docs/project/HANDOFF_LOG.md: Historical audit of session accomplishments.
  - /docs/project/PRODUCTION_STATUS.md: Current state of Railway services.
  - /docs/deployment_guide.md: Full service mapping and root directory configurations.


## 1. Execution & Context Hygiene (Mandatory)
To maintain high response speeds and prevent context saturation, all agents must:
- **Delegate Verbose Tasks**: Use invoke_agent for investigations, batch edits, or large file reviews to "compress" history.
- **Surgical Reads**: NEVER read files >400 lines in full. Use grep_search to identify targets and read_file with start_line/end_line.
- **Surgical Writes**: Do not replace entire large files. Use `replace_file_content` or `multi_replace_file_content` targeting the smallest possible block of modifications to avoid pushing huge file payloads back and forth.
- **Cap Command Output**: When executing terminal commands like `npm run build` or running test suites, use output limiting (e.g., piping to `tail -20` or targeting specific test files/methods) to prevent dumping hundreds of lines of standard output into the chat history.
- **Partition Documentation & Backlog**: Keep `docs/project/BACKLOG.md` under 400 lines by moving fully completed Epics and tasks to `docs/project/ARCHIVE_BACKLOG.md` periodically. Future agents should only read `ARCHIVE_BACKLOG.md` when researching historical task descriptions.
- **NPM/Pip Optimization**: Only read package.json or requirements.txt when strictly necessary for dependency verification.

## 2. Branching & Deployment Safety
### Branching Strategy
- **main**: Production-ready code. Only Human-in-the-Middle (HITM) can merge here.
- **staging**: Integration hub for all teams. Primary target for PRs.
- **feature/[role]/[task]**: Workspace for specific tasks (e.g., feature/backend/auth-fix).
### Safety Interlocks
- **Isolation**: If you detect you are working directly on main or staging, STOP and notify the user.
- **Railway Guardrails (CRITICAL)**: 
  - ALWAYS use **Nixpacks** for Railway deployments.
  - Sherpa uses three distinct Railway services (sherpa, worker, web). NEVER attempt to unify these.
  - Docker Usage: Dockerfile and docker-compose.yml are strictly for **Local Development**.

## 3. Database & Schema Integrity
- **Local Isolation**: All development must happen against local Docker instances (docker-compose.yml). No direct production DB connections.
- **Migration Protocol**: **STRICT HUMAN APPROVAL REQUIRED.** You must obtain explicit permission before running alembic upgrade or modifying SQLAlchemy models.
- **Zero-Trust**: Never log or commit .env values or Railway secrets.

## 4. Regression Prevention (Contract-First)
When modifying API endpoints or schemas:
- **Sync**: Backend Dev must update openapi.json before frontend integration.
- **Audit Types**: Verify how backend changes affect @/frontend/types/api.ts.
- **Consumer Check**: If changing a data shape, check primary UI consumers (e.g., ClientCalendar.tsx) for prop regressions.
- **Validation**: Frontend Dev must run npm run gen:api immediately after backend changes to ensure type sync.

## 5. Handoff & Continuity Protocol (CRITICAL)
Before every session wrap-up or whenever context limits approach, you MUST:
- **Update State**: Write the current progress and exact next steps into /docs/project/HANDOFF_STATE.md.
- **Log Accomplishments**: Append a concise summary (Timestamp, Task, Learnings) to /docs/project/HANDOFF_LOG.md.
- **Verify Documentation**: Ensure BACKLOG.md reflects the actual work remaining.

## Project Context
Sherpa is a B2B Sales Intelligence platform that empowers field representatives with GraphRAG-driven account insights. It automates data ingestion from messaging platforms (WhatsApp/Telegram) into a structured sales graph and provides contextual briefs for field visits, while maintaining robust calendar and appointment integration.


## Roles & Responsibilities
- **Product Manager**: Owns the task breakdown (Epics/Features) and enforces MVP exclusions. Owns docs/project/BACKLOG.md and MVP scope enforcement.
- **ScaleMaster**: Lead architect synthesizing all scale audits into `docs/scope/Sherpa_scalability_report.md.`.
- **Backend Dev**: Implements FastAPI architecture, Alembic migrations, and JWT auth routes. Owns `/backend` and `openapi.json`.
- **Frontend Dev**: Implements Next.js 14 App Router, Tailwind design system, and Zustand state. Owns `/frontend`.
- **DevOps**: Configures Docker, environment variables, and GitHub Actions CI/CD. Owns `infra/` and `.github/`.
- **UX/UI Expert**: Translates MVP requirements into accessible user flows and interface guidelines using Tailwind/shadcn conventions. Owns `docs/design_system.md`.
- **AI_Engineer**: AI Systems Engineer focused on GraphRAG, RAG, and custom persona model training.
- **LLMOps**: Focused on API rate limits, loop prevention, and token management.
