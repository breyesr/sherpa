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

## Out of Scope for this Sprint
- Form Builders.
- Advanced Conversational AI.
- Multi-branch setup.
- MercadoPago integration.
