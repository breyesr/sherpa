# Handoff Log

## [2026-05-25] - Vertical Type Implementation & Migration
- **Task**: Implement the foundational vertical discriminator for the modular pivot.
- **Action**: Added `vertical_type` (Enum: BASIC, TRADE) to `BusinessProfile` model and schemas.
- **Migration**: Generated and applied a PostgreSQL-aware Alembic migration (`cffdb426ea17`).
- **Validation**: Verified the schema serialization and DB values via integration test script.
- **Parity**: Updated `openapi.json` to reflect backend changes for frontend consumers.

## [2026-05-24] - Modular Pivot Planning & Token Optimization
- **Task**: Pivot Sherpa to a modular architecture with a focus on a Trade vertical.
- **Action**: Created `docs/scope/modular_pivot_plan.md` and `docs/project/sprint_plan.md`. Updated `docs/project/BACKLOG.md` with Epics 22 and 23.
- **Feature**: Integrated a specific relational schema for stores, orders, and products based on user-provided diagrams.
- **Requirement**: Added strict "Token Guardrails" to the architecture to prevent escalating LLM costs.
- **Constraint**: Ensured backward compatibility for the "Basic" appointment-only tier.

## [2026-05-23] - Login Redirection & Layout Fix
- **Task**: Resolved bug where login landing page persisted with a visible sidebar after authentication.
- **Action**: Modified `DashboardLayout.tsx` to hide the sidebar when unauthenticated and updated `LoginPage.tsx` to force a full page reload for server-side state sync.
- **Learning**: `router.push` in Next.js does not always guarantee that the next page request will include the newly set cookies if the page was previously prefetched; `window.location.href` is a reliable fallback for authentication state transitions.
