# Diagnostic Audit: B2B AI Workflow Performance

**Date:** 2026-06-15
**System Version:** Sherpa B2B V2 (Deterministic Orchestrator)

## 1. Executive Summary
The current B2B AI workflow uses a **Deterministic Router-Worker Pattern**. While it successfully handles high-confidence requests (e.g., explicit store briefing), it fails in scenarios involving semantic ambiguity, multi-intent messages, and proactive discovery. The "one-shot" intent classification acts as a bottleneck, forcing the system into a single logic path even when multiple tools are required.

## 2. Key Findings

### A. Intent Anchoring (The "Single-Path" Problem)
*   **Observation**: The `B2BOrchestrator` classifies a message into exactly ONE intent (REPORT, QUERY, SCHEDULE, CHAT).
*   **Failure Mode**: If a user says *"I'm at Tienda La Norteña and they are out of stock on plumbing"* the system must choose between `QUERY` (to get the brief) and `REPORT` (to log the stock issue). 
*   **Impact**: In recent audits, 100% of analyzed messages were forced into one path, often skipping valuable secondary actions.

### B. Resolution Brittleness
*   **Observation**: The `EntityResolver` is called *before* LLM reasoning.
*   **Failure Mode**: If the resolver fails to match a store name (e.g., typo or partial name), the orchestrator defaults to `GLOBAL` scope or `CHAT` intent.
*   **Impact**: Users receive generic responses instead of the system proactively asking for clarification or searching harder.

### C. Latent Reasoning Traces
*   **Observation**: Reasoning traces in the database are sparse and often reflect the *result* of the routing rather than the *process* of problem-solving.
*   **Failure Mode**: Difficult to debug why a specific store was or wasn't "locked."

## 3. Failure Mode Examples
| User Message | Current Routing | Actual Need | Failure Cause |
| :--- | :--- | :--- | :--- |
| "Hoy tengo cita con Doña María qué sabemos de..." | `QUERY` (LOCAL) -> Utility Dossier | Resolve "Doña María" -> Find Store -> Load Dossier -> Identify Service | Success (but fragile) |
| "Súper Mercadito está vendiendo más que antes" | `REPORT` -> Background Ingestion | Log Report AND Ask "Why do you think so?" | Path Termination (System just says "Processed") |
| "Quiero agendar para mañana con ellos" | `SCHEDULE` -> Date/Time Tool | Resolve "ellos" (Context) -> Check Calendar -> Book | Context dependence fails if "lock" is lost |

## 4. Conclusion
The current architecture has reached its limit for complex B2B Trade scenarios. To fulfill the "Marco" persona (the proactive sales intelligence partner), the system must move from **Routing** to **Reasoning**.
