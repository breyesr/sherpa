import pytest
from app.models.trade.catalog import Product, Category
from app.services.catalog_context import CatalogContextBuilder


def test_format_product_line_with_price_and_custom_fields():
    cat = Category(name="Construcción")
    prod = Product(
        name="Cemento Gris 50kg",
        brand="Sherpa Build",
        unit_of_measure="bulto",
        wholesale_threshold=40,
        price=195.50,
        custom_fields={"material": "Portland Tipo II", "fragua_rapida": True},
        description="Ideal para zapatas y columnas estructurales."
    )
    prod.category = cat

    line_with_price = CatalogContextBuilder.format_product_line(prod, allow_price_disclosure=True)
    assert "**Cemento Gris 50kg**" in line_with_price
    assert "Marca: Sherpa Build" in line_with_price
    assert "Categoría: Construcción" in line_with_price
    assert "Unidad: bulto" in line_with_price
    assert "Umbral Mayorista: 40" in line_with_price
    assert "Precio: $195.50" in line_with_price
    assert "Material: Portland Tipo II" in line_with_price
    assert "Fragua rapida: Sí" in line_with_price

    line_no_price = CatalogContextBuilder.format_product_line(prod, allow_price_disclosure=False)
    assert "Precio:" not in line_no_price
    assert "**Cemento Gris 50kg**" in line_no_price


def test_catalog_pruning_large_catalog():
    products = []
    for i in range(20):
        p = Product(
            name=f"Herramienta {i}",
            brand="ToolBrand",
            description=f"Descripción para martillo de bola {i}" if i == 5 else "Herramienta general"
        )
        products.append(p)

    # Search for "martillo"
    pruned = CatalogContextBuilder.prune_catalog(products, user_message="Necesito un martillo para carpintería", max_items=5)
    assert len(pruned) <= 5
    assert any("Herramienta 5" in p.name for p in pruned)


def test_build_catalog_context_guardrails():
    prod = Product(
        name="Varilla Corrugada 3/8",
        brand="Acero Mex",
        price=180.0,
        custom_fields={"grado": 42, "norma": "NMX-B-506"}
    )

    # 1. Price enabled
    context_allowed = CatalogContextBuilder.build_catalog_context([prod], allow_price_disclosure=True)
    assert "CATÁLOGO DE PRODUCTOS DISPONIBLES" in context_allowed
    assert "Varilla Corrugada 3/8" in context_allowed
    assert "Precio: $180.00" in context_allowed
    assert "REGLA INQUEBRANTABLE DE NO-NEGOCIACIÓN" in context_allowed
    assert "COMPARACIÓN DE PRODUCTOS" in context_allowed
    assert "RECOMENDACIÓN SEGÚN NECESIDAD" in context_allowed

    # 2. Price disabled
    context_disallowed = CatalogContextBuilder.build_catalog_context([prod], allow_price_disclosure=False)
    assert "Precio: $" not in context_disallowed
    assert "POLÍTICA DE PRECIOS (CONFIDENCIAL)" in context_disallowed
    assert "NO estás autorizado a proporcionar precios" in context_disallowed
