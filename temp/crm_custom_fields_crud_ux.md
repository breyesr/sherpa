# UX/UI Evaluation: Dynamic CRM Fields CRUD Management

This document provides a UX/UI evaluation for introducing a **"Manage Fields"** feature inside the client creation/profile drawer, allowing business admins to view, edit, and delete custom fields inline.

---

## 1. Interaction Design: Stacked Drawer vs. Sub-panel View

When a user clicks "Manage Fields" inside the active `ClientDrawer`, we have two major interaction options:

### Option A: Stacked Drawers (Nested Sheets)
Clicking "Manage Fields" slides a second, slightly smaller drawer on top of the first one (from the right).

```
+---------------------------------------+
| Dashboard > CRM                       |
|  +------------------+-----------------|
|  | Client Profile   | Manage Fields   | <- Stacked Sheet
|  | Gerardo Reyes    |                 |
|  |                  | [x] Pet Name    | <- Delete field
|  | [Phone Input]    | [x] Anniversary |
|  |                  |                 |
|  |                  | [ + Add Field ] |
|  | [Manage Fields]  |                 |
|  +------------------+-----------------|
+---------------------------------------+
```

*   **Pros**:
    *   **Context Preservation**: The user can see that the client creation/edit drawer is still open underneath, maintaining a clear spatial relationship.
    *   **Separate Files**: The custom fields management logic remains modular in its own component (e.g., `ManageFieldsDrawer.tsx`), avoiding bloating `ClientDrawer.tsx`.
*   **Cons**:
    *   **Visual Heavyweight**: Stacked overlays can feel cluttered on smaller screens if not styled carefully (requires a dimming backdrop for the secondary sheet, or shifting the first sheet slightly to the left).

---

### Option B: Sub-panel Transition (Inner View State)
Instead of opening a new drawer, the contents of the *existing* drawer slide left, replaced by the "Manage Fields" dashboard, with a "Back to Client Profile" header.

*   **Pros**:
    *   **Fluid & Minimalist**: A single modal container handles the navigation. It feels lightweight, resembling mobile screen transitions.
    *   **Ergonomically clean**: Avoids stacking multiple semi-transparent backdrops.
*   **Cons**:
    *   **Context Disconnection**: The client profile form inputs are temporarily hidden. If the user had unsaved changes in the client form, we must keep them in state while they manage fields.

---

## 2. CRUD Operations & Database Safety Warnings

Managing CRM schema dynamically requires warnings to prevent data loss or structural errors:

| Action | Description | UX/UI Guardrail / Warning |
| :--- | :--- | :--- |
| **Create** | Appending a new field to `crm_config`. | *(Already implemented)* Ensure label is capitalized and key is automatically converted to snake_case. |
| **Read** | View list of existing custom fields. | Show the key name alongside the label so technical users understand the underlying API mapping (e.g., `Pet Name (pet_name)`). |
| **Update** | Modifying a field's Label. | Allow changing the display label (e.g., "Pet Name" to "Dog Name") safely without altering the database key (`pet_name`), preventing data mismatch. |
| **Delete** | Removing the field config from `crm_config`. | **CRITICAL WARNING**: Explain that deleting the field hides it from forms, but does *not* erase historical client values from the database (it stays in client JSON as metadata). Show warning: *"Are you sure? This will hide this field across all client files."* |

---

## 3. Recommended Design Choice

I recommend **Option A (Stacked Drawers)** because:
1. It maintains a clean division of concerns in code. `ClientDrawer` deals with a single client's record, while `ManageFieldsDrawer` deals with the business's CRM configuration.
2. It allows users to quickly inspect the configuration, close it, and instantly see the fields updated on the client form underneath.
