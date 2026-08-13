# =========================================================
# KOLO MUSIC - VERCEL API ENTRY POINT
# =========================================================

import os
import sys

# Add the KOLO MUSIC project root to Python's import path
PROJECT_ROOT = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..")
)

if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

# Import FastAPI application
from backend.main import app
