import pytest
from app.core.phone_utils import clean_phone_digits, format_display_phone, format_e164_phone

def test_clean_phone_digits():
    assert clean_phone_digits("+52 1 81 8658 2756") == "5218186582756"
    assert clean_phone_digits("+52 (81) 8658-2756") == "528186582756"
    assert clean_phone_digits(None) == ""
    assert clean_phone_digits("") == ""

def test_format_display_phone_mexico():
    # 13-digit with 521 prefix
    assert format_display_phone("5218186582756") == "+52 1 8186582756"
    assert format_display_phone("+52 1 81 8658 2756") == "+52 1 8186582756"
    
    # 12-digit with 52 prefix
    assert format_display_phone("528186582756") == "+52 1 8186582756"
    assert format_display_phone("+528186582756") == "+52 1 8186582756"
    
    # 10-digit national number
    assert format_display_phone("8186582756") == "+52 1 8186582756"
    assert format_display_phone("5512345678") == "+52 1 5512345678"

def test_format_display_phone_international():
    # US / Canada 11-digit
    assert format_display_phone("15551234567") == "+1 5551234567"
    assert format_display_phone("+1 555 123 4567") == "+1 5551234567"
    
    # Other countries
    assert format_display_phone("447911123456") == "+447911123456"

def test_format_e164_phone():
    assert format_e164_phone("5218186582756") == "+5218186582756"
    assert format_e164_phone("+52 1 81 8658 2756") == "+5218186582756"
