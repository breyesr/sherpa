# Sherpa MVP Roadmap

This roadmap outlines the prioritized path to a scalable, production-ready SaaS. It balances new feature development with the safety and scalability requirements identified in the technical audits.

## Phase 1: Intelligent & Safe Core (COMPLETED)
*Goal: Transform the assistant from a generic scheduler into a service-aware business concierge.*

- [x] **JSONB Infrastructure**: Foundation for flexible services and client metadata.
- [x] **Smart Escalation Path (Task 12.5)**: Behavioral toggles for AI fallback handling.
- [x] **AI Brain Upgrade (Task 12.4)**: Service Catalog awareness and duration-based availability.
- [x] **Human-in-the-Loop Safety**: "Flagged for Review" UI and manual resolution.

## Phase 2: Operational Visibility & UX Polish (CURRENT)
*Goal: Provide professional tools for business owners to manage their AI and services.*

- [x] **Tabbed Settings Redesign (Task 14.1)**: Modular navigation for settings.
- [x] **Operational Hub (Epic 19)**:
    - **Smart Dashboard**: Initial briefing widgets.
    - **Unified Inbox**: Persistent chat management for Telegram/WhatsApp.
- [x] **AI Metadata Autopilot (Task 13.4)**: Autonomous data extraction during chat.
- [ ] **Dashboard & Calendar Integrity (Tasks 17.8 & 17.10)**:
    - Fix chronological sorting and strict "Today vs. Upcoming" logic.
    - Dim past appointments and implement status-based color coding.
- [ ] **Smart Context Awareness (Task 12.7)**: Skip 'Ask for Reason' when service is pre-selected.
- [ ] **CRM & Settings Safety (Task 17.5 & 17.6)**:
    - Unsaved changes guardian and two-stage field deletion.
- [ ] **Service Manager UI (Task 12.2)**: Full CRUD for services with custom attributes.

## Phase 3: Business Viability (Production & Growth)
*Goal: Enable revenue generation and reliable messaging.*

- [ ] **Official WhatsApp Integration (Task 16.1)**:
    - Migrate from Sandbox to Twilio/Meta production API.
    - Implement Message Credit engine for tenant-specific cost limiting.
- [ ] **Stripe Monetization (Task 8.2)**: Tiered subscription management.
- [ ] **Boss Mode (Epic 15)**: Internal AI chat for reporting.

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
