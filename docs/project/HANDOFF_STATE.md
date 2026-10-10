# Current State
- `feature/day1-ux-refactoring` branch active. tsc clean as of 2026-10-10.
- `/trade` routing consolidated (`/trade/operations`, `/trade/entities`, `/trade/catalog`). Legacy `/trade/*` routes deleted. Sidebar links updated.
- `frontend/lib/store/DrawerManager.ts`: stack-based (nested drawers), typed `DrawerPayloads` map (no `any`), payloads persist after close. Exposes `useDrawerStore` and `useDrawer(type)`.
- `frontend/components/v2/DrawerHost.tsx` mounted once in `app/layout.tsx`. Global `Escape` closes top drawer.
- Drawer migration COMPLETE (batches 1-3): Order, FieldNote, Contact, Category, Catalog, Account, Client, ManageFields, ManageAttributes, ManageCatalogAttributes, Service, Appointment. `AddAppointmentModal` deleted -> `AppointmentDrawer`.
- `frontend/lib/dictionary.ts` + `frontend/hooks/useTerminology.ts` drive bilingual B2B terminology. Store/Account labels localized on trade dashboard, retailer and store detail pages.
- `backend/app/core/ai_service.py`: fixed `is_new` UnboundLocalError when client already exists.
- Known regression: `/services` no longer shows a success toast after service CRUD (ServiceDrawer is global; owns query invalidation).
- Uncommitted local-only change intentionally NOT committed: `backend/scripts/data_ops/seed_demo_construction.py` (checkpoint cleanup removed for empty local DB).
- Dev ops gotcha: deleting a component file while `next dev` runs can corrupt Webpack cache -> `rm -rf .next && npm run dev`.

# Next Steps (scope: strictly UX/UI — see BACKLOG Epic 227)
1. 227.1 OrderDrawer reset-on-open.
2. 227.2 Drawer z-index by stack position.
3. 227.3 Global toast system (user-mandated, do not drop).
4. 227.4 Dashboard terminology via `useTerminology`.
5. 227.5 Drawer behavior on route change.
- Out of scope for this branch: Epic 161, seed scripts, backend work.
