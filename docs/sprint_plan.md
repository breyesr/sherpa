# Sprint Plan: March 19 - March 26, 2026

## Objective
Finalize UX Hardening and establish a robust multi-tenant infrastructure for MVP scaling.

## Phase 1: UX Hardening (Epic 10)
- **Task 10.2: Implement Skeleton Loaders.**
  - **Acceptance Criteria:** CRM, Calendar, and Dashboard views must show stable skeleton screens during RSC data fetching to eliminate layout shifts.
- **Task 10.5: Resolve Dashboard/Settings Flickering.**
  - **Acceptance Criteria:** Transitions between all pages must be visually seamless without flashes of unstyled content or hydration pulses.
- **Task 11.6: AI Typing Indicators (Refinement).**
  - **Acceptance Criteria:** Ensure Telegram "typing" and WhatsApp "read" receipts are firing reliably for 100% of messages.

## Phase 2: State Management & Performance (Epic 11)
- **Task 11.10: Zustand Store Expansion.**
  - **Acceptance Criteria:** Move CRM and Appointment state to global Zustand stores. Implement "Optimistic Updates" for client deletion and appointment creation.
- **Task 11.9: Frontend Memoization.**
  - **Acceptance Criteria:** Apply `useMemo` and `useCallback` to high-frequency UI filters and calendar sorts to prevent lag during rapid user interaction.

## Phase 3: Infrastructure & DX (Epic 1)
- **Task 1.7: Full-Stack Docker Compose.**
  - **Acceptance Criteria:** Root `docker-compose.yml` must orchestrate API, Frontend, Worker, Beat, Postgres, and Redis in one command.
- **Task 9.3: WhatsApp Multi-Tenant Refinement.**
  - **Acceptance Criteria:** Ensure webhooks correctly route messages based on `phone_number_id` and handle Meta status updates without errors.

## Phase 4: Production Readiness
- **Objective:** Finalize manual rescheduling UI parity with AI rescheduling logic.
- **Task 6.4 (Frontend):** Ensure the "Reschedule" button in the dashboard updates the existing record instead of calling the standard creation endpoint.

## Phase 5: Prospect-to-Store Redirection & Value Tracking (Epic 138)
- **Task 138.1: Database Schema Migration & Audit Log.**
  - **Acceptance Criteria:** Add `assigned_store_id` self-referential foreign key on `Store` (nullable, index, SET NULL) and create `ClientStoreHistory` log table. Add `requested_product_id`, `requested_quantity`, `potential_value`, and `referred_at` columns to `Store`.
- **Task 138.2: Lead Qualification Value Ingestion.**
  - **Acceptance Criteria:** Update `qualify_lead` in `prospect_qualifier.py` to write the resolved `matched_store_id`, `product_id`, `quantity`, `referred_at`, and calculated `potential_value` (`qty * product.price`) into the prospect's newly created `Store` record.
- **Task 138.3: API Schema & Validation Setup.**
  - **Acceptance Criteria:** Update Pydantic schemas in `schemas/trade.py` and endpoints in `api/trade.py` to accept, return, and update `assigned_store_id`, `requested_product_id`, `requested_quantity`, `potential_value`, and `referred_at`, enforcing multi-tenant verification and circular reference checks.
- **Task 138.4: Dashboard Referral Logs & KPI Expose.**
  - **Acceptance Criteria:** Add a "Referrals" dashboard tab inside the Store details page to render a list of assigned prospects (showing date, product, quantity, and lead value, with PII masking gates for distributors), along with a Total Referral Pipeline Value KPI metric.
- **Task 138.5: API Type Regeneration & Compile Check.**
  - **Acceptance Criteria:** Regenerate frontend types, and verify the production build succeeds.

## Phase 6: Prospects Segmentation & Retail Referrals (Epic 139)
- **Task 139.1: Database Schema & Segment Migration.**
  - **Acceptance Criteria:** Add `prospect_segment` column (VARCHAR, default "wholesale", indexed) to `Client` and `Store` tables. Create Alembic migration script to default all existing rows to "wholesale".
- **Task 139.2: API Filters & Pydantic Schema Integration.**
  - **Acceptance Criteria:** Extend schemas and endpoints to accept and validate the `prospect_segment` query parameter.
- **Task 139.3: Lead Qualification Flow Segmentation.**
  - **Acceptance Criteria:** Modify `ProspectQualifier` to collect retail lead contacts and save them with `is_prospect=True` and `prospect_segment="retail"`, linked to the matching authorized store.
- **Task 139.4: Sidebar Restructure & List Filtering.**
  - **Acceptance Criteria:** Add "Wholesale" and "Retail Referrals" headings to `Sidebar.tsx`, mapping links to segment query parameters. Update React Query keys in contact/account pages to support query invalidation.
- **Task 139.5: Test Suite Alignment.**
  - **Acceptance Criteria:** Refactor `test_whatsapp_campaign.py` and `test_simulated_session_3.py` to assert retail lead CRM generation instead of early termination.
- **Task 139.6: Type Regeneration & Build Verification.**
  - **Acceptance Criteria:** Regenerate types and verify production build.

## Out of Scope for this Sprint
- Form Builders.
- Advanced Conversational AI.
- Multi-branch setup.
- MercadoPago integration.
