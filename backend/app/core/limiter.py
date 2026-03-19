from slowapi import Limiter
from slowapi.util import get_remote_address

# Initialize Limiter
# Using get_remote_address as the default key (rate limit by IP)
limiter = Limiter(key_func=get_remote_address)
