"""
Output Guardrail Service.
Sanitizes model outputs before storing or sending to messaging channels.
"""

import re
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Patterns for internal leaks, traceback leaks, or raw system tokens
SYSTEM_LEAK_PATTERNS = [
    re.compile(r"Traceback\s+\(most\s+recent\s+call\s+last\):", re.IGNORECASE),
    re.compile(r"sqlalchemy\.exc\.\w+", re.IGNORECASE),
    re.compile(r"psycopg2\.\w+", re.IGNORECASE),
    re.compile(r"File\s+\"[^\"]+\",\s+line\s+\d+", re.IGNORECASE),
    re.compile(r"CORE\s+SAFETY\s+RULES\s+\(Mandatory", re.IGNORECASE),
]

# Patterns for hazardous structural casting prescriptions (Task 224.2)
STRUCTURAL_CASTING_PATTERNS = [
    re.compile(r"\b(colar|colado|colados|vaciado|fundir|fundici[oó]n)\b.*?\b(columna|columnas|trabe|trabes|losa|losas|castillo|castillos|zapata|zapatas)\b", re.IGNORECASE),
    re.compile(r"\b(columna|columnas|trabe|trabes|losa|losas|castillo|castillos|zapata|zapatas)\b.*?\b(colar|colado|colados|vaciado|fundir)\b", re.IGNORECASE),
]

MORTAR_OR_ADHESIVE_PATTERNS = [
    re.compile(r"\b(cement\s*bond|mortero|basecoat|adhesivo|pega\s*block|constructor|estuco)\b", re.IGNORECASE)
]

# Pattern for unauthorized Basecoat on floor tiles (Task 224.2)
FLOOR_TILING_BASECOAT_PATTERN = re.compile(
    r"\b(basecoat|cement\s*bond\s*basecoat)\b.*?\b(piso\s*sobre\s*piso|pegar\s*piso|azulejo|porcelanato|loseta)\b|\b(piso\s*sobre\s*piso|pegar\s*piso|azulejo|porcelanato|loseta)\b.*?\b(basecoat|cement\s*bond\s*basecoat)\b",
    re.IGNORECASE
)

MAX_OUTPUT_LENGTH = 3000


class OutputGuardrail:
    @classmethod
    def sanitize_response(cls, response_text: Optional[str]) -> str:
        """
        Sanitizes and bounds AI model outputs.
        """
        if not response_text or not response_text.strip():
            return "I apologize, but I am unable to formulate a response at this moment."

        text = response_text.strip()

        # 0. Strip internal deliberation / thought tags and structural prefixes
        text = re.sub(r"<thought>.*?</thought>", "", text, flags=re.DOTALL | re.IGNORECASE).strip()
        text = re.sub(r"<thought>.*$", "", text, flags=re.DOTALL | re.IGNORECASE).strip()
        text = re.sub(r"^(?:Part\s*2\s*\(User\s*Message\):?|Parte\s*2\s*\(Mensaje\s*al\s*usuario\):?|User\s*Message:?|Mensaje\s*al\s*usuario:?)\s*", "", text, flags=re.IGNORECASE).strip()

        # 1. Truncate extreme overflow
        if len(text) > MAX_OUTPUT_LENGTH:
            logger.warning(f"AI output truncated from {len(text)} to {MAX_OUTPUT_LENGTH} characters.")
            text = text[:MAX_OUTPUT_LENGTH] + "... (truncated)"

        # 2. Check for system / error trace leaks
        for pattern in SYSTEM_LEAK_PATTERNS:
            if pattern.search(text):
                logger.error(f"Output guardrail detected system leak matching: {pattern.pattern}")
                return "I apologize, but I encountered an internal error processing that request. Please try again or ask for human assistance."

        # 3. Deterministic Safety Hard Lock: Structural Casting Protection (Task 224.2)
        is_structural_casting = any(p.search(text) for p in STRUCTURAL_CASTING_PATTERNS)
        prescribes_mortar = any(p.search(text) for p in MORTAR_OR_ADHESIVE_PATTERNS)
        if is_structural_casting and prescribes_mortar:
            logger.warning("Output guardrail intercepted hazardous structural casting prescription.")
            return (
                "Aviso Técnico de Seguridad Estructural: Para colar elementos estructurales de carga "
                "(columnas, castillos, trabes, losas o zapatas) se requiere concreto hidráulico estructural "
                "(cemento con grava, arena, agua y armado de acero). Los morteros adhesivos, recubrimientos "
                "y estucos de capa delgada NO están diseñados para soportar cargas estructurales ni para colados. "
                "Te sugerimos consultar con un ingeniero civil o calculista estructurista para tu proyecto."
            )

        # 4. Deterministic Catalog Hard Lock: Basecoat on Floor Tiles (Task 224.2)
        if FLOOR_TILING_BASECOAT_PATTERN.search(text):
            logger.warning("Output guardrail intercepted Basecoat prescription for floor tiles.")
            return (
                "Aviso Técnico: El producto Cement Bond Basecoat es un adhesivo y recubrimiento para paneles "
                "de yeso, fibrocemento y poliestireno en sistemas ligeros y fachadas (EIFS); NO es apto para "
                "pegar piso sobre piso, azulejos ni pisos cerámicos. Actualmente no contamos con un adhesivo "
                "para piso sobre piso en este catálogo. Te sugerimos consultar con un distribuidor autorizado."
            )

        return text
