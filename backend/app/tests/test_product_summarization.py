import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from app.models.trade.catalog import Product, Category
from app.tasks.knowledge import _generate_product_summary_logic


@pytest.mark.asyncio
async def test_generate_product_summary_success():
    """Verify that _generate_product_summary_logic queries product, renders prompt, calls litellm, and saves ai_summary."""
    mock_product = Product(
        id="prod-123",
        name="Sellador Acrílico Pro",
        brand="BondMax",
        description="Sellador de alto rendimiento para juntas.",
        custom_fields={"color": "Blanco", "secado": "24h"},
        ai_summary=None
    )
    mock_category = Category(id="cat-1", name="Adhesivos y Selladores")
    mock_product.category = mock_category

    mock_db = AsyncMock()
    mock_scalars = MagicMock()
    mock_scalars.first.return_value = mock_product
    mock_res = MagicMock()
    mock_res.scalars.return_value = mock_scalars
    mock_db.execute.return_value = mock_res

    fake_llm_response = MagicMock()
    fake_choice = MagicMock()
    fake_choice.message.content = (
        "1. USOS PRINCIPALES: Sellado de juntas y grietas en interior.\n"
        "2. CARACTERÍSTICAS CLAVE: Base acrílica; flexible; pintable.\n"
        "3. TIPO DE PRODUCTO: Sellador elástico.\n"
        "4. PRESENTACIÓN: Cartucho de 300 ml.\n"
        "5. RENDIMIENTO/DURACIÓN: 12 metros lineales por cartucho.\n"
        "6. VENTAJAS CLAVE: No encoge; alta adherencia; secado rápido."
    )
    fake_llm_response.choices = [fake_choice]

    with patch("app.tasks.knowledge.SessionLocal", return_value=mock_db), \
         patch("app.tasks.knowledge.litellm.acompletion", new_callable=AsyncMock, return_value=fake_llm_response) as mock_litellm, \
         patch("app.tasks.knowledge.ConfigService.get", new_callable=AsyncMock, return_value="fake-api-key"):
        
        mock_db.__aenter__.return_value = mock_db
        mock_db.__aexit__.return_value = None

        await _generate_product_summary_logic("prod-123")

        mock_litellm.assert_called_once()
        assert mock_product.ai_summary == fake_choice.message.content.strip()
        mock_db.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_generate_product_summary_truncates_large_input():
    """Verify that very large product descriptions are truncated to prevent token overflow."""
    huge_description = "A" * 30000
    mock_product = Product(
        id="prod-huge",
        name="Producto Gigante",
        brand="BigBrand",
        description=huge_description,
        custom_fields={},
        ai_summary=None
    )
    mock_product.category = None

    mock_db = AsyncMock()
    mock_scalars = MagicMock()
    mock_scalars.first.return_value = mock_product
    mock_res = MagicMock()
    mock_res.scalars.return_value = mock_scalars
    mock_db.execute.return_value = mock_res

    fake_llm_response = MagicMock()
    fake_choice = MagicMock()
    fake_choice.message.content = "1. USOS: Resumen básico."
    fake_llm_response.choices = [fake_choice]

    with patch("app.tasks.knowledge.SessionLocal", return_value=mock_db), \
         patch("app.tasks.knowledge.litellm.acompletion", new_callable=AsyncMock, return_value=fake_llm_response) as mock_litellm, \
         patch("app.tasks.knowledge.ConfigService.get", new_callable=AsyncMock, return_value="fake-key"):
        
        mock_db.__aenter__.return_value = mock_db
        mock_db.__aexit__.return_value = None

        await _generate_product_summary_logic("prod-huge")

        call_args = mock_litellm.call_args
        prompt_sent = call_args.kwargs["messages"][0]["content"]
        assert len(prompt_sent) < 25000
        assert "... [truncado]" in prompt_sent


@pytest.mark.asyncio
async def test_generate_product_summary_failure_leaves_summary_none():
    """Verify that an LLM failure leaves ai_summary as None and rolls back cleanly."""
    mock_product = Product(
        id="prod-fail",
        name="Producto Error",
        description="Falla intencional",
        ai_summary=None
    )
    mock_product.category = None

    mock_db = AsyncMock()
    mock_scalars = MagicMock()
    mock_scalars.first.return_value = mock_product
    mock_res = MagicMock()
    mock_res.scalars.return_value = mock_scalars
    mock_db.execute.return_value = mock_res

    with patch("app.tasks.knowledge.SessionLocal", return_value=mock_db), \
         patch("app.tasks.knowledge.litellm.acompletion", new_callable=AsyncMock, side_effect=RuntimeError("OpenAI API rate limit")), \
         patch("app.tasks.knowledge.ConfigService.get", new_callable=AsyncMock, return_value="fake-key"):
        
        mock_db.__aenter__.return_value = mock_db
        mock_db.__aexit__.return_value = None

        with pytest.raises(RuntimeError, match="OpenAI API rate limit"):
            await _generate_product_summary_logic("prod-fail")

        assert mock_product.ai_summary is None
        mock_db.rollback.assert_awaited_once()
