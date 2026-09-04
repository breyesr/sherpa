import pytest
from app.services.output_guardrail import OutputGuardrail
from app.services.catalog_context import CatalogContextBuilder
from app.services.technical_critic import TechnicalCritic
from app.models.trade.catalog import Product


def test_guardrail_intercepts_hazardous_structural_column_casting():
    """Verify that thin-bed mortars are strictly blocked from structural casting recommendations."""
    hazardous_response = (
        "Para colar la columna de concreto, te recomiendo utilizar Cement Bond Constructor. "
        "Tiene excelente adherencia y te servirá para el colado de tu columna."
    )
    sanitized = OutputGuardrail.sanitize_response(hazardous_response)

    # Must intercept and provide structural safety disclaimer
    assert "Aviso Técnico de Seguridad Estructural" in sanitized
    assert "concreto hidráulico estructural" in sanitized
    assert "Cement Bond Constructor" not in sanitized


def test_guardrail_intercepts_basecoat_for_floor_tiles():
    """Verify that Basecoat is strictly blocked from floor tiling recommendations."""
    hallucinated_response = (
        "Para pegar piso sobre piso, te recomiendo utilizar el Cement Bond Basecoat. "
        "Es ideal para aplicaciones en pisos y azulejos."
    )
    sanitized = OutputGuardrail.sanitize_response(hallucinated_response)

    # Must intercept and inform that Basecoat is not for floor tiles
    assert "Aviso Técnico" in sanitized
    assert "NO es apto para pegar piso sobre piso" in sanitized
    assert "adhesivo y recubrimiento para paneles de yeso" in sanitized


def test_guardrail_passes_legitimate_mortar_recommendation():
    """Verify that legitimate applications (e.g. pegado de block) are not falsely blocked."""
    valid_response = (
        "Para el pegado de muros de block y mampostería, te recomiendo el producto Cement Bond Constructor. "
        "¿Cuántos sacos requieres para tu obra?"
    )
    sanitized = OutputGuardrail.sanitize_response(valid_response)
    assert sanitized == valid_response


def test_catalog_context_includes_strict_grounding_and_structural_bounds():
    """Verify that CatalogContextBuilder injects strict non-improvisation and structural directives."""
    prod = Product(
        name="Cement Bond Constructor",
        brand="Cemenquin",
        description="Mortero en capa delgada para pegado de block y tabique en muros divisorios.",
        wholesale_threshold=50,
        price=150.0,
    )
    context = CatalogContextBuilder.build_catalog_context([prod], allow_price_disclosure=True)

    assert "GROUNDING ESTRICTO" in context
    assert "REGLA DE NO-IMPROVISACIÓN" in context
    assert "SEGURIDAD ESTRUCTURAL CRÍTICA" in context
    assert "NUNCA recomiendes adhesivos, estucos o morteros de albañilería para COLAR elementos estructurales" in context


def test_technical_critic_trigger_detection():
    """Verify that TechnicalCritic is only triggered for recommendations, skipping conversational turns."""
    assert TechnicalCritic.is_recommendation("Te recomiendo utilizar el producto Cement Bond Blanco.") is True
    assert TechnicalCritic.is_recommendation("Puedes usar nuestro producto para esa superficie.") is True
    assert TechnicalCritic.is_recommendation("Hola, ¿en qué dirección se encuentra la obra?") is False
    assert TechnicalCritic.is_recommendation("Por favor indícame tu código postal de 5 dígitos.") is False
    assert TechnicalCritic.is_recommendation("¿Cuántos sacos necesitas?") is False


def test_guardrail_intercepts_constructor_for_cement_boards():
    """Verify that masonry mortar is strictly blocked from cement board / panel adhesion."""
    coerced_response = (
        "Para pegar placas de cemento sobre un muro de block exterior, el Cement Bond Constructor "
        "sería la mejor opción ya que está diseñado para la adhesión de placas."
    )
    sanitized = OutputGuardrail.sanitize_response(coerced_response)
    assert "Aviso Técnico" in sanitized
    assert "NO está formulado ni certificado para adherir placas o paneles de cemento" in sanitized


def test_catalog_context_anti_hypothetical_and_commercial_decoupling():
    """Verify that anti-hypothetical forcing and commercial decoupling directives are injected."""
    prod = Product(
        name="Cement Bond Constructor",
        brand="Cemenquin",
        description="Mortero de albañilería.",
        wholesale_threshold=50,
        price=150.0,
    )
    context = CatalogContextBuilder.build_catalog_context([prod], allow_price_disclosure=True)

    assert "PROHIBICIÓN ESTRICTA DE PREGUNTAS HIPOTÉTICAS O \"EL MÁS CERCANO\"" in context
    assert "DESACOPLAMIENTO COMERCIAL ANTE NEGATIVAS" in context
    assert "TIENES LA PROHIBICIÓN ESTRICTA de preguntar cantidades" in context

