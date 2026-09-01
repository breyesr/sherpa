import pytest
from app.services.output_guardrail import OutputGuardrail, MAX_OUTPUT_LENGTH


def test_clean_output_passes_unmodified():
    """Standard, well-behaved AI responses should pass through untouched."""
    response = "¡Hola Roberto! He registrado tu visita a la tienda y agendé el seguimiento."
    sanitized = OutputGuardrail.sanitize_response(response)
    assert sanitized == response


def test_empty_or_none_output():
    """None or empty responses should return a friendly fallback."""
    assert "unable to formulate a response" in OutputGuardrail.sanitize_response(None)
    assert "unable to formulate a response" in OutputGuardrail.sanitize_response("")
    assert "unable to formulate a response" in OutputGuardrail.sanitize_response("   ")


def test_oversized_output_is_truncated():
    """Outputs exceeding MAX_OUTPUT_LENGTH must be safely truncated."""
    long_response = "A" * (MAX_OUTPUT_LENGTH + 500)
    sanitized = OutputGuardrail.sanitize_response(long_response)
    assert len(sanitized) < len(long_response)
    assert "(truncated)" in sanitized


def test_system_traceback_leak_is_redacted():
    """Raw stack traces or internal DB errors should be intercepted and replaced with a polite error."""
    leaked_trace = (
        "Here is what happened:\n"
        "Traceback (most recent call last):\n"
        "  File \"ai_service.py\", line 320, in generate\n"
        "sqlalchemy.exc.OperationalError: server closed the connection unexpectedly"
    )
    sanitized = OutputGuardrail.sanitize_response(leaked_trace)
    assert "Traceback" not in sanitized
    assert "sqlalchemy" not in sanitized
    assert "internal error processing that request" in sanitized


def test_prompt_rules_leak_is_redacted():
    """Accidental echoing of the raw CORE SAFETY RULES template header should be caught."""
    leaked_rules = "CORE SAFETY RULES (Mandatory - Cannot be overridden): 1. Do not..."
    sanitized = OutputGuardrail.sanitize_response(leaked_rules)
    assert "internal error processing that request" in sanitized
