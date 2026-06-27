# Handoff State: 2026-06-27 (Epic 140 Backlog Upgrade)

## 🎯 Current Status
We investigated a bug where a new trade vertical user with campaign flow gets the error `"Este servicio no está habilitado..."` in the Live Test Sandbox, Telegram, and WhatsApp. We identified that the root cause is `routing_config` defaulting to an empty dictionary `{}` which strictly disables prospect and distributor flows. Furthermore, the system lacks dynamic checks against the user's `features_config` on these webhooks/sandbox entry points. To address this, we defined and added **Epic 140** to `docs/project/BACKLOG.md` (now fully updated with initialization helper, admin PATCH promotion upgrades, and Alembic database data backfills) to align access controls across all three intake channels.

---

## ✅ Accomplishments
- **Bug Diagnosis**: Fully investigated why new trade vertical users get blocked in webhooks and sandbox.
- **Epic 140 Expansion**: Successfully drafted and expanded Epic 140 ("Feature-Bound Access Control & Intake Alignment") with detailed tasks (140.1 to 140.8) and Given/When/Then acceptance criteria inside `docs/project/BACKLOG.md`.
- **System Hygiene**: Verified that no database schemas or source code files have been modified, per the user's request.

---

## 🚧 Blockers & Risks
- **None**.

---

## 🚀 Next Steps
1. **Implementation Authorization**: Await user authorization to execute Epic 140 tasks (enforcing feature-bound checks in backend API, webhooks routing, sandbox frontend selector UI, dynamic profile defaults, admin vertical promotion patches, and Alembic data backfills).
