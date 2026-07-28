# Report: Lead Qualification & Referral Flow Optimizations

This report provides recommendations and an implementation plan to address the user notations regarding the **Prospect Lead Qualification and Referral Chat Flow**.

---

## 1. Analysis of Notations & Recommendations

### Notation 1: Below-Wholesale Quantity Handshake
* **Observed Behavior**: When the user requests a quantity below the wholesale threshold (e.g., `5 sacos` of Cement when the threshold is `50`), the bot immediately asks them to buy wholesale anyway (*"¿Te gustaría solicitar 50 sacos o necesitas otra cantidad?"*).
* **Recommendation**: Update the **`intent` phase system prompt** in [prospect_qualifier.py](file:///Users/bernardo/projects/sherpa/backend/app/services/prospect_qualifier.py#L153) to explicitly instruct the model *not* to force or pressure users into buying wholesale. If they request a low quantity, it should acknowledge the quantity gracefully and transition directly to minorist/retail routing.

---

### Notation 2: Single-Turn Retail Detail Collection
* **Observed Behavior**: Currently, the bot splits collection of retail details into two turns:
  1. Asking for delivery address and ZIP code (`collecting_retail_address`).
  2. Asking for name and email (`collecting_retail_details`).
* **Recommendation**: 
  1. Merge `collecting_retail_address` and `collecting_retail_details` into a single unified phase: **`collecting_retail_details`**.
  2. Transition to this phase immediately in [prospect_qualifier.py](file:///Users/bernardo/projects/sherpa/backend/app/services/prospect_qualifier.py#L354) as soon as a below-threshold quantity is detected.
  3. Update the prompt to ask for all missing data (Address, ZIP, Name, Email, and Company) in a single message.
  4. Explicitly instruct the model **never to request the phone number** (since we are communicating via their active Telegram or WhatsApp number).

---

### Notation 3: High-Fidelity Store Referral Contact Info
* **Observed Behavior**: The final retail confirmation message only registers the reference but doesn't empower the user with the matched store's contact information (*"...hemos registrado tu referencia minorista con la sucursal 'NorTienda'..."*).
* **Recommendation**: Update the `qualify_lead` node in [prospect_qualifier.py](file:///Users/bernardo/projects/sherpa/backend/app/services/prospect_qualifier.py#L714) to retrieve the matched store's physical address and phone number from the database and format them dynamically in the final response.

---

### Additional Finding: Sensitive Product ID Leakage
* **Observed Behavior**: In previous conversations, the bot leaked internal database Product IDs (UUIDs or code strings) to the user.
* **Root Cause**: The system prompts for multiple phases (e.g., `intent`, `collecting_retail_address`, `collecting`) feed the raw product ID to the LLM in the `Estado actual` context:
  `Producto (ID): {state.get('product')}`
  Because the LLM sees the database ID directly, it sometimes prints it out in its replies.
* **Recommendation**: 
  1. Fetch the user-friendly **Product Name** at the beginning of the `call_model` node in `prospect_qualifier.py` if a product is selected.
  2. Replace all instances of `Producto (ID): {state.get('product')}` in the system prompts with `Producto: {product_name}`.
  3. Add a strict system rule to the agent: **"Do NOT mention or leak internal product IDs or UUIDs to the user under any circumstances. Always refer to products by their public names."**

---

## 2. Technical Implementation Plan

We will modify [prospect_qualifier.py](file:///Users/bernardo/projects/sherpa/backend/app/services/prospect_qualifier.py) in three places:

### A. Intent Prompt Update & Product ID Protection
1. Retrieve the product name in `call_model`:
```python
prod_name = "No proporcionado"
if state.get("product"):
    res_p = await self.db.execute(select(Product).where(Product.id == state.get("product")))
    p_obj = res_p.scalars().first()
    if p_obj:
        prod_name = p_obj.name
```
2. Replace `{state.get('product')}` in prompt contexts with `{prod_name}`.
3. Ensure the LLM respects below-threshold requests immediately:
```python
# In call_model under 'intent' phase:
- Saluda amigablemente si es el primer mensaje.
- Pregunta explícitamente en qué producto de nuestro catálogo está interesado y la cantidad que desea.
- Si el usuario solicita una cantidad menor al umbral mayorista del catálogo, NO intentes persuadirlo de comprar al mayoreo ni de subir la cantidad. Acepta su solicitud de inmediato y explica amablemente que lo canalizaremos a la opción minorista (tienda física autorizada).
- BAJO NINGUNA CIRCUNSTANCIA expongas o menciones identificadores internos o IDs de bases de datos de los productos al usuario. Utiliza únicamente los nombres comerciales de los productos.
```

### B. Merge Retail Phases & Single-Turn Prompt
1. Change the transition in `run_tools_and_update_state` (line 354):
```python
if merged_quantity < threshold:
    # Transition directly to collecting retail details
    extracted_data["phase"] = "collecting_retail_details"
    merged_phase = "collecting_retail_details"
```
2. Rewrite the `collecting_retail_details` system prompt to collect all information at once:
```python
elif phase == "collecting_retail_details":
    # System prompt asking for Name, Email, Address & ZIP Code in one go.
    # Instruction: NO solicites su número de teléfono bajo ninguna circunstancia, ya que nos estamos comunicando por su número activo.
```
3. Update the state transition checks in `run_tools_and_update_state` to perform the matched store coverage check as soon as a `zip_code` is captured, transitioning to `qualifying_retail` when all fields (`name`, `email`, `location`, `zip_code`) and `matched_store_id` are gathered.

### C. Final Response Enrichment
Retrieve address and phone columns from the matched `Store` model and format:
```python
matched_store_name = "la sucursal"
matched_store_address = None
matched_store_phone = None
if state.get("matched_store_id"):
    res_store = await self.db.execute(select(Store).where(Store.id == state.get("matched_store_id")))
    matched_store_obj = res_store.scalars().first()
    if matched_store_obj:
        matched_store_name = matched_store_obj.name
        matched_store_address = matched_store_obj.address or matched_store_obj.street_address
        matched_store_phone = matched_store_obj.phone
...
elif is_retail:
    store_info = f"'{matched_store_name}'"
    if matched_store_address:
        store_info += f", ubicada en {matched_store_address}"
    if matched_store_phone:
        store_info += f" (Teléfono: {matched_store_phone})"
    
    response = (
        f"¡Listo! Hemos registrado tu referencia minorista con la sucursal {store_info}. "
        f"Un asesor de la tienda se pondrá en contacto contigo pronto para coordinar tu compra física de {qty} unidades de {product.name}. "
        f"Puedes contactarlos directamente si lo deseas. ¡Muchas gracias por tu preferencia!"
    )
```

---

## 3. Benefits of the Changes
* **No Sensitive Leaks**: Eliminating Product UUIDs from LLM context prevents accidental leaks.
* **Lower Friction**: Reduces the conversation length by 1-2 full turns.
* **Better UX**: Admins and prospective leads receive actionable direct contact details for their assigned store.
* **Higher Conversion**: Respecting low quantities immediately instead of pushing wholesale minimums creates a friendlier entry point for lead qualification.
