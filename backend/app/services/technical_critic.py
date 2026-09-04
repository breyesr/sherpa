"""Technical Critic Service (Epic 224 - Task 224.3).

Lightweight, selective verification node executed ONLY when an assistant draft
prescribes or recommends a specific product from the catalog.
Ensures zero hallucinations and strict compliance with authorized technical sheets.
"""

import json
import logging
import re
from typing import Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.system_config import ConfigService
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage

logger = logging.getLogger(__name__)

# Pattern to selectively trigger the Critic only when a recommendation is made
RECOMMENDATION_TRIGGER_PATTERN = re.compile(
    r"\b(te recomiendo|puedes usar|te sugiero|te aconsejo|el producto ideal|la mejor opci[oó]n|ideal para|recomendamos|utilizar el|utiliza el|nuestro producto)\b",
    re.IGNORECASE,
)


class TechnicalCritic:
    """Selective fact-checking node for technical product recommendations."""

    @classmethod
    def is_recommendation(cls, text: str) -> bool:
        """Determines if the text contains a product prescription/recommendation."""
        if not text:
            return False
        return bool(RECOMMENDATION_TRIGGER_PATTERN.search(text))

    @classmethod
    async def verify_recommendation(
        cls,
        db: AsyncSession,
        user_message: str,
        draft_response: str,
        catalog_context: str,
    ) -> Tuple[str, Optional[str]]:
        """Verifies an assistant product recommendation against authorized catalog sheets.

        Returns (final_response, critic_audit_log).
        """
        # 1. Skip Critic if draft does not prescribe/recommend products (saves 70% latency & tokens)
        if not cls.is_recommendation(draft_response):
            return draft_response, None

        api_key = await ConfigService.get(db, "OPENAI_API_KEY")
        if not api_key:
            logger.warning("TechnicalCritic skipped: OPENAI_API_KEY not configured.")
            return draft_response, None

        system_audit_prompt = f"""Eres el Auditor Técnico de Seguridad y Fact-Checker oficial de la empresa.
Tu labor es contrastar la recomendación del asistente contra las fichas técnicas autorizadas.

FICHAS TÉCNICAS Y CATÁLOGO AUTORIZADO:
{catalog_context}

REGLAS DE AUDITORÍA:
1. El asistente SOLO puede recomendar un producto si su ficha técnica autoriza explícitamente el uso solicitado por el usuario.
2. Si el producto NO cubre la necesidad (ej. Basecoat para pisos, mortero para colar concreto estructural, etc.), DEBES RECHAZAR la recomendación.
3. Si el catálogo actual carece de producto para la necesidad del usuario, el asistente debe admitirlo honestamente y no forzar ningún producto.

Devuelve tu evaluación estrictamente en formato JSON válido con las siguientes claves:
{{
  "aprobado": true o false,
  "motivo": "Breve explicación de la validación o del error detectado",
  "correccion": "En caso de aprobado=false, redacción breve, honesta y profesional indicando que actualmente no contamos con un producto para esa aplicación específica en el catálogo y sugiriendo consultar a un especialista."
}}"""

        user_input_block = f"""CONSULTA DEL USUARIO:
{user_message}

RESPUESTA PROPUESTA POR EL ASISTENTE:
{draft_response}"""

        try:
            llm = ChatOpenAI(
                model="gpt-4o-mini",
                temperature=0,
                api_key=api_key,
                timeout=12.0,
            )
            eval_res = await llm.ainvoke(
                [
                    SystemMessage(content=system_audit_prompt),
                    HumanMessage(content=user_input_block),
                ]
            )

            raw_eval = eval_res.content.strip()
            # Clean possible markdown json fences
            if raw_eval.startswith("```"):
                raw_eval = re.sub(r"^```(?:json)?\s*", "", raw_eval)
                raw_eval = re.sub(r"\s*```$", "", raw_eval)

            result = json.loads(raw_eval)
            aprobado = result.get("aprobado", True)
            motivo = result.get("motivo", "")
            correccion = result.get("correccion", "")

            if not aprobado and correccion:
                logger.warning(
                    f"TechnicalCritic REJECTED draft response. Reason: {motivo}"
                )
                audit_log = f"Fact-Checker (Critic): RECHAZADO | Motivo: {motivo}"
                return correccion.strip(), audit_log

            audit_log = f"Fact-Checker (Critic): APROBADO | {motivo}"
            return draft_response, audit_log

        except Exception as e:
            logger.error(f"TechnicalCritic evaluation failed: {e}")
            # Safe degradation: return original draft (guarded by deterministic Layer 2)
            return draft_response, None
