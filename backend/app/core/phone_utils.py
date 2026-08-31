import re

def clean_phone_digits(val: str | None) -> str:
    """Strip all non-digit characters from a phone number."""
    if not val:
        return ""
    return re.sub(r"\D", "", str(val))

def format_display_phone(phone_str: str | None) -> str:
    """
    Formats phone numbers into clean international display format.
    
    For Mexico (+52):
      - 5218186582756 -> +52 1 8186582756
      - 528186582756  -> +52 1 8186582756
      - 8186582756    -> +52 1 8186582756
    
    For US/Canada (+1):
      - 15551234567   -> +1 5551234567
      
    For other countries:
      - Formats with leading +
    """
    if not phone_str:
        return ""
    digits = clean_phone_digits(phone_str)
    if not digits:
        return str(phone_str).strip()
    
    # Mexico formatting
    if digits.startswith("521") and len(digits) == 13:
        # e.g. 5218186582756 -> +52 1 8186582756
        return f"+52 1 {digits[3:]}"
    elif digits.startswith("52") and len(digits) == 12:
        # e.g. 528186582756 -> +52 1 8186582756
        return f"+52 1 {digits[2:]}"
    elif len(digits) == 10:
        # 10-digit Mexican national number -> +52 1 XXXXXXXXXX
        return f"+52 1 {digits}"
    elif digits.startswith("1") and len(digits) == 11:
        # US/Canada 11-digit -> +1 XXXXXXXXXX
        return f"+1 {digits[1:]}"
    else:
        return f"+{digits}"

def format_e164_phone(phone_str: str | None) -> str:
    """
    Formats phone numbers into standard E.164 without spaces for API calls.
    e.g. 5218186582756 -> +5218186582756
    """
    if not phone_str:
        return ""
    digits = clean_phone_digits(phone_str)
    if not digits:
        return ""
    return f"+{digits}"
