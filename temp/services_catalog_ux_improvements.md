# UX/UI Evaluation: `/services` Catalog Improvements

This document evaluates the usability, consistency, and feature depth of the Service Catalog (`/services`), suggesting visual alignments and structural enhancements based on the drawer patterns introduced in `/crm`.

---

## 1. Current Usability & Layout Gaps

1.  **Layout Inconsistency (Inline Form)**:
    *   Currently, clicking "Add Service" or "Edit Service" opens an inline nested form inside the main page flow (`bg-gray-50 p-6`). This pushes the catalog cards down, altering page heights and breaking structural consistency.
2.  **Unused Custom Attributes (`attributes: {}`)**:
    *   The service schema supports a JSON `attributes` column. However, there is no interface in the catalog creator to input, view, or manage these service attributes.
3.  **Basic Catalog Card Design**:
    *   Services are currently rendered in a simple list. For service-based businesses, a premium card grid representing services as professional booking catalog cards (showing duration, pricing, and visual tags) improves administrative clarity.

---

## 2. Proposed Improvements

### A. Migrate Service Creation to `ServiceDrawer`
*   **Behavior**: Clicking "Add Service" or a card's "Edit" action opens a right-side sliding **Drawer** (`ServiceDrawer.tsx`), matching the client drawer and prospecting flows.
*   **Benefits**: Keeps the service catalog list view static and readable. The fixed bottom footer pins the "Save Changes" and "Delete Service" buttons for better ergonomics.

```
+-----------------------------------------------------------+
| Dashboard > Services                                      |
+---------------------------------------+-------------------|
|                                       | [X] Close Drawer  |
|  [Add Service Button]                 |                   |
|                                       | Add New Service   |
|  +---------------------------------+  | ----------------- |
|  | Premium Haircut   | $35.00      |  | Service Name      |
|  |                   | 45 mins     |  | [ Haircut       ] |
|  +---------------------------------+  |                   |
|  | Facial Grooming   | $20.00      |  | Price     Duration|
|  |                   | 30 mins     |  | [ 35.00 ] [ 45  ] |
|  +---------------------------------+  |                   |
|                                       | [Save Changes]    |
+---------------------------------------+-------------------|
```

---

### B. Implement Dynamic "Service Attributes" (Custom Fields)
*   **Behavior**: Just as we did for Client profiles, let's allow service providers to configure dynamic metadata fields for their services (e.g. `Hardware Required`, `Room Location`, `Level of Expert Required`).
*   **Execution**:
    *   Add an **"Additional Details"** section in `ServiceDrawer.tsx` that maps through configured service attributes.
    *   Support the new field types (**Date, Dropdown, Textarea, Checkbox**) to allow rich catalog definition.

---

### C. Revamped Catalog Grid View (Visual Wow)
Instead of a listing block, render services as premium cards with clear visual tags:

*   **Duration Badge**: Rounded blue/gray pill displaying the clock icon + duration (e.g. `[Clock] 45 mins`).
*   **Price Suffix Tag**: High-contrast bold numeric display in local currency (e.g. `$35.00 MXN`).
*   **Inline Actions**: Subtle hover actions (Edit, Delete) in the top-right corner to keep the cards focused on service summaries.
