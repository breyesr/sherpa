# Project Rules

## Merging & Branching
- **Staging Merge Protocol**: ALWAYS ask for explicit user permission and confirmation before initiating any merge operations into the `staging` branch. This is a non-negotiable safety guardrail.

## UI & Terminology Standards
- **Simplified Naming Conventions**: Avoid abstract or technical jargon (like "Blueprint") when designing tasks and playbooks for B2B Trade CRM flows. Prioritize obvious terms understood by trade business reps (e.g., **Action Template**, **Task Objective**, **Select Action**).
- **Dynamic Objective Mappings**: When working with the standard set of 8 store action objectives, ensure the following simplified labels are used consistently on the UI:
  * `THREAT_RESPONSE` -> `Competitive Response`
  * `SHARE_OF_SHELF` -> `Shelf Presence Check`
  * `NEW_PRODUCT_INTRODUCTION` -> `Launch New Product`
  * `INVENTORY_VELOCITY_OOS_PREVENTION` -> `Prevent Stockouts`
  * `PERFECT_STORE_ASSORTMENT_COMPLIANCE` -> `Store Standards Check`
  * `SEASONAL_EVENT_ACTIVATION` -> `Seasonal Promotion`
  * `TRADE_LOYALTY_VOLUME_PUSHING` -> `Drive Larger Orders`
  * `POSM_MAINTENANCE_ASSET_PURITY` -> `Maintain Promo Materials`
- **Client-Side Label Prioritization**: In frontend mapping arrays (e.g., `objectiveMap`), always spread the client-side friendly default map *last* (e.g., `...defaultObjectiveMap`). This ensures that client-side user-friendly labels override stale database values or raw system keys, preventing raw keys from leaking into the UI.

