# Sherpa – Notion Task Breakdown

Each Epic now includes: goals, priorities, dependencies, user stories, and acceptance criteria.

---

## Epic 1: System Architecture & Infrastructure  
**Goal:** Establish a scalable and secure foundation for the platform.  
**Priority:** P1  
**Dependencies:** None

### Feature 1.1: Architecture Setup  
**User Story:** As a developer, I want a defined architecture so that all services integrate cleanly and scale easily.  
**Acceptance Criteria:**  
- Given the architecture type is selected, when components are configured, then all core services must connect successfully.
- Documentation of architecture must be completed.  
- [ ] Define architecture type (microservices / modular monolith)  
- [ ] Configure backend (FastAPI or NestJS)  
- [ ] Configure frontend (Next.js)  
- [ ] Setup PostgreSQL DB  
- [ ] Setup Redis for cache & queue  
- [ ] Setup S3 / Cloudinary storage  
- [ ] Configure Docker & CI/CD

### Feature 1.2: Environments & Deployment  
**User Story:** As a DevOps engineer, I want separate environments so that releases are stable and tested.  
**Acceptance Criteria:**  
- Given CI/CD is configured, when pushing to main branch, then deploys should occur automatically in staging.  
- Monitoring and logs must be accessible.  
- [ ] Create dev, staging, prod environments  
- [ ] Configure GitHub Actions for CI/CD  
- [ ] Setup monitoring (Sentry, CloudWatch)  
- [ ] Document deploy steps (DEPLOY.md)

---

## Epic 2: Authentication & Authorization  
**Goal:** Secure user access and control feature visibility.  
**Priority:** P1  
**Dependencies:** Epic 1

### Feature 2.1: Auth System  
**User Story:** As a user, I want secure authentication so that only authorized users can access the platform.  
**Acceptance Criteria:**  
- Given valid credentials, when a login request is made, then a JWT should be returned.  
- Given expired tokens, when accessing endpoints, then access should be denied.  
- [ ] Implement JWT (access + refresh)  
- [ ] Setup OAuth2 (Google, Meta)  
- [ ] Secure endpoints with auth middleware

### Feature 2.2: Roles & Permissions  
**User Story:** As an admin, I want to manage roles so that users have access only to relevant features.  
**Acceptance Criteria:**  
- Given user roles, when accessing a restricted endpoint, then authorization must match role permissions.  
- [ ] Define roles: admin, doctor, assistant  
- [ ] Build permissions table  
- [ ] Add role-based middleware  
- [ ] Document permissions logic

---

## Epic 3: Core Modules  
**Goal:** Deliver the essential functional modules for end users.  
**Priority:** P1  
**Dependencies:** Epics 1, 2

### Feature 3.1: Onboarding Wizard  
**User Story:** As a business owner, I want guided onboarding so that I can configure my assistant easily.  
**Acceptance Criteria:**  
- Given onboarding is incomplete, when returning later, then progress should persist.  
- [ ] Build 7-step onboarding flow  
- [ ] Persist user state  
- [ ] Validate each step before advancing  
- [ ] Add progress indicator

### Feature 3.2: Conversations  
**User Story:** As a business owner, I want a conversation inbox so that I can manage AI and manual chats.  
**Acceptance Criteria:**  
- Conversations must link to patient records.  
- Filters must work by type (AI/manual/unread).  
- [ ] Chat UI with inbox  
- [ ] Filter (AI/manual/unread)  
- [ ] Link with patient records  
- [ ] Manual override mode

---

## Additional Enhancements
- Add **Priority Tags (P1, P2, P3)** for planning.
- Include **Dependencies** between epics and features.
- Document **Non-Functional Requirements (NFRs)**:
  - Performance: System must handle 1000 concurrent users.
  - Scalability: Horizontal scaling via container orchestration.
  - Accessibility: WCAG 2.1 compliance.
  - UX: Must support responsive design.

---

## Epic 9: Documentation  
**Goal:** Ensure all aspects of the system are fully documented.  
**Priority:** P1  
**Dependencies:** All Epics

### Feature 9.2: Acceptance Criteria & User Stories  
**User Story:** As a PM, I want each feature to have clear user stories and acceptance criteria so that QA and developers align.  
**Acceptance Criteria:**  
- Every feature must include at least one user story.  
- Each story must include Given/When/Then format.

---

## Epic 12: Customizable Service Catalog
**Goal:** Enable businesses to define a personalized catalog of services with custom attributes.
**Priority:** P2
**Dependencies:** Epic 6

### Feature 12.1: Dynamic Service Model
**User Story:** As a developer, I want a JSONB-backed service model so that I can store heterogeneous service data without migrations.
**Acceptance Criteria:**
- Given a business creates a service, when they add custom attributes (e.g., "Pet Type"), then the data is successfully persisted in the JSONB column.

---

## Epic 13: Extensible CRM Client Profiles
**Goal:** Allow businesses to attach custom data fields to their client records.
**Priority:** P2
**Dependencies:** Epic 7

### Feature 13.1: AI Metadata Extraction
**User Story:** As a business owner, I want the AI to autonomously update client profiles so that my CRM stays enriched without manual entry.
**Acceptance Criteria:**
- Given a client mentions a custom field (e.g., "My dog's name is Rex"), when the AI processes the message, then it triggers 'update_client_metadata' to save "Rex" to the 'Pet Name' field.

---

## Epic 14: Settings Navigation & UI Overhaul
**Goal:** Redesign the Settings module to reduce cognitive load.
**Priority:** P1
**Dependencies:** None

### Feature 14.1: Tabbed Navigation
**User Story:** As a user, I want a clear separation of settings so that I can find configuration options quickly.
**Acceptance Criteria:**
- Given the settings page, when I navigate between tabs, then the URL updates and the specific form renders without a full page reload.

---

## Epic 15: Business-to-Assistant (B2A) Internal Chat
**Goal:** Provide business owners with an internal chat interface to query operational data.
**Priority:** P2
**Dependencies:** Epics 6, 7

### Feature 15.1: Internal Manager AI Persona
**User Story:** As a business owner, I want ask my assistant for reports so that I can manage my day more efficiently.
**Acceptance Criteria:**
- Given I am logged into the dashboard, when I ask "How many clients do I have?", then the AI provides an accurate count based on the database.

---

## Epic 16: Official WhatsApp Integration via Twilio
**Goal:** Implement a professional, multi-tenant WhatsApp connection with human-in-the-loop oversight and cost controls.
**Priority:** P1
**Dependencies:** Epics 5, 9

### Feature 16.1: AI Silent Mode (Human-in-the-Loop)
**User Story:** As a business owner, I want the AI to pause when I manually reply to a client so that we don't send conflicting messages.
**Acceptance Criteria:**
- Given a dashboard user sends a message to a client, when Redis 'silent_mode' is set, then the AI Assistant must not respond to that client for 60 minutes.

### Feature 16.2: Message Credit Engine
**User Story:** As a super admin, I want to limit monthly messages per tenant so that I can maintain platform profitability.
**Acceptance Criteria:**
- Given a tenant reaches 100% of their message limit, when an outbound AI message is triggered, then the system must block the send and notify the tenant.
