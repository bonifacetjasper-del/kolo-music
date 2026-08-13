import os
from pathlib import Path

from dotenv import load_dotenv
from supabase import create_client


# =========================================================
# KOLO MUSIC - SUPABASE DATABASE CONFIGURATION
# =========================================================

# Get the directory where this database.py file lives.
# Example:
# C:\Users\USA\Desktop\KOLO MUSIC\backend
BASE_DIR = Path(__file__).resolve().parent


# =========================================================
# LOAD LOCAL ENVIRONMENT VARIABLES
# =========================================================

# Local development:
# backend/.env
#
# Vercel:
# Environment variables are supplied automatically by Vercel.
load_dotenv(BASE_DIR / ".env")


# =========================================================
# READ SUPABASE CONFIGURATION
# =========================================================

SUPABASE_URL = os.getenv("SUPABASE_URL")

# Server-side Supabase key.
# This MUST be the service-role/server key.
SUPABASE_SERVICE_ROLE_KEY = os.getenv(
    "SUPABASE_SERVICE_ROLE_KEY"
)


# =========================================================
# VALIDATE CONFIGURATION
# =========================================================

if not SUPABASE_URL:
    raise RuntimeError(
        "SUPABASE_URL is missing. "
        "Add it to backend/.env locally or "
        "Vercel Environment Variables in production."
    )


if not SUPABASE_SERVICE_ROLE_KEY:
    raise RuntimeError(
        "SUPABASE_SERVICE_ROLE_KEY is missing. "
        "Add it to backend/.env locally or "
        "Vercel Environment Variables in production."
    )


# =========================================================
# CREATE SUPABASE CLIENT
# =========================================================

try:

    supabase = create_client(
        SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY
    )

except Exception as error:

    raise RuntimeError(
        f"Failed to initialize Supabase client: {error}"
    ) from error


# =========================================================
# CONNECTION STATUS
# =========================================================

print("Supabase backend connection initialized.")