import pytest
from app.services.output_guardrail import OutputGuardrail
from app.services.catalog_context import CatalogContextBuilder
from app.services.technical_critic import TechnicalCritic
from app.models.trade.catalog import Product


def test_guardrail_strips_thought_tags_and_structural_prefixes():
    """Verify that OutputGuardrail universally strips deliberation tags and role artifacts."""
    raw = (
        "<thought>\n- Diagnóstico: Consulta de producto.\n</thought>\n"
        "User Message: Hola, contamos con disponibilidad de ese modelo."
    )
    sanitized = OutputGuardrail.sanitize_response(raw)
    assert "<thought>" not in sanitized
    assert "User Message:" not in sanitized
    assert sanitized == "Hola, contamos con disponibilidad de ese modelo."


def test_guardrail_prevents_system_and_traceback_leaks():
    """Verify universal protection against system traceback and database errors."""
    leak_response = "Error: Traceback (most recent call last): sqlalchemy.exc.OperationalError"
    sanitized = OutputGuardrail.sanitize_response(leak_response)
    assert "Traceback" not in sanitized
    assert "sqlalchemy" not in sanitized
    assert "internal error" in sanitized


def test_catalog_context_preserves_detailed_descriptions_without_120char_truncation():
    """Verify that product specifications are not prematurely cut off at 120 characters."""
    long_description = (
        "Producto especializado de alta adherencia formulado para aplicaciones exigentes. "
        "Autorizado para: poliestireno expandido, molduras decorativas, paneles de yeso y fibrocemento. "
        "No apto para pisos cerámicos ni elementos estructurales de carga."
    )
    prod = Product(
        name="Adhesivo Premium",
        brand="MarcaGenérica",
        description=long_description,
        wholesale_threshold=10,
        price=250.0,
    )
    context = CatalogContextBuilder.build_catalog_context([prod], allow_price_disclosure=True)
    assert "poliestireno expandido" in context
    assert "paneles de yeso y fibrocemento" in context
    assert "No apto para pisos cerámicos" in context


def test_catalog_context_anti_hypothetical_and_commercial_decoupling():
    """Verify that anti-hypothetical forcing and commercial decoupling directives are universally injected."""
    prod = Product(
        name="Producto General",
        brand="Empresa",
        description="Descripción genérica de producto.",
        wholesale_threshold=5,
        price=100.0,
    )
    context = CatalogContextBuilder.build_catalog_context([prod], allow_price_disclosure=True)

    assert "GROUNDING ESTRICTO" in context
    assert "PROHIBICIÓN ESTRICTA DE PREGUNTAS HIPOTÉTICAS O \"EL MÁS CERCANO\"" in context
    assert "DESACOPLAMIENTO COMERCIAL ANTE NEGATIVAS" in context
    assert "TIENES LA PROHIBICIÓN ESTRICTA de preguntar cantidades" in context


def test_technical_critic_trigger_detection():
    """Verify that TechnicalCritic is triggered for recommendation verbs regardless of domain."""
    assert TechnicalCritic.is_recommendation("Te recomiendo utilizar este modelo.") is True
    assert TechnicalCritic.is_recommendation("Puedes usar nuestro producto para esa aplicación.") is True
    assert TechnicalCritic.is_recommendation("La mejor opción para tu caso es la pieza B.") is True
    assert TechnicalCritic.is_recommendation("Hola, ¿en qué ciudad te encuentras?") is False
    assert TechnicalCritic.is_recommendation("Por favor indícame tu número de teléfono.") is False
    assert TechnicalCritic.is_recommendation("¿Cuántas piezas necesitas?") is False
