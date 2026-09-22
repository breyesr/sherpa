# Agent Inconsistency Analysis — Updated with Live Test Results

## Live Test Against Cemenquin Catalog

> Business ID: `06a400f5-164c-7cdd-8000-55727144c135` (User: `06a400f5-162b-7cf9-8000-ae7105e4e9cf`)

### Catalog Facts
| Fact | Value |
|------|-------|
| Total products | **8** |
| Pruning threshold | 15 |
| Pruning active? | **NO** — all 8 products are always included |
| Catalog context size | **40,059 characters** (~10K tokens) |

### Products in Catalog
| Product | Mentions "yeso/panel/tablaroca"? |
|---------|--------------------------------|
| Cement Bond Basecoat | ✅ Yes |
| Cement Bond Blanco | ✅ Yes |
| Cement Bond Constructor | ✅ Yes |
| Cement Bond Fino | ✅ Yes |
| Cement Bond Malla Integrada | ✅ Yes |
| **HT Bond Blanco Basecoat** | ✅ Yes |
| **HT Bond Gris Basecoat** | ✅ Yes |
| Cemento Nivelator | ❌ No |

> [!IMPORTANT]
> **HT Bond exists!** The agent told the user "No existe HT Bond en nuestro catálogo" — but there are 2 HT Bond products with detailed technical sheets. The LLM failed to find them in the 40K-char context.

### Catalog Stability Test (Pruning NOT the Issue)

All 5 conversation turns produced **identical** product sets — the pruning bug from my initial analysis is **not triggered** because this business has only 8 products (below the 15-product threshold).

```
Turn 1 ("recubrir muro panel yeso"): 8 products ✅
Turn 2 ("que opciones tienes?"):      8 products ✅ identical
Turn 3 ("ademas del cement bond"):     8 products ✅ identical
Turn 4 ("ht bond?"):                   8 products ✅ identical
Turn 5 ("variantes"):                  8 products ✅ identical
```

---

## Revised Root Causes (3 confirmed bugs)

### 🔴 Bug 1: Critic Hallucination Due to Massive Catalog Context (40K chars)

**The #1 cause of the flip-flopping.**

The `custom_fields` column stores **entire technical data sheets** as markdown — preparation guides, application instructions, technical specs tables, precautions, etc. Each product generates ~5,000 chars of context.

When the Critic (`gpt-4o-mini`, temperature=0, **12s timeout**) receives this 40K-char catalog block, it:
- Struggles to accurately locate product capabilities across 10K tokens of dense technical content
- **Inconsistently evaluates** the same product's suitability across turns
- Turn 1: APPROVED (found "cartón de yeso" in Cement Bond's description)
- Turn 2: REJECTED with reasoning that Cement Bond is "for polystyrene and moldings, not drywall" — **it read a different section of the same description** that says "poliestireno y molduras"

**File:** [technical_critic.py L58-75](file:///Users/bernardo/projects/sherpa/backend/app/services/technical_critic.py#L58-L75)

The Critic's system prompt injects the full 40K catalog:
```python
system_audit_prompt = f"""...
CATÁLOGO AUTORIZADO DE LA EMPRESA:
{catalog_context}      # ← 40,059 characters!
...
"""
```

And `gpt-4o-mini` has a 12-second timeout — it may be rushing through 10K tokens of technical specs and making unreliable judgments.

### 🔴 Bug 2: Agent Denies HT Bond Exists Despite Being in Catalog

The agent says "No existe HT Bond en nuestro catálogo" even though **HT Bond Blanco Basecoat** and **HT Bond Gris Basecoat** are both present with full technical sheets.

This is a **needle-in-haystack failure**: the LLM is scanning 40K chars of catalog context and failing to find "HT Bond" because:
- The products are named "HT Bond **Blanco** Basecoat" / "HT Bond **Gris** Basecoat"
- The user asked for "ht bond" (partial match)
- The LLM may be hitting the same attention/context-length limitations as the Critic

### 🔴 Bug 3: Critic Trigger Pattern Too Narrow

**File:** [technical_critic.py L21-24](file:///Users/bernardo/projects/sherpa/backend/app/services/technical_critic.py#L21-L24)

Tested 12 common recommendation phrasings — **8 bypass the Critic entirely**:

| Phrase | Triggers Critic? |
|--------|-----------------|
| "te recomiendo utilizar el Cement Bond" | ✅ Yes |
| "puedes usar el Cement Bond" | ✅ Yes |
| "es ideal para recubrir" | ✅ Yes |
| "nuestro producto Cement Bond" | ✅ Yes |
| "la opción más adecuada que ofrecemos" | ❌ **Bypassed** |
| "Para tu caso contamos con el Cement Bond" | ❌ **Bypassed** |
| "Debes adquirir el Cement Bond" | ❌ **Bypassed** |
| "El producto certificado es el Cement Bond" | ❌ **Bypassed** |
| "está diseñado para recubrir" | ❌ **Bypassed** |
| "es adecuado para tu necesidad" | ❌ **Bypassed** |
| "Tenemos las siguientes opciones" | ❌ **Bypassed** |
| "Las variantes disponibles son" | ❌ **Bypassed** |

---

## Recommended Fixes (Prioritized)

### Fix 1: Compact Catalog Context for the Critic (Critical)

Build a **condensed, structured summary** specifically for the Critic's verification pass, instead of dumping 40K chars of raw technical sheets. The Critic only needs product names, categories, and key applications — not preparation guides and precautions.

```python
# In technical_critic.py or catalog_context.py
@classmethod
def build_critic_summary(cls, products: List[Product]) -> str:
    """Build a compact catalog summary for the Critic (name + key applications only)."""
    lines = []
    for p in products:
        apps = ""
        if p.description:
            # Extract only the first 200 chars of description
            apps = p.description[:200].strip()
        line = f"- {p.name} | Cat: {p.category.name if p.category else 'N/A'} | {apps}"
        lines.append(line)
    return "\n".join(lines)
```

This reduces the Critic's context from ~40K to ~2K chars, dramatically improving accuracy.

### Fix 2: Compact Catalog for the Main LLM System Prompt (High)

The main LLM also receives 40K chars in the system prompt via `{product_list_str}`. For 8 products this is manageable but suboptimal. The `format_product_line` function ([catalog_context.py L23-56](file:///Users/bernardo/projects/sherpa/backend/app/services/catalog_context.py#L23-L56)) caps descriptions at 800 chars but custom_fields are **not capped**:

```python
# Current: custom_fields are injected raw with no size limit
if product.custom_fields and isinstance(product.custom_fields, dict):
    specs = []
    for k, v in product.custom_fields.items():
        ...  # No truncation on values!
```

**Fix**: Cap `custom_fields` values (especially `ficha_tecnica` / technical sheets) to a reasonable length:

```python
val_str = str(v)
if len(val_str) > 500:
    val_str = val_str[:497] + "..."
```

### Fix 3: Broaden Critic Trigger Pattern (Medium)

```python
RECOMMENDATION_TRIGGER_PATTERN = re.compile(
    r"\b(te recomiendo|puedes usar|te sugiero|te aconsejo|el producto ideal|"
    r"la mejor opci[oó]n|ideal para|recomendamos|utilizar el|utiliza el|"
    r"nuestro producto|la opci[oó]n m[aá]s adecuada|contamos con el|"
    r"para tu caso|debes adquirir|el producto certificado|"
    r"podr[ií]as utilizar|es adecuado para|est[aá] dise[nñ]ado para|"
    r"las variantes disponibles|las opciones disponibles|"
    r"tenemos las siguientes|las siguientes opciones)\b",
    re.IGNORECASE,
)
```

### Fix 4: Upgrade Critic Model or Increase Timeout (Medium)

`gpt-4o-mini` with a **12-second timeout** may be insufficient for 10K-token contexts. Options:
- Increase timeout to 20s
- Use `gpt-4o` for the critic (more reliable on long context, slightly more expensive)
- Or combine with Fix 1 (compact context) to keep `gpt-4o-mini`

---

## Impact Summary

| Fix | Effort | Impact | Addresses |
|-----|--------|--------|-----------|
| Fix 1 (Compact critic context) | Medium | **Eliminates false rejections** | Bugs 1 & 2 |
| Fix 2 (Cap custom_fields in catalog) | Low | **Reduces LLM confusion** | Bug 2 |
| Fix 3 (Broader trigger pattern) | Low | Catches 8 more bypass phrases | Bug 3 |
| Fix 4 (Critic model/timeout) | Low | Improves reliability | Bug 1 |

> [!IMPORTANT]
> **Fix 1 + Fix 2 together** are the recommended starting point. They address the fundamental issue: 40K chars of technical sheets overwhelming both the LLM and the Critic, causing inconsistent product identification and recommendation validation.

> [!NOTE]
> The pruning bug from my initial analysis (catalog changing between turns) is **still a valid latent bug** — it will surface for any business with >15 products. It should be addressed separately but is not the cause of this specific Cemenquin issue.
