import sys
import os

# Add the backend folder to Python's import path
backend_path = os.path.join(
    os.path.dirname(os.path.dirname(__file__)),
    "backend"
)

if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from main import app

from backend.main import app