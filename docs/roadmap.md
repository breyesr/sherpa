# Sherpa MVP Roadmap

> ⚠️ **HISTORICAL SNAPSHOT (March 2026)**: This roadmap covers the original V1 MVP phases. The active prioritized backlog is maintained in [`project/BACKLOG.md`](project/BACKLOG.md).

This roadmap outlines the prioritized path to a scalable, production-ready SaaS. It balances new feature development with the safety and scalability requirements identified in the technical audits.

## Phase 1: Intelligent & Safe Core (COMPLETED)
*Goal: Transform the assistant from a generic scheduler into a service-aware business concierge.*

- [x] **JSONB Infrastructure**: Foundation for flexible services and client metadata.
- [x] **Smart Escalation Path (Task 12.5)**: Behavioral toggles for AI fallback handling.
- [x] **AI Brain Upgrade (Task 12.4)**: Service Catalog awareness and duration-based availability.
- [x] **Human-in-the-Loop Safety**: "Flagged for Review" UI and manual resolution.

## Phase 2: Operational Visibility & UX Polish (COMPLETED)
*Goal: Provide professional tools for business owners to manage their AI and services.*

- [x] **Tabbed Settings Redesign (Task 14.1)**: Modular navigation for settings.
- [x] **Operational Hub (Epic 19)**:
    - **Smart Dashboard**: Initial briefing widgets.
    - **Unified Inbox**: Persistent chat management for Telegram/WhatsApp.
- [x] **AI Metadata Autopilot (Task 13.4)**: Autonomous data extraction during chat.
- [x] **Modular Pivot (Trade Vertical)**:
    - **Physical Assets**: Stores and physical locations management.
    - **Inventory & Orders**: Relational structure for products and sales.
    - **Specialized Intelligence**: Visit Briefer and Lead Qualifier AI agents.
- [x] **System Hardening**: Frontend "Zero Noise" pass and backend schema locking.

## Phase 3: Trade Operational Loop & Growth (CURRENT)
*Goal: Enable revenue generation and reliable field operations.*

- [ ] **Official WhatsApp Integration (Task 16.1)**:
    - Migrate from Sandbox to Twilio/Meta production API.
- [ ] **Order Management UI (Epic 25)**:
    - "New Order" flow with calculation and inventory tracking.
- [ ] **Stripe Monetization (Task 8.2)**: Tiered subscription management.
- [ ] **KPI Dashboard (Task 8.1)**: Visual analytics for conversion and sales performance.

## Phase 4: Scale & Optimization
*Goal: Prepare the system for high-volume multi-tenancy.*

- [ ] **KPI Dashboard (Task 8.1)**: Visual analytics for conversion rates.
- [ ] **Frontend Performance Tuning (Task 11.9)**: useMemo optimizations for large datasets.
- [ ] **Reliability Hardening**: Standardized Error Boundaries and recovery paths.

## Phase 5: Growth & Ecosystem
*Goal: Lower barriers to entry and integrate with the broader business stack.*

- [ ] **Bulk Data Importer (Task 18.1/18.2)**: CSV/XLSX upload with dynamic mapping.
- [ ] **External CRM Sync (Task 18.4)**: Two-way sync with HubSpot/Salesforce.

---
*Last Updated: March 31, 2026*
