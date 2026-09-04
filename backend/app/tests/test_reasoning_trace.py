import re
import pytest
from app.services.output_guardrail import OutputGuardrail


def test_output_guardrail_strips_thought_tags():
    """Verify that <thought>...</thought> tags are 100% stripped from outbound channel text."""
    raw_response = (
        "<thought>\n"
        "- Diagnóstico: El usuario solicita pegado de piso sobre piso.\n"
        "- Evaluación: No contamos con adhesivo para piso sobre piso.\n"
        "- Decisión: Responder honestamente y sugerir consultar a un especialista.\n"
        "</thought>\n"
        "Hola, actualmente no contamos con un producto para piso sobre piso en nuestro catálogo."
    )

    cleaned = OutputGuardrail.sanitize_response(raw_response)
    
    assert "<thought>" not in cleaned
    assert "</thought>" not in cleaned
    assert "Diagnóstico" not in cleaned
    assert "Hola, actualmente no contamos con un producto para piso sobre piso en nuestro catálogo." in cleaned


def test_output_guardrail_strips_unclosed_thought_tag():
    """Verify that unclosed <thought> tags (e.g. from truncation) are also stripped."""
    raw_response = "<thought>\nIncomplete reasoning without closing tag"
    cleaned = OutputGuardrail.sanitize_response(raw_response)
    assert "<thought>" not in cleaned
    assert "Incomplete reasoning" not in cleaned


def test_reasoning_extraction_and_sanitization_pattern():
    """Verify regex extraction captures thought content and separates clean conversational response."""
    model_output = (
        "<thought>\n"
        "- Intención: Pregunta técnica de albañilería.\n"
        "- Regla: Cement Bond Constructor es para pegado de block.\n"
        "</thought>\n"
        "Para pegar block, te recomiendo Cement Bond Constructor."
    )
    
    thought_match = re.search(r"<thought>(.*?)</thought>", model_output, re.DOTALL | re.IGNORECASE)
    assert thought_match is not None
    extracted_thought = thought_match.group(1).strip()
    assert "Intención: Pregunta técnica de albañilería." in extracted_thought
    
    clean_user_message = re.sub(r"<thought>.*?</thought>", "", model_output, flags=re.DOTALL | re.IGNORECASE).strip()
    assert clean_user_message == "Para pegar block, te recomiendo Cement Bond Constructor."
    assert "<thought>" not in clean_user_message
