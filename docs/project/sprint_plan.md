# Modular Pivot Sprint Plan (Trade Vertical)

This document outlines the execution roadmap for transitioning Sherpa into a modular platform, specifically implementing the **Trade** module while preserving the **Basic** scheduler.

## Sprint 1: Modular Foundation & Data Gateway
**Goal:** Establish the architectural "Plug & Play" switch and the ingestion engine.

- **Task 1.1 (BE):** Schema Migration for `vertical_type` (Enum: BASIC, TRADE).
- **Task 1.2 (BE):** Implementation of the 1:N `Agent` architecture (refactoring from 1:1 `AssistantConfig`).
- **Task 1.3 (BE):** Build the **Universal Data Gateway** core (REST API for external ingestion).
- **Task 1.4 (BE/Worker):** Implement the Celery background worker for CSV/Bulk processing.
- **Task 1.5 (FE):** Create the "Data Import Center" UI for CSV uploads and field mapping.

## Sprint 2: Trade Relational Foundation (The Dossier)
**Goal:** Implement the specific Trade schema and Store-centric CRM.

- **Task 2.1 (BE):** Implement `Store`, `Store_notes`, and `Competitors` tables.
- **Task 2.2 (BE):** Implement `Orders`, `Products`, and `Categories` tables.
- **Task 2.3 (BE):** Implement `Customer` and `Customer_Notes` (Linked to Basic `Clients`).
- **Task 2.4 (FE):** Build the **Store Management Dashboard** (CRUD for stores and notes).
- **Task 2.5 (FE):** Build the **Product Catalog & Order History** views.

## Sprint 3: Multi-Channel AI Constellation
**Goal:** Deploy specialized agents across WhatsApp and Telegram.

- **Task 3.1 (AI):** Implement the **Multi-Agent Router** (Logic to switch between agents based on intent).
- **Task 3.2 (AI):** Build the **Visit Briefer Agent** (Pre-appointment store briefings via WA/TG).
- **Task 3.3 (AI):** Build the **Lead Qualifier Agent** (Adjustable scoring engine based on Trade metrics).
- **Task 3.4 (AI):** Build the **Post-Visit Chronicler** (Automatic summary of chats into `Customer_Notes`).
- **Task 3.5 (BE):** Standardize cross-platform ID mapping (linking WhatsApp/Telegram IDs to Trade Customers).

## Sprint 4: Modular UI & Hardening
**Goal:** Finalize the "Plug & Play" experience and user acceptance.

- **Task 4.1 (FE):** Implement **Dynamic Sidebar & Navigation** (Toggles visibility based on `vertical_type`).
- **Task 4.2 (FE):** Build the **Lead Scoring Dashboard** (Visualization of sale-closeness scores).
- **Task 4.3 (FE/BE):** Build the **Admin Scoring Control Panel** (Adjust weights/metrics for lead qualification).
- **Task 4.4 (UX):** Run full User Acceptance Testing (UAT) for the "Basic -> Trade" upgrade flow.
- **Task 4.5 (DevOps):** Final CI/CD validation and load testing for the new relational structure.
