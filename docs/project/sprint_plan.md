# Modular Pivot Sprint Plan (Trade Vertical)

This document outlines the execution roadmap for transitioning Sherpa into a modular platform, specifically implementing the **Trade** module while preserving the **Basic** scheduler.

## Sprint 1: Modular Foundation & Data Gateway (COMPLETE)
**Goal:** Establish the architectural "Plug & Play" switch and the ingestion engine.

- [x] **Task 1.1 (BE):** Schema Migration for `vertical_type` (Enum: BASIC, TRADE).
- [x] **Task 1.2 (BE):** Implementation of the 1:N `Agent` architecture.
- [x] **Task 1.3 (BE):** Build the **Universal Data Gateway** core.
- [ ] **Task 1.4 (BE/Worker):** Implement the Celery background worker for CSV/Bulk processing.
- [ ] **Task 1.5 (FE):** Create the "Data Import Center" UI for CSV uploads.

## Sprint 2: Trade Relational Foundation (The Dossier) (COMPLETE)
**Goal:** Implement the specific Trade schema and Store-centric CRM.

- [x] **Task 2.1 (BE):** Implement `Store`, `Store_notes`, and `Competitors` tables.
- [x] **Task 2.2 (BE):** Implement `Orders`, `Products`, and `Categories` tables.
- [x] **Task 2.3 (BE):** Implement `Customer` and `Customer_Notes`.
- [x] **Task 2.4 (FE):** Build the **Store Management Dashboard**.
- [x] **Task 2.5 (FE):** Build the **Product Catalog & Order History** views.

## Sprint 3: Multi-Channel AI Constellation (COMPLETE)
**Goal:** Deploy specialized agents across WhatsApp and Telegram.

- [ ] **Task 3.1 (AI):** Implement the **Multi-Agent Router**.
- [x] **Task 3.2 (AI):** Build the **Visit Briefer Agent**.
- [x] **Task 3.3 (AI):** Build the **Lead Qualifier Agent**.
- [ ] **Task 3.4 (AI):** Build the **Post-Visit Chronicler**.
- [x] **Task 3.5 (BE):** Standardize cross-platform ID mapping.

## Sprint 4: Modular UI & Hardening (CURRENT)
**Goal:** Finalize the "Plug & Play" experience and user acceptance.

- [x] **Task 4.1 (FE):** Implement **Dynamic Sidebar & Navigation** (Toggles visibility based on `vertical_type`).
- [ ] **Task 4.2 (FE):** Build the **Lead Scoring Dashboard** (Visualization of sale-closeness scores).
- [ ] **Task 4.3 (FE/BE):** Build the **Admin Scoring Control Panel**.
- [ ] Task 4.4 (UX): Run full User Acceptance Testing (UAT).
- [x] Task 4.5 (DevOps): Final CI/CD validation and load testing (Frontend Zero Noise pass).
- [ ] Task 4.6 (FE): Architectural Refactor: Split Trade Hub into dedicated Dashboard, Stores, and Retailers views.

## Sprint 5: Action Strategy Desk & Navigation Consolidation (CURRENT)
**Goal:** Transition actions to a template-driven accountability workflow and establish clean, promoted V2 routes for Accounts, Contacts, Products, and Orders.

- [ ] **Task 121.1 (BE):** Database Migrations & Models (Define `ActionTemplate` and enrich `StoreAction`).
- [ ] **Task 121.2 (BE):** Template & Action CRUD APIs (`/trade/action-templates` and `/trade/actions`).
- [ ] **Task 122.1 (FE):** Deprecate V1 routes, promote V2 routes to standard `/trade/*` directories, and update `Sidebar.tsx`.
- [ ] **Task 122.2 (FE):** Build Product Catalog Dashboard and Details Drawer.
- [ ] **Task 122.3 (FE):** Build Orders Ledger Dashboard and Details Timeline.
- [ ] **Task 121.3 (FE):** Build Action Catalog Configuration UI (Settings).
- [ ] **Task 121.4 (FE):** Build Strategy Desk & Outcome Resolution UI.
- [ ] **Task 135.1 (FE):** Information Architecture & Navigation Realignment (Segment B2B Hub, Prospects, and Products).

## Sprint 6: Dynamic UI Personalization (NEXT)
**Goal:** Tailor page modules, metrics, tabs, and headings to the business features config on `/trade/stores` and `/trade/stores/[id]`.

- [x] **Task 162.1 (FE):** Dynamic Headings & Columns on `/trade/stores` (Accounts list).
- [x] **Task 162.2 (FE):** Conditionally render detail page tabs & KPI panels on `/trade/stores/[id]`.
- [x] **Task 162.3 (FE):** Update back-navigation breadcrumbs and breadcrumb routing sync.

## Sprint 7: Prospecting Flow Simplification & Lead Unification (NEXT)
**Goal:** Simplify prospecting sidebar links and unify the separate accounts and contacts views into a single "Prospects" listing and side-by-side details page.

- [ ] **Task 163.1 (FE):** Sidebar Navigation Simplification (Collapse to Prospects & Orders).
- [ ] **Task 163.2 (FE):** Unified Prospects List Page (Rename page & add Contact columns).
- [ ] **Task 163.3 (FE):** Dedicated Unified Details View `/trade/prospects/[id]`.
- [ ] **Task 163.4 (FE):** Update order page store details links to `/trade/prospects/[id]`.



