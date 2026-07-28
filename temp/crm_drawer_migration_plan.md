# Migration Plan: B2C Client CRM Drawer

This plan details the steps to migrate the B2C Client Creation and Edit interface in `/crm` from a pop-up modal (`ClientModal.tsx`) to a side-sliding drawer (`ClientDrawer.tsx`). This aligns the B2C interface with the rest of the Sherpa application's drawer-based patterns.

---

## 1. Design & Component Architecture

### The Migration Approach
To preserve all features (such as dynamic custom CRM fields, B2B details, and AI briefs/reports) while aligning the layout, we will:
1. **Create a new component `ClientDrawer.tsx`** in `frontend/components/v2/`.
2. **Utilize the shared `Drawer` layout wrapper** (`frontend/components/v2/Drawer.tsx`), which provides the standard backdrop, sliding animations, and full-height scroll areas.
3. **Migrate the form state and query logic** from `ClientModal.tsx` to `ClientDrawer.tsx`.
4. **Update `ClientCRM.tsx`** to import and render `ClientDrawer` instead of `ClientModal`.

---

## 2. Component Mapping (Modal to Drawer)

| Feature / UI Element | Modal Implementation (`ClientModal.tsx`) | Drawer Implementation (`ClientDrawer.tsx`) |
| :--- | :--- | :--- |
| **Wrapper** | Center overlay `fixed inset-0 bg-black/50 flex items-center justify-center` | Right-side overlay via imported `Drawer` component |
| **Width & Height** | Restricted `max-w-md` / `max-w-2xl` and `max-h-[90vh]` | Responsive `md:w-[500px]` (standard) / `md:w-[700px]` (wide when Trade Context is active), full screen height |
| **Scroll Container** | `overflow-y-auto` wrapping entire panel | Built-in `flex-1 overflow-y-auto` content container |
| **Actions Footer** | Scrollable at the bottom of the form | Fixed `shrink-0` bottom footer panel, always visible |

---

## 3. Step-by-Step Implementation Steps

### Step 1: Create `ClientDrawer.tsx`
* Create `frontend/components/v2/ClientDrawer.tsx`.
* Import the base `Drawer` component:
  ```typescript
  import Drawer from './Drawer';
  ```
* Copy form state, API submit handlers, dynamic custom fields loops, and AI briefing triggers from `ClientModal.tsx`.
* Wrap the contents in `<Drawer>` instead of the floating `<div className="fixed ...">`.
* Place the action buttons (Save/Delete) in the `footer` prop of `<Drawer>` to keep them fixed to the bottom of the screen.

### Step 2: Integrate in `ClientCRM.tsx`
* Replace `ClientModal` imports and tags in `frontend/app/crm/ClientCRM.tsx`:
  ```diff
  - import ClientModal from '@/components/ClientModal';
  + import ClientDrawer from '@/components/v2/ClientDrawer';
  ```
  ```diff
  - <ClientModal
  -   isOpen={isModalOpen}
  -   onClose={() => { ... }}
  -   ...
  - />
  + <ClientDrawer
  +   isOpen={isModalOpen}
  +   onClose={() => { ... }}
  +   ...
  +   size={selectedClient && business?.vertical_type === 'TRADE' ? 'wide' : 'standard'}
  + />
  ```

### Step 3: Run Validation & Compilation
* Run `npm run build` in the frontend directory to ensure zero compilation or TypeScript type errors.
* Verify user interactions on the CRM panel locally.
