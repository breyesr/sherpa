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

# Next Steps
1. OrderDrawer: reset `headerData.store_id` on open when no `preselectedStoreId` (stale store risk).
2. Normalize drawer z-index per stack position in `Drawer.tsx`.
3. Epic 161 Phase 1 (161.1-161.3); 161.4 requires migration approval.
4. Write neutral, non-destructive `seed_dummy_if_empty.py` with production guard (Docker required). Do NOT run `seed_demo_construction.py`.
5. Map hardcoded Dashboard strings via `useTerminology`.
