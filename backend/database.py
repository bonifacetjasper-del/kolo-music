import os

from dotenv import load_dotenv
from supabase import create_client


# =========================================================
# LOAD ENVIRONMENT VARIABLES
# =========================================================

load_dotenv()


SUPABASE_URL = os.getenv("SUPABASE_URL")

# Server-side key
# This MUST be your Supabase service-role key.
SUPABASE_SERVICE_ROLE_KEY = os.getenv(
    "SUPABASE_SERVICE_ROLE_KEY"
)


# =========================================================
# VALIDATE CONFIGURATION
# =========================================================

if not SUPABASE_URL:
    raise RuntimeError(
        "SUPABASE_URL is missing from .env"
    )


if not SUPABASE_SERVICE_ROLE_KEY:
    raise RuntimeError(
        "SUPABASE_SERVICE_ROLE_KEY is missing from .env"
    )


# =========================================================
# SUPABASE CLIENT
# =========================================================

supabase = create_client(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY
)


print("Supabase backend connection initialized.")