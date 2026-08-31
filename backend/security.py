from fastapi import HTTPException, Header, Depends
import os
import requests
from dotenv import load_dotenv

load_dotenv(".\backend\.env")

from backend.database import supabase


# ==========================================
# SUPABASE CONFIGURATION
# ==========================================

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv(
    "SUPABASE_SERVICE_ROLE_KEY"
)

if not SUPABASE_URL:
    raise RuntimeError("SUPABASE_URL is missing.")

if not SUPABASE_SERVICE_ROLE_KEY:
    raise RuntimeError(
        "SUPABASE_SERVICE_ROLE_KEY is missing."
    )


# ==========================================
# GET CURRENT AUTHENTICATED USER
# ==========================================

def get_current_user(
    authorization: str = Header(...)
):

    try:

        if not authorization:

            raise HTTPException(
                status_code=401,
                detail="Authorization header is required"
            )

        if not authorization.lower().startswith("bearer "):

            raise HTTPException(
                status_code=401,
                detail="Invalid authorization format"
            )

        access_token = authorization.split(
            " ",
            1
        )[1].strip()

        if not access_token:

            raise HTTPException(
                status_code=401,
                detail="Access token is required"
            )

        # ======================================
        # VERIFY TOKEN WITH SUPABASE AUTH
        # ======================================

        response = requests.get(
            f"{SUPABASE_URL}/auth/v1/user",
            headers={
                "apikey": SUPABASE_SERVICE_ROLE_KEY,
                "Authorization": f"Bearer {access_token}"
            },
            timeout=10
        )


        if response.status_code != 200:

            raise HTTPException(
                status_code=401,
                detail="Invalid or expired access token"
            )

        auth_user = response.json()

        user_id = auth_user.get("id")

        if not user_id:

            raise HTTPException(
                status_code=401,
                detail="Unable to identify authenticated user"
            )

        # ======================================
        # LOAD KOLO PROFILE
        # ======================================

        result = (
            supabase
            .table("users")
            .select("*")
            .eq("id", user_id)
            .limit(1)
            .execute()
        )

        if not result.data:

            raise HTTPException(
                status_code=404,
                detail="User profile not found"
            )

        return result.data[0]

    except HTTPException:
        raise

    except requests.RequestException as e:

        print(
            "AUTH TOKEN VERIFICATION ERROR:",
            repr(e)
        )

        raise HTTPException(
            status_code=503,
            detail="Authentication service unavailable"
        )

    except Exception as e:

        print(
            "CURRENT USER ERROR:",
            repr(e)
        )

        raise HTTPException(
            status_code=401,
            detail="Authentication failed"
        )


# ==========================================
# REQUIRE ADMIN
# ==========================================

def require_admin(
    user=Depends(get_current_user)
):

    try:

        if user.get("role") != "admin":

            raise HTTPException(
                status_code=403,
                detail="Admin access required"
            )

        return user

    except HTTPException:
        raise

    except Exception as e:

        print(
            "ADMIN AUTHORIZATION ERROR:",
            repr(e)
        )

        raise HTTPException(
            status_code=403,
            detail="Admin authorization failed"
        )


# ==========================================
# REQUIRE ARTIST
# ==========================================

def require_artist(
    user=Depends(get_current_user)
):

    try:

        if user.get("role") != "artist":

            raise HTTPException(
                status_code=403,
                detail="Artist access required"
            )

        # ======================================
        # FIND ARTIST PROFILE
        # ======================================

        artist = (
            supabase
            .table("artists")
            .select("*")
            .eq("user_id", user["id"])
            .limit(1)
            .execute()
        )

        if not artist.data:

            raise HTTPException(
                status_code=404,
                detail="Artist profile not found"
            )

        artist_data = artist.data[0]

        # ======================================
        # CHECK APPROVAL
        # ======================================

        if artist_data.get("status") != "approved":

            raise HTTPException(
                status_code=403,
                detail="Artist account is not approved"
            )

        return {
            "user": user,
            "artist": artist_data
        }

    except HTTPException:
        raise

    except Exception as e:

        print(
            "ARTIST AUTHORIZATION ERROR:",
            repr(e)
        )

        raise HTTPException(
            status_code=403,
            detail="Artist authorization failed"
        )




