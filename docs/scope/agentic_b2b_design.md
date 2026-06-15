# Technical Design Doc: Thin Agent B2B Orchestrator (Predictive Planning)

**Status:** Draft / Approved
**Author:** AI Engineering / Gemini CLI
**Target Implementation:** Epic 116 (Thin Agent Pivot)

## 1. Objective
Replace the deterministic `B2BOrchestrator` with a **Thin Agent** architecture. This model uses a predictive planning phase to sequence multiple tool calls in a single turn, providing the multi-step intelligence of an agent with the low latency and reliability of a structured workflow.

## 2. Proposed Architecture: The Two-Step Planning Pattern

### 2.1 The Workflow
1.  **Phase 1: The Planner (LLM Call 1)**
    *   **Input**: User message, conversation history, and **Tool Definitions** (JSON Schema).
    *   **Model**: `gpt-4o-mini` (Optimized for speed/cost).
    *   **Output**: A list of tool calls to execute (e.g., `[resolve_entity, get_dossier, log_field_note]`).
2.  **Phase 2: Execution (Deterministic)**
    *   System executes all selected tools in parallel or sequence.
    *   Results are collected into a **Context Package**.
3.  **Phase 3: The Synthesizer (LLM Call 2)**
    *   **Input**: User message + Context Package (Tool results) + Persona Guidelines ("Marco").
    *   **Model**: `gpt-4o` (Optimized for reasoning and personality).
    *   **Output**: Final conversational response to the representative.

### 2.2 Toolset (Existing & New)
| Tool Name | Capability | Status |
| :--- | :--- | :--- |
| `resolve_entity` | Maps names/pronouns to Store/Contact IDs | Refactor from `EntityResolver` |
| `get_account_dossier` | Fetches the pre-compiled `AccountIntelligence` JSON | Existing |
| `query_knowledge` | Performs semantic search over GraphRAG/Vector DB | Existing |
| `log_field_note` | Triggers background ingestion for field reports | Refactor from `process_b2b_ingestion` |
| `manage_calendar` | Wraps all scheduling/availability functions | Refactor from `AIService` tools |

## 3. Implementation Plan

### Phase 1: Tool Decoupling (Task 116.1)
*   Standardize all B2B logic into "Tools" that accept and return JSON.
*   Ensure tools handle errors gracefully so the Synthesizer can explain failures.

### Phase 2: Orchestrator Refactor (Task 116.2)
*   Implement `ThinAgentOrchestrator`.
*   Integrate tool-calling schema generation.
*   Implement the two-pass LLM logic using LiteLLM.

### Phase 3: Monitoring & Costs (LLMOps)
*   Track "Plan vs. Execution" success rates.
*   Monitor token usage for the Planner vs. Synthesizer.

## 4. Comparison vs. Full Agent
| Metric | Full Agent (ReAct) | Thin Agent (Proposed) |
| :--- | :--- | :--- |
| **Latency** | 6-12 seconds | 3-5 seconds |
| **Cost** | ~$25 / 1k chats | ~$11 / 1k chats |
| **Stability** | Risk of loops | Highly deterministic |

## 5. Success Metrics
*   **Multi-Task Accuracy**: % of messages requiring 2+ tools that are correctly planned.
*   **Latency Ceiling**: 95th percentile response time < 5 seconds.
*   **Reasoning Quality**: User rating of the "Marco" persona's proactivity.
