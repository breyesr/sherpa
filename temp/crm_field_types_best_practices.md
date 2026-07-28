# UX/UI Evaluation: Custom Field Types & Best Practices

This document evaluates the addition of **Date** and **Dropdown** field types, along with recommendations for other standard custom field types to maximize CRM usability and clean data ingestion.

---

## 1. Implementing Dropdown & Date Field Types

### A. Date Type
*   **User Interface**: Replaces the generic text box with a native HTML date picker (`<input type="date" />`).
*   **Database Mapping**: Saved as an ISO string (`YYYY-MM-DD`) inside the client's `custom_fields` JSON block.
*   **Best Practice**: Always store dates in UTC ISO format to support clean timezone translation and scheduling automation.

### B. Dropdown (Single Select) Type
*   **User Interface**: Renders as a select dropdown (`<select>`) or a search-combobox.
*   **Configuration**: Requires the admin to input a list of comma-separated options (e.g. `Hot, Warm, Cold` or `Wholesale, Retail`) when creating the custom field.
*   **Database Mapping**: Saved as a string matching the selected option inside `custom_fields`.
*   **Structure**: 
    ```typescript
    interface DropdownField {
      key: string;
      label: string;
      type: 'dropdown';
      options: string[]; // ['Hot', 'Warm', 'Cold']
    }
    ```

---

## 2. Recommended Best Practice Field Types

To make the CRM highly professional and robust, we recommend supporting the following three additional field types:

### 1. Rich Text / Textarea (`textarea`)
*   **Why**: Sometimes admins need to save paragraphs of information (e.g. "Special Delivery Instructions", "Customer Backstory") that would wrap and overflow a single-line input field.
*   **UI Representation**: Renders as a multi-line `<textarea className="h-20 ...">` field.

### 2. Multi-Select Checkboxes (`multiselect`)
*   **Why**: Useful for tracking tags, product interests, or available communication channels where the client can fit multiple categories (e.g. `[x] WhatsApp [x] Email [ ] SMS`).
*   **UI Representation**: A list of checkboxes grouped under the field label.
*   **Database Mapping**: Saved as an array of strings `['WhatsApp', 'Email']`.

### 3. Validated Phone / Email (`phone` / `email`)
*   **Why**: Although the client has primary phone/email fields, businesses often need to track secondary contact details (e.g. "Accountant Phone", "Manager Email").
*   **UI Representation**: Input with `type="tel"` or `type="email"` for hardware virtual keypad triggering.
