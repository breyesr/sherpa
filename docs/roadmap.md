# Sherpa MVP Roadmap

This roadmap outlines the prioritized path to a scalable, production-ready SaaS. It balances new feature development with the safety and scalability requirements identified in the technical audits.

## Phase 1: Intelligent & Safe Core (COMPLETED)
*Goal: Transform the assistant from a generic scheduler into a service-aware business concierge.*

- [x] **JSONB Infrastructure**: Foundation for flexible services and client metadata.
- [x] **Smart Escalation Path (Task 12.5)**: Behavioral toggles for AI fallback handling.
- [x] **AI Brain Upgrade (Task 12.4)**:
    - Inject Service Catalog (Name, Price, Duration) into the system prompt.
    - Update `create_appointment` tool to capture `service_id`.
    - **Scalability Fix**: Update availability logic to respect specific service durations.
- [x] **Human-in-the-Loop Safety**:
    - Implement "Flagged for Review" UI in the Dashboard to surface AI escalations.
    - Add resolve action for business owners when the AI hits a fallback state.

## Phase 2: Operational Visibility (The UI Overhaul) (CURRENT)
*Goal: Provide professional tools for business owners to manage their AI and services.*

- [ ] **Tabbed Settings Redesign (Task 14.1)**:
    - Categories: General, AI Behavior (Escalation Chain), Service Catalog, Integrations.
- [ ] **Service Manager UI (Task 12.2)**:
    - Full CRUD for services with custom attributes.
- [ ] **Extensible CRM UI (Task 13.3)**:
    - Display and edit custom fields (e.g., Pet Name, Allergies) captured by AI.

## Phase 3: Business Viability (Production & Growth)
*Goal: Enable revenue generation and reliable messaging.*

- [ ] **Official WhatsApp Integration (Task 16.1)**:
    - Migrate from Sandbox to Twilio/Meta production API.
    - Implement Message Credit engine for tenant-specific cost limiting.
- [ ] **Stripe Monetization (Task 8.2)**:
    - Tiered subscription management (Trial -> Pro).
- [ ] **Boss Mode (Epic 15)**:
    - Internal AI chat for reporting ("How many bookings today?").

## Phase 4: Scale & Optimization
*Goal: Prepare the system for high-volume multi-tenancy.*

- [ ] **KPI Dashboard (Task 8.1)**:
    - Visual analytics for conversion rates and appointment density.
- [ ] **Frontend Performance Tuning (Task 11.9)**:
    - Optimization of CRM filtering and state management for large datasets.
- [ ] **Reliability Hardening**:
    - Standardized Error Boundaries and interactive AI recovery paths.

---
*Last Updated: March 20, 2026*
