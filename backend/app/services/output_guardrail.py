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

        # 1. Truncate extreme overflow
        if len(text) > MAX_OUTPUT_LENGTH:
            logger.warning(f"AI output truncated from {len(text)} to {MAX_OUTPUT_LENGTH} characters.")
            text = text[:MAX_OUTPUT_LENGTH] + "... (truncated)"

        # 2. Check for system / error trace leaks
        for pattern in SYSTEM_LEAK_PATTERNS:
            if pattern.search(text):
                logger.error(f"Output guardrail detected system leak matching: {pattern.pattern}")
                return "I apologize, but I encountered an internal error processing that request. Please try again or ask for human assistance."

        return text
