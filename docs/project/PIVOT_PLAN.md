# Sherpa B2B Pivot: 5-Session Implementation Plan

> ⚠️ **HISTORICAL SNAPSHOT**: This document records the original 5-session B2B pivot strategy. The pivot has been fully executed. For current architecture, consult [`../HANDOFF_GUIDE.md`](../HANDOFF_GUIDE.md).

## Overview
This document outlines the step-by-step evolution of Sherpa from a B2C scheduling assistant to a B2B Sales Intelligence platform.

---

## Session 1: The B2B Foundation (Database & Infra)
*   **Goal:** Set up the "Brain" and the "Memory" of the new system.
*   **Tasks:**
    *   Initialize `pgvector` in our Postgres database.
    *   Create the core B2B models: `Store` (Accounts), `Customer` (Contacts), `Products`, `Categories`, and `Competitors`.
    *   Create the Intelligence models: `Store_Notes` and `Customer_Notes` (these will have the vector columns for the AI).
    *   **The Tweak:** Update the `Appointment` model so it can "talk" to these new B2B entities.
*   **Outcome:** A fully migrated database ready for Sales Intelligence.

## Session 2: The Ingestion Bot (Recording Field Intelligence)
*   **Goal:** Turn a messy WhatsApp message into structured data.
*   **Tasks:**
    *   Build the **Orchestrator**: A new service that decides if a message is a "Report" or a "Query".
    *   Build the **Ingestion Agent**: A prompt pipeline that extracts JSON from the rep's text/audio (e.g., extracting competitor names or store risks).
    *   Logic to save these notes and generate their AI embeddings (vectors) automatically.
*   **Outcome:** A rep can text the bot after a visit, and the database updates itself.

## Session 3: GraphRAG (The "Briefing" Engine)
*   **Goal:** Let the rep "talk" to their data.
*   **Tasks:**
    *   Implement **Similarity Search**: Querying the vector notes based on the rep's question.
    *   Implement **SQL Joins**: Combining those notes with "Hard Data" (last orders, contact names, competitor lists).
    *   **Briefing Prompt:** A specialized AI prompt that synthesizes all of this into a 3-paragraph summary for the rep.
*   **Outcome:** A rep texts "Give me the brief on Store X," and gets a deep, contextual summary instantly.

## Session 4: Scheduling & Routing
*   **Goal:** Manage appointments in a B2B context.
*   **Tasks:**
    *   Update our Scheduling tools to allow booking visits specifically for a `Store` or `Customer`.
    *   Ensure the Google Calendar sync reflects the Store Name/Address in the event.
*   **Outcome:** The calendar feature is now a "Visit Router" for the sales team.

## Session 5: The Command Center (Frontend Transformation)
*   **Goal:** A dashboard that feels like a Sales Tool, not a hair salon bot.
*   **Tasks:**
    *   Rename the CRM UI: "Clients" → "Accounts & Contacts".
    *   Build the **Intelligence Timeline**: A visual feed of all AI-parsed notes for a store.
    *   Update modals and filters to handle B2B segments (Regions, Markets).
*   **Outcome:** A finished B2B Sales Intelligence platform.
