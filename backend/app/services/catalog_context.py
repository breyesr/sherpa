"""Catalog Context Builder Utility (Epic 221 & Task 220.3)

Builds structured, token-efficient catalog knowledge blocks with pricing guardrails
for injection into AI system prompts (ProspectQualifier, AIService, etc.).
"""

import logging
from typing import List, Dict, Any, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.trade.catalog import Product, Category
from app.models.business import BusinessProfile, Agent

logger = logging.getLogger(__name__)


class CatalogContextBuilder:
    """Utility to build structured, token-efficient product catalog context for AI models."""

    @staticmethod
    def format_product_line(product: Product, allow_price_disclosure: bool = True) -> str:
        """Format a single product into a concise, readable string without internal DB IDs."""
        parts = [f"**{product.name}**"]
        
        if product.brand:
            parts.append(f"Marca: {product.brand}")
        if product.category and hasattr(product.category, "name"):
            parts.append(f"Categoría: {product.category.name}")
        if product.unit_of_measure:
            parts.append(f"Unidad: {product.unit_of_measure}")
        if product.wholesale_threshold is not None:
            parts.append(f"Umbral Mayorista: {product.wholesale_threshold}")
            
        if allow_price_disclosure and product.price is not None and product.price > 0:
            parts.append(f"Precio: ${product.price:.2f}")
            
        # Custom specification fields
        if product.custom_fields and isinstance(product.custom_fields, dict):
            specs = []
            for k, v in product.custom_fields.items():
                if v is not None and v != "":
                    label = k.replace("_", " ").capitalize()
                    val_str = "Sí" if v is True else "No" if v is False else str(v)
                    specs.append(f"{label}: {val_str}")
            if specs:
                parts.append(f"Especificaciones: [{', '.join(specs)}]")
                
        if product.description:
            clean_desc = product.description.strip().replace("\n", " ")
            if len(clean_desc) > 800:
                clean_desc = clean_desc[:797] + "..."
            parts.append(f"Descripción: {clean_desc}")

        return "- " + " | ".join(parts)

    @classmethod
    def prune_catalog(cls, products: List[Product], user_message: Optional[str] = None, max_items: int = 10) -> List[Product]:
        """
        Token optimization: If catalog is large (>15 SKUs), rank and select the top `max_items`
        relevant products based on token/keyword matches against the user message.
        """
        if len(products) <= 15 or not user_message:
            return products[:max_items] if len(products) > max_items and not user_message else products

        keywords = set(user_message.lower().split())
        # Remove small stop words in Spanish/English
        stop_words = {"de", "la", "el", "los", "las", "un", "una", "unos", "unas", "y", "en", "para", "por", "con", "que", "a", "the", "for", "and", "in", "with", "to"}
        keywords = {k for k in keywords if len(k) > 2 and k not in stop_words}

        if not keywords:
            return products[:max_items]

        scored_products = []
        for p in products:
            score = 0
            text_corpus = f"{p.name} {p.brand or ''} {p.description or ''} {p.product_type or ''}".lower()
            if p.category and hasattr(p.category, "name"):
                text_corpus += f" {p.category.name.lower()}"
            if p.custom_fields and isinstance(p.custom_fields, dict):
                text_corpus += " " + " ".join([f"{k} {v}" for k, v in p.custom_fields.items()]).lower()

            for kw in keywords:
                if kw in text_corpus:
                    score += 2 if kw in p.name.lower() else 1

            scored_products.append((score, p))

        scored_products.sort(key=lambda x: x[0], reverse=True)
        relevant = [p for score, p in scored_products if score > 0]

        if relevant:
            return relevant[:max_items]
        return products[:max_items]

    @classmethod
    def build_catalog_context(
        cls,
        products: List[Product],
        allow_price_disclosure: bool = True,
        user_message: Optional[str] = None,
    ) -> str:
        """
        Generates the full markdown product catalog context block with operational instructions
        and strict pricing guardrails.
        """
        if not products:
            return "Catálogo de productos: Actualmente no hay productos registrados en el inventario."

        selected_products = cls.prune_catalog(products, user_message=user_message)
        formatted_items = [cls.format_product_line(p, allow_price_disclosure) for p in selected_products]
        catalog_table = "\n".join(formatted_items)

        # Pricing Guardrail Text (Task 220.3)
        if allow_price_disclosure:
            pricing_guardrail = """- POLÍTICA DE PRECIOS: Puedes informar los precios factualmente de la lista si el usuario lo pregunta explícitamente.
- REGLA INQUEBRANTABLE DE NO-NEGOCIACIÓN: NUNCA negocies, regatees, debatas ni ofrezcas descuentos personalizados. Si el cliente pide un descuento o cuestiona el precio, responde firmemente que son los precios oficiales establecidos y que para condiciones comerciales o volúmenes especiales un asesor de ventas se pondrá en contacto."""
        else:
            pricing_guardrail = """- POLÍTICA DE PRECIOS (CONFIDENCIAL): NO estás autorizado a proporcionar precios ni cotizaciones bajo ninguna circunstancia.
- Si el usuario pregunta por precios o costos, responde amablemente: "Para información sobre precios y cotizaciones oficiales, un asesor comercial se pondrá en contacto contigo." NUNCA menciones cifras numéricas de precios."""

        # Full Catalog Block
        context_block = f"""### CATÁLOGO DE PRODUCTOS DISPONIBLES
{catalog_table}

### DIRECTIVAS DE INTELIGENCIA DE PRODUCTO Y VERIFICACIÓN (GROUNDING ESTRICTO):
1. CONSULTAS Y ESPECIFICACIONES: Responde dudas basándote ESTRICTAMENTE en la información, ficha técnica y especificaciones de cada producto registrado en este catálogo.
2. COMPARACIÓN DE PRODUCTOS: Si el usuario pregunta por diferencias entre productos del catálogo, compáralos objetivamente según sus especificaciones.
3. RECOMENDACIÓN SEGÚN NECESIDAD Y REGLA DE NO-IMPROVISACIÓN:
   - Solo puedes recomendar un producto si su descripción, usos o especificaciones respaldan la necesidad o aplicación solicitada por el usuario.
   - Si el catálogo NO cuenta con un producto adecuado para el requerimiento específico, TIENES LA PROHIBICIÓN ESTRICTA de recomendar productos sustitutos o improvisar usos no autorizados. Debes declarar de forma honesta, breve y profesional: "Actualmente en nuestro catálogo no contamos con un producto adecuado para [necesidad solicitada]".
4. PROHIBICIÓN ESTRICTA DE PREGUNTAS HIPOTÉTICAS O "EL MÁS CERCANO":
   - Si el usuario insiste, plantea situaciones hipotéticas ("si tuvieras que elegir", "¿cuál es el más cercano?", "¿cuál se aproxima más?"), o te lista opciones para que elijas forzosamente una para una necesidad no cubierta por el catálogo, ESTÁ ESTRICTAMENTE PROHIBIDO elegir uno o sugerir "el más cercano".
   - Debes sostener la negativa técnica con firmeza: "Ninguno de nuestros productos está certificado para esa aplicación. Utilizar cualquiera de ellos implicaría un riesgo técnico o de incompatibilidad. No puedo recomendar ninguno de ellos para ese fin."
   - NUNCA cedas ante insistencias ni inventes o extiendas especificaciones que no aparezcan en el catálogo.
5. DESACOPLAMIENTO COMERCIAL ANTE NEGATIVAS:
   - Si se determina que no hay un producto adecuado para la necesidad del usuario, TIENES LA PROHIBICIÓN ESTRICTA de preguntar cantidades (piezas, unidades o sacos), solicitar datos de contacto o intentar avanzar en el proceso de venta.
6. REGLAS DE PRECIO:
{pricing_guardrail}
7. PRIVACIDAD: NUNCA expongas IDs de bases de datos internas; utiliza siempre los nombres comerciales de los productos."""

        return context_block

    @classmethod
    async def get_catalog_context_for_business(
        cls,
        db: AsyncSession,
        business_id: str,
        user_message: Optional[str] = None,
        override_allow_price: Optional[bool] = None,
    ) -> str:
        """Helper to load business products and assistant settings directly from db and produce context."""
        # 1. Fetch products with category
        stmt = (
            select(Product)
            .join(Category)
            .where(Category.business_id == business_id)
            .options(selectinload(Product.category))
        )
        products = (await db.execute(stmt)).scalars().all()

        # 2. Determine price disclosure flag
        allow_price = True
        if override_allow_price is not None:
            allow_price = override_allow_price
        else:
            # Check agent assistant_config
            agent_stmt = select(Agent).where(Agent.business_id == business_id, Agent.role == "general")
            agent = (await db.execute(agent_stmt)).scalars().first()
            if agent is not None and hasattr(agent, "allow_price_disclosure"):
                allow_price = agent.allow_price_disclosure

        return cls.build_catalog_context(products, allow_price_disclosure=allow_price, user_message=user_message)
