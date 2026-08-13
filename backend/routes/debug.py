import os
import requests

from fastapi import APIRouter

router = APIRouter(
    prefix="/debug",
    tags=["Debug"]
)

@router.get("/supabase")
def test_supabase():
    url = os.getenv("SUPABASE_URL")

    if not url:
        return {
            "ok": False,
            "error": "SUPABASE_URL is missing"
        }

    try:
        response = requests.get(
            f"{url}/auth/v1/health",
            timeout=10
        )

        return {
            "ok": True,
            "status_code": response.status_code,
            "response": response.text
        }

    except Exception as e:
        return {
            "ok": False,
            "error_type": type(e).__name__,
            "error": repr(e)
        }
