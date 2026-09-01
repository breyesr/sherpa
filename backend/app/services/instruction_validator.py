"""
Instruction Validator Service.
Enforces defense-in-depth safety validation on per-business custom instructions at save-time.
"""

import re
import logging
from typing import Tuple

logger = logging.getLogger(__name__)

# Compile high-confidence deterministic injection and rule-override patterns
INJECTION_PATTERNS = [
    re.compile(r"\b(ignore|disregard|forget)\s+(all\s+)?(previous|prior|above|system)\s+(instructions|prompts|rules|commands)\b", re.IGNORECASE),
    re.compile(r"\b(you\s+are\s+now|act\s+as)\s+(a\s+)?(general|unrestricted|jailbroken|dan|developer\s+mode|unaligned)\b", re.IGNORECASE),
    re.compile(r"\b(reveal|print|output)\s+(your\s+)?(system\s+prompt|initial\s+instructions|hidden\s+rules)\b", re.IGNORECASE),
    re.compile(r"\b(skip|bypass|never\s+do)\s+(identity|verification|confirmation|safety)\b", re.IGNORECASE),
    re.compile(r"\b(never|don'?t|do\s+not)\s+ask\s+for\s+(the\s+)?(client('?s)?\s+)?(name|phone|email|identity)\b", re.IGNORECASE),
    re.compile(r"\b(share|reveal|disclose)\s+(other\s+)?(client('?s)?|customer('?s)?)\s+(data|info|phone|email)\b", re.IGNORECASE),
]

MAX_CUSTOM_INSTRUCTION_LENGTH = 1000


class InstructionValidator:
    @classmethod
    def validate_instructions(cls, instructions: str) -> Tuple[bool, str]:
        """
        Validates custom instructions before saving to database.
        Returns (is_valid: bool, error_message: str).
        """
        if not instructions or not instructions.strip():
            return True, ""

        clean_text = instructions.strip()

        # 1. Length constraint
        if len(clean_text) > MAX_CUSTOM_INSTRUCTION_LENGTH:
            return False, f"Custom instructions must be {MAX_CUSTOM_INSTRUCTION_LENGTH} characters or less (currently {len(clean_text)})."

        # 2. Deterministic Regex Pattern Filtering
        for pattern in INJECTION_PATTERNS:
            if pattern.search(clean_text):
                logger.warning(f"Custom instructions rejected by safety pattern: {pattern.pattern}")
                return False, (
                    "Instructions rejected by safety filter: contains disallowed phrases that attempt to "
                    "override core system safety rules (e.g. bypassing identity verification or system prompt overrides)."
                )

        return True, ""
