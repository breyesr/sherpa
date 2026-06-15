# Technical Pivot Plan: Agentic RAG Architecture

**Document Status:** Pending Review
**Target Epic:** Epic 117 (Agentic RAG Pivot)

## 1. Executive Summary
The current "Thin Agent" architecture, optimized for speed and cost, is failing in real-world B2B scenarios. It relies on a single-pass "Planner" that cannot self-correct when it hallucinates arguments or encounters ambiguous user queries. 

This document outlines the pivot to an **Agentic RAG (Retrieval-Augmented Generation)** architecture. We will trade a minor increase in latency (~8-12s response time) for a massive leap in conversational intelligence, reliability, and data retrieval accuracy.

## 2. Core Architectural Changes

### A. From Thin Agent to Full Agent (ReAct)
*   **Current State:** The system guesses all required tools in one pass (`gpt-4o-mini`), executes them blindly, and passes the results to a synthesizer (`gpt-4o`). If a tool fails, the system fails gracefully but provides no data.
*   **Future State:** We will implement a standard **ReAct (Reason + Act)** loop. 
    *   The Agent thinks: *"I need to know the store. I will call `resolve_entities`."*
    *   The Agent acts.
    *   The Agent observes the result. If it fails, it tries a different search term.
    *   The Agent thinks: *"Now I need their history. I will call `query_knowledge`."*
    *   This loop continues until the Agent has all the data it needs to form a complete, accurate response.

### B. From Separated Tables to Unified Knowledge Corpus
*   **Current State:** The system forces the AI to choose between a fast summary (the `account_intelligence` table) and deep history (the `knowledge_corpus` GraphRAG).
*   **Future State:** We deprecate the `get_account_dossier` tool. We will inject the summary data directly into the `knowledge_corpus` as high-priority "Summary Nodes". The Agent will only have one tool for data retrieval: `query_knowledge`. A single vector search will return both the high-level summary and the specific historical notes requested by the user.

## 3. Toolset Consolidation
The Agent will be given a highly restricted, heavily guarded set of tools to minimize confusion.

1.  **`resolve_entity`**: Maps a colloquial name ("la tiendita") to a UUID.
2.  **`query_knowledge`**: The singular gateway to all data. Searches the unified corpus for summaries, marketing actions, competitor notes, etc.
3.  **`log_field_report`**: Pushes new observations into the ingestion queue.
4.  **`manage_calendar`**: Handles availability and booking.

## 4. Phased Implementation Strategy

### Phase 1: Corpus Unification (Data Layer)
1.  Write a script to migrate existing `AccountIntelligence` dossiers into the `KnowledgeCorpus` table.
2.  Tag these new records with a specific metadata flag (e.g., `node_type: "dossier_summary"`).
3.  Deprecate the `account_intelligence` table and the `get_account_dossier` tool.

### Phase 2: Agent Framework Implementation (Logic Layer)
1.  Remove the `thin_agent_planner.j2` and the `_execute_plan` methodology from `B2BOrchestrator`.
2.  Implement a `ReActAgent` class using `litellm` (or a lightweight custom loop) that supports:
    *   **Max Iterations**: Cap the loop at 5 iterations to prevent infinite reasoning loops.
    *   **Observation Injection**: Feed tool errors directly back to the LLM so it can self-correct.
3.  Define strict Pydantic schemas for the consolidated tools to enforce argument structures.

### Phase 3: Persona & Prompt Engineering (UX Layer)
1.  Rewrite the `b2b_sales_brain.j2` System Prompt to act as the overarching instruction set for the ReAct Agent.
2.  Ensure the prompt heavily emphasizes conversational, peer-to-peer prose over rigid dashboard formatting.

## 5. Cost and Performance Projections
| Metric | Current (Thin Agent) | Future (Agentic RAG) | Delta |
| :--- | :--- | :--- | :--- |
| **Avg Latency** | ~4.5 seconds | ~9.0 seconds | +4.5s (Acceptable for B2B) |
| **Avg Tokens/Turn**| ~2,500 tokens | ~4,500 tokens | +80% |
| **Est. Cost/1k chats**| ~$11.00 | ~$18.00 | +$7.00 |
| **Resolution Accuracy**| ~60% | ~95%+ (Self-correcting) | **Critical Improvement** |

## 6. Rollback Plan
If the latency proves completely unacceptable in field testing, we will retain the `ThinAgentOrchestrator` code in a separate module (`orchestrator_legacy.py`). We can revert routing logic via an environment variable flag (`USE_REACT_AGENT=False`).
