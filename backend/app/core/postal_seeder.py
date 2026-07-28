import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from app.models.trade import PostalCode

logger = logging.getLogger(__name__)

# High-density database of key Mexican postal codes for main cities
CORE_POSTAL_CODES = [
    # --- Ciudad de México (CDMX) ---
    {"zip_code": "04210", "colonia": "Portales Sur", "municipality": "Benito Juárez", "city": "CDMX", "state": "CDMX"},
    {"zip_code": "04210", "colonia": "Portales Norte", "municipality": "Benito Juárez", "city": "CDMX", "state": "CDMX"},
    {"zip_code": "03330", "colonia": "Xoco", "municipality": "Benito Juárez", "city": "CDMX", "state": "CDMX"},
    {"zip_code": "03310", "colonia": "Miravalle", "municipality": "Benito Juárez", "city": "CDMX", "state": "CDMX"},
    {"zip_code": "04220", "colonia": "Portales Oriente", "municipality": "Benito Juárez", "city": "CDMX", "state": "CDMX"},
    {"zip_code": "04510", "colonia": "Pedregal de Santo Domingo", "municipality": "Coyoacán", "city": "CDMX", "state": "CDMX"},
    {"zip_code": "04000", "colonia": "Coyoacán Centro", "municipality": "Coyoacán", "city": "CDMX", "state": "CDMX"},
    {"zip_code": "04100", "colonia": "Del Carmen", "municipality": "Coyoacán", "city": "CDMX", "state": "CDMX"},
    {"zip_code": "05000", "colonia": "Lomas de Vista Hermosa", "municipality": "Cuajimalpa de Morelos", "city": "CDMX", "state": "CDMX"},
    {"zip_code": "05100", "colonia": "Lomas de Chamizal", "municipality": "Cuajimalpa de Morelos", "city": "CDMX", "state": "CDMX"},
    {"zip_code": "01000", "colonia": "San Ángel", "municipality": "Álvaro Obregón", "city": "CDMX", "state": "CDMX"},
    {"zip_code": "01010", "colonia": "Chimalistac", "municipality": "Álvaro Obregón", "city": "CDMX", "state": "CDMX"},
    {"zip_code": "06700", "colonia": "Roma Norte", "municipality": "Cuauhtémoc", "city": "CDMX", "state": "CDMX"},
    {"zip_code": "06100", "colonia": "Condesa", "municipality": "Cuauhtémoc", "city": "CDMX", "state": "CDMX"},
    {"zip_code": "06140", "colonia": "Hipódromo Condesa", "municipality": "Cuauhtémoc", "city": "CDMX", "state": "CDMX"},
    {"zip_code": "11560", "colonia": "Polanco III Sección", "municipality": "Miguel Hidalgo", "city": "CDMX", "state": "CDMX"},
    {"zip_code": "11510", "colonia": "Polanco I Sección", "municipality": "Miguel Hidalgo", "city": "CDMX", "state": "CDMX"},
    {"zip_code": "11000", "colonia": "Lomas de Chapultepec", "municipality": "Miguel Hidalgo", "city": "CDMX", "state": "CDMX"},

    # --- Nuevo León (Monterrey Area) ---
    {"zip_code": "64000", "colonia": "Monterrey Centro", "municipality": "Monterrey", "city": "Monterrey", "state": "Nuevo León"},
    {"zip_code": "64010", "colonia": "Industrial", "municipality": "Monterrey", "city": "Monterrey", "state": "Nuevo León"},
    {"zip_code": "66220", "colonia": "San Pedro Garza García", "municipality": "San Pedro Garza García", "city": "Monterrey", "state": "Nuevo León"},
    {"zip_code": "66266", "colonia": "Valle de San Ángel", "municipality": "San Pedro Garza García", "city": "Monterrey", "state": "Nuevo León"},
    {"zip_code": "64610", "colonia": "Colinas de San Jerónimo", "municipality": "Monterrey", "city": "Monterrey", "state": "Nuevo León"},
    {"zip_code": "64700", "colonia": "Roma", "municipality": "Monterrey", "city": "Monterrey", "state": "Nuevo León"},
    {"zip_code": "64800", "colonia": "Tecnológico", "municipality": "Monterrey", "city": "Monterrey", "state": "Nuevo León"},

    # --- Jalisco (Guadalajara Area) ---
    {"zip_code": "44100", "colonia": "Guadalajara Centro", "municipality": "Guadalajara", "city": "Guadalajara", "state": "Jalisco"},
    {"zip_code": "44160", "colonia": "Americana", "municipality": "Guadalajara", "city": "Guadalajara", "state": "Jalisco"},
    {"zip_code": "45110", "colonia": "Lomas de Zapopan", "municipality": "Zapopan", "city": "Guadalajara", "state": "Jalisco"},
    {"zip_code": "45160", "colonia": "Providencia", "municipality": "Zapopan", "city": "Guadalajara", "state": "Jalisco"},

    # --- Yucatán (Mérida Area) ---
    {"zip_code": "97000", "colonia": "Mérida Centro", "municipality": "Mérida", "city": "Mérida", "state": "Yucatán"},
    {"zip_code": "97100", "colonia": "Itzimná", "municipality": "Mérida", "city": "Mérida", "state": "Yucatán"},
    {"zip_code": "97130", "colonia": "Chuminópolis", "municipality": "Mérida", "city": "Mérida", "state": "Yucatán"},

    # --- Puebla ---
    {"zip_code": "72000", "colonia": "Puebla Centro", "municipality": "Puebla", "city": "Puebla", "state": "Puebla"},
    {"zip_code": "72810", "colonia": "San Andrés Cholula", "municipality": "San Andrés Cholula", "city": "Puebla", "state": "Puebla"},

    # --- Querétaro ---
    {"zip_code": "76000", "colonia": "Querétaro Centro", "municipality": "Querétaro", "city": "Querétaro", "state": "Querétaro"},
    {"zip_code": "76150", "colonia": "Juriquilla", "municipality": "Querétaro", "city": "Querétaro", "state": "Querétaro"},

    # --- Oaxaca ---
    {"zip_code": "68000", "colonia": "Oaxaca Centro", "municipality": "Oaxaca de Juárez", "city": "Oaxaca", "state": "Oaxaca"},
    {"zip_code": "68020", "colonia": "Reforma", "municipality": "Oaxaca de Juárez", "city": "Oaxaca", "state": "Oaxaca"},
    {"zip_code": "68100", "colonia": "San Felipe del Agua", "municipality": "Oaxaca de Juárez", "city": "Oaxaca", "state": "Oaxaca"},

    # --- Veracruz ---
    {"zip_code": "94290", "colonia": "Boca del Río Centro", "municipality": "Boca del Río", "city": "Boca del Río", "state": "Veracruz"},
    {"zip_code": "94293", "colonia": "Fraccionamiento Las Américas", "municipality": "Boca del Río", "city": "Boca del Río", "state": "Veracruz"},
    {"zip_code": "91700", "colonia": "Veracruz Centro", "municipality": "Veracruz", "city": "Veracruz", "state": "Veracruz"},
    {"zip_code": "91910", "colonia": "Reforma", "municipality": "Veracruz", "city": "Veracruz", "state": "Veracruz"},

    # --- Additional CDMX municipalities & ZIP codes ---
    {"zip_code": "09000", "colonia": "San Ignacio", "municipality": "Iztapalapa", "city": "CDMX", "state": "CDMX"},
    {"zip_code": "09300", "colonia": "Constitución de 1917", "municipality": "Iztapalapa", "city": "CDMX", "state": "CDMX"},
    {"zip_code": "09810", "colonia": "Lomas de San Lorenzo", "municipality": "Iztapalapa", "city": "CDMX", "state": "CDMX"},
    {"zip_code": "07300", "colonia": "Villa Gustavo A. Madero", "municipality": "Gustavo A. Madero", "city": "CDMX", "state": "CDMX"},
    {"zip_code": "07700", "colonia": "Industrial", "municipality": "Gustavo A. Madero", "city": "CDMX", "state": "CDMX"},
    {"zip_code": "07000", "colonia": "Lindavista", "municipality": "Gustavo A. Madero", "city": "CDMX", "state": "CDMX"},
    {"zip_code": "14000", "colonia": "Tlalpan Centro", "municipality": "Tlalpan", "city": "CDMX", "state": "CDMX"},
    {"zip_code": "14050", "colonia": "Toriello Guerra", "municipality": "Tlalpan", "city": "CDMX", "state": "CDMX"},
    {"zip_code": "14200", "colonia": "Pedregal de San Nicolás", "municipality": "Tlalpan", "city": "CDMX", "state": "CDMX"},
    {"zip_code": "02000", "colonia": "Azcapotzalco Centro", "municipality": "Azcapotzalco", "city": "CDMX", "state": "CDMX"},
    {"zip_code": "02400", "colonia": "Clavería", "municipality": "Azcapotzalco", "city": "CDMX", "state": "CDMX"},
    {"zip_code": "16000", "colonia": "Xochimilco Centro", "municipality": "Xochimilco", "city": "CDMX", "state": "CDMX"},
    {"zip_code": "16090", "colonia": "San Jerónimo Coamilco", "municipality": "Xochimilco", "city": "CDMX", "state": "CDMX"},

    # --- Additional Nuevo León municipalities & ZIP codes ---
    {"zip_code": "67100", "colonia": "Guadalupe Centro", "municipality": "Guadalupe", "city": "Guadalupe", "state": "Nuevo León"},
    {"zip_code": "67140", "colonia": "Linda Vista", "municipality": "Guadalupe", "city": "Guadalupe", "state": "Nuevo León"},
    {"zip_code": "66400", "colonia": "San Nicolás de los Garza Centro", "municipality": "San Nicolás de los Garza", "city": "San Nicolás de los Garza", "state": "Nuevo León"},
    {"zip_code": "66450", "colonia": "Anáhuac", "municipality": "San Nicolás de los Garza", "city": "San Nicolás de los Garza", "state": "Nuevo León"},
    {"zip_code": "66600", "colonia": "Apodaca Centro", "municipality": "Apodaca", "city": "Apodaca", "state": "Nuevo León"},
    {"zip_code": "66612", "colonia": "La Fe", "municipality": "Apodaca", "city": "Apodaca", "state": "Nuevo León"},
    {"zip_code": "66350", "colonia": "Santa Catarina Centro", "municipality": "Santa Catarina", "city": "Santa Catarina", "state": "Nuevo León"},
    {"zip_code": "66050", "colonia": "General Escobedo Centro", "municipality": "General Escobedo", "city": "General Escobedo", "state": "Nuevo León"},

    # --- Additional Jalisco municipalities & ZIP codes ---
    {"zip_code": "45500", "colonia": "Tlaquepaque Centro", "municipality": "Tlaquepaque", "city": "Guadalajara", "state": "Jalisco"},
    {"zip_code": "45400", "colonia": "Tonalá Centro", "municipality": "Tonalá", "city": "Guadalajara", "state": "Jalisco"},

    # --- Additional Veracruz municipalities & ZIP codes ---
    {"zip_code": "91000", "colonia": "Xalapa Centro", "municipality": "Xalapa", "city": "Xalapa", "state": "Veracruz"},
    {"zip_code": "91090", "colonia": "Las Ánimas", "municipality": "Xalapa", "city": "Xalapa", "state": "Veracruz"},
    {"zip_code": "96400", "colonia": "Coatzacoalcos Centro", "municipality": "Coatzacoalcos", "city": "Coatzacoalcos", "state": "Veracruz"},
    {"zip_code": "94300", "colonia": "Orizaba Centro", "municipality": "Orizaba", "city": "Orizaba", "state": "Veracruz"},

    # --- Additional Oaxaca municipalities & ZIP codes ---
    {"zip_code": "68300", "colonia": "Tuxtepec Centro", "municipality": "San Juan Bautista Tuxtepec", "city": "Tuxtepec", "state": "Oaxaca"},
    {"zip_code": "70600", "colonia": "Salina Cruz Centro", "municipality": "Salina Cruz", "city": "Salina Cruz", "state": "Oaxaca"},
    {"zip_code": "70000", "colonia": "Juchitán Centro", "municipality": "Juchitán de Zaragoza", "city": "Juchitán", "state": "Oaxaca"},

    # --- Additional Puebla municipalities & ZIP codes ---
    {"zip_code": "72760", "colonia": "San Pedro Cholula Centro", "municipality": "San Pedro Cholula", "city": "Puebla", "state": "Puebla"},
    {"zip_code": "75700", "colonia": "Tehuacán Centro", "municipality": "Tehuacán", "city": "Tehuacán", "state": "Puebla"},

    # --- Additional Querétaro municipalities & ZIP codes ---
    {"zip_code": "76900", "colonia": "El Pueblito", "municipality": "Corregidora", "city": "Querétaro", "state": "Querétaro"},
    {"zip_code": "76240", "colonia": "Saldarriaga", "municipality": "El Marqués", "city": "Querétaro", "state": "Querétaro"},

    # --- Additional Yucatán municipalities & ZIP codes ---
    {"zip_code": "97320", "colonia": "Progreso Centro", "municipality": "Progreso", "city": "Progreso", "state": "Yucatán"},
    {"zip_code": "97700", "colonia": "Valladolid Centro", "municipality": "Valladolid", "city": "Valladolid", "state": "Yucatán"},
]


async def seed_postal_codes(db: AsyncSession):
    """Seed key Mexican postal codes if they do not exist already."""
    print("Seeding Postal Code lookups (SEPOMEX)...")
    
    # Clean existing postal codes
    await db.execute(delete(PostalCode))
    await db.flush()

    for item in CORE_POSTAL_CODES:
        pc = PostalCode(
            zip_code=item["zip_code"],
            colonia=item["colonia"],
            municipality=item["municipality"],
            city=item["city"],
            state=item["state"]
        )
        db.add(pc)
        
    await db.flush()
    print(f"Postal Code lookups preloaded successfully ({len(CORE_POSTAL_CODES)} records).")
