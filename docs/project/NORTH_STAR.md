# Sherpa B2B: The North Star Vision

## 🎯 The Core Mission
To empower B2B sales representatives with a "Digital Brain" that handles the friction of data entry and provides strategic, contextual intelligence in the field.

---

## 🧑‍💻 The "Marco" Experience (The Goal)
Imagine a Sales Rep named **Marco** in B2B trade distribution:

1.  **Seamless Ingestion:** After a visit to "Distribuidora Central," Marco sends a WhatsApp voice note: *"Carlos (the owner) is worried about Competitor ABC's prices on key products. He's interested in our new product line but needs a 5% discount."*
2.  **Autonomous Structure:** The system parses this, updates Carlos's contact info, logs the "Competitor Risk," creates a "Lead" for the product line, and schedules a follow-up.
3.  **Contextual Briefing:** A week later, before walking into "Distribuidora Regional," Marco texts: *"Status?"*
4.  **Strategic Insight:** The system replies: *"Distribuidora Regional is your top regional account. Note: Your nearby client Distribuidora Central is feeling price pressure from this store. Suggest a volume deal for Regional on core lines to keep them dominant while maintaining your margin."*

---

## 🏗️ The 3-Layer Architecture

### Layer 1: The Memory (Session 1)
*   **Purpose:** A hybrid database (Relational + Vector) that stores "Hard Data" (Orders, Contacts) and "Soft Data" (Nuance, Risks, Opportunities).
*   **Tech:** PostgreSQL + `pgvector`.

### Layer 2: The Ear (Session 2)
*   **Purpose:** The Ingestion Engine. Turning unstructured messaging (Voice/Text) into structured relational updates.
*   **Tech:** LLM Entity Extraction + Orchestrator Service.

### Layer 3: The Brain (Session 3)
*   **Purpose:** The GraphRAG Engine. Connecting the dots between different stores, competitors, and historical notes to provide synthesized strategy.
*   **Tech:** Vector Similarity Search + SQL Join Logic.

---

## 🛠️ The Implementation Roadmap
1.  **Foundation:** Build the Hybrid Memory (Database).
2.  **Input:** Build the Ear (Ingestion Bot).
3.  **Insight:** Build the Brain (GraphRAG Engine).
4.  **Utility:** Build the Hands & Eyes (Calendar & Dashboard).
