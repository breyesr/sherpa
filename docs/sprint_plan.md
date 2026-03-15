# Sprint Plan: March 5 - March 12, 2026

## Objective
Establish Business Profile, Assistant Config, and a functional Onboarding Wizard to gather business data.

## Phase 1: Backend Data Layer (Epic 2)
- **Task 2.2:** Define `BusinessProfile` and `AssistantConfig` models in SQLAlchemy.
  - Acceptance Criteria: `BusinessProfile` stores Name, Category, and Contact info; `AssistantConfig` stores Name, Tone, Greeting, and Working Hours.
- **Task 2.3 & 2.4:** Implement CRUD endpoints for `BusinessProfile` and `AssistantConfig`.
  - Acceptance Criteria: Authenticated users can create/update their business and assistant settings.

## Phase 2: Frontend Onboarding UI (Epic 3)
- **Task 3.1:** Build a 5-step wizard in Next.js.
  - Acceptance Criteria: Step 1 (Info), Step 2 (Assistant), Step 3 (Calendar Link), Step 4 (WhatsApp Link), Step 5 (Activate Trial).
- **Task 3.2:** Connect Step 1 and 2 to the backend endpoints created in Phase 1.
- **Task 3.3:** Implement a simple "Trial" status in the `BusinessProfile` to show trial expiration dates.

## Phase 4: Lead Capture & Scheduling (Epic 9)
- **Objective:** Ensure every chat results in a CRM lead and intelligent booking.
- **Task 9.1:** Modify `AIService` to identify "Anonymous" users and prioritize data collection.
- **Task 9.2:** Implement tool-calling for the AI to save Name/Email into the `Client` table.
- **Task 9.3:** Verify the full loop: Text -> AI asks Name -> AI saves to CRM -> AI books slot.

## Phase 5: Production Readiness
- **Objective:** Mirror Staging fixes to Production and finalize WhatsApp.

## Out of Scope for this Sprint
- Actual Google Calendar OAuth integration.
- Actual WhatsApp Meta API integration.
- Stripe payment processing (test mode).
