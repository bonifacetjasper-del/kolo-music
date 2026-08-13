# ==========================================
# KOLO MUSIC - AUTHENTICATION ROUTES
# ==========================================

import os
import requests

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr

from backend.database import supabase


# ==========================================
# ROUTER
# ==========================================

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


# ==========================================
# SUPABASE CONFIGURATION
# ==========================================

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv(
    "SUPABASE_SERVICE_ROLE_KEY"
)

if not SUPABASE_URL:
    raise RuntimeError(
        "SUPABASE_URL is missing."
    )

if not SUPABASE_SERVICE_ROLE_KEY:
    raise RuntimeError(
        "SUPABASE_SERVICE_ROLE_KEY is missing."
    )


# ==========================================
# COMMON SUPABASE HEADERS
# ==========================================

SUPABASE_HEADERS = {
    "apikey": SUPABASE_SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
    "Content-Type": "application/json",
}


# ==========================================
# REGISTRATION MODEL
# ==========================================

class RegisterUser(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone: str | None = None
    role: str = "listener"
    artist_name: str | None = None
    bio: str | None = None


# ==========================================
# LOGIN MODEL
# ==========================================

class LoginUser(BaseModel):
    email: EmailStr
    password: str


# ==========================================
# REGISTER USER
# ==========================================

@router.post("/register")
def register_user(user: RegisterUser):

    try:

        # ----------------------------------
        # CLEAN INPUT
        # ----------------------------------

        email = str(user.email).strip().lower()
        full_name = user.full_name.strip()
        role = user.role.strip().lower()

        # ----------------------------------
        # BASIC VALIDATION
        # ----------------------------------

        if not full_name:
            raise HTTPException(
                status_code=400,
                detail="Full name is required"
            )

        if len(user.password) < 6:
            raise HTTPException(
                status_code=400,
                detail="Password must be at least 6 characters"
            )

        # ----------------------------------
        # VALIDATE ROLE
        # ----------------------------------

        if role not in ["listener", "artist"]:
            raise HTTPException(
                status_code=400,
                detail="Role must be listener or artist"
            )

        # ----------------------------------
        # VALIDATE ARTIST INFORMATION
        # ----------------------------------

        artist_name = None

        if role == "artist":

            if not user.artist_name:
                raise HTTPException(
                    status_code=400,
                    detail="Artist name is required"
                )

            artist_name = user.artist_name.strip()

            if not artist_name:
                raise HTTPException(
                    status_code=400,
                    detail="Artist name is required"
                )

        # ==================================
        # CREATE SUPABASE AUTH ACCOUNT
        # ==================================

        auth_url = (
            f"{SUPABASE_URL}"
            "/auth/v1/signup"
        )

        payload = {
            "email": email,
            "password": user.password
        }

        response = requests.post(
            auth_url,
            headers=SUPABASE_HEADERS,
            json=payload,
            timeout=15
        )

        # ----------------------------------
        # HANDLE SUPABASE AUTH ERROR
        # ----------------------------------

        if response.status_code not in [200, 201]:

            try:
                error_data = response.json()
            except Exception:
                error_data = {}

            error_message = (
                error_data.get("msg")
                or error_data.get("message")
                or error_data.get("error_description")
                or error_data.get("error")
                or "Unable to create authentication account."
            )

            error_lower = str(
                error_message
            ).lower()

            if (
                "already registered" in error_lower
                or "already exists" in error_lower
            ):
                raise HTTPException(
                    status_code=409,
                    detail="An account with this email already exists"
                )

            if "email signups are disabled" in error_lower:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        "Email signups are disabled in Supabase."
                    )
                )

            raise HTTPException(
                status_code=response.status_code,
                detail=str(error_message)
            )

        # ==================================
        # GET AUTH USER
        # ==================================

        auth_data = response.json()

        auth_user = auth_data.get("user")

        if not auth_user:

            raise HTTPException(
                status_code=400,
                detail=(
                    "Authentication account was created "
                    "but no user was returned."
                )
            )

        user_id = auth_user.get("id")

        if not user_id:

            raise HTTPException(
                status_code=400,
                detail="Unable to determine user ID."
            )

        # ==================================
        # CREATE USER PROFILE
        # ==================================

        profile_url = (
            f"{SUPABASE_URL}"
            "/rest/v1/users"
        )

        profile_data = {
            "id": user_id,
            "full_name": full_name,
            "phone": user.phone,
            "role": role
        }

        profile_headers = {
            **SUPABASE_HEADERS,
            "Prefer": "return=representation"
        }

        profile_response = requests.post(
            profile_url,
            headers=profile_headers,
            json=profile_data,
            timeout=15
        )

        if profile_response.status_code not in [200, 201]:

            try:
                error_data = profile_response.json()
            except Exception:
                error_data = {}

            error_message = (
                error_data.get("message")
                or error_data.get("hint")
                or error_data.get("details")
                or "User profile could not be created."
            )

            raise HTTPException(
                status_code=400,
                detail=str(error_message)
            )

        # ==================================
        # CREATE ARTIST PROFILE
        # ==================================

        if role == "artist":

            artist_url = (
                f"{SUPABASE_URL}"
                "/rest/v1/artists"
            )

            artist_data = {
                "user_id": user_id,
                "artist_name": artist_name,
                "bio": user.bio,
                "status": "pending"
            }

            artist_headers = {
                **SUPABASE_HEADERS,
                "Prefer": "return=representation"
            }

            artist_response = requests.post(
                artist_url,
                headers=artist_headers,
                json=artist_data,
                timeout=15
            )

            if artist_response.status_code not in [200, 201]:

                try:
                    error_data = artist_response.json()
                except Exception:
                    error_data = {}

                error_message = (
                    error_data.get("message")
                    or error_data.get("hint")
                    or error_data.get("details")
                    or "Artist account could not be created."
                )

                raise HTTPException(
                    status_code=400,
                    detail=str(error_message)
                )

            # ==============================
            # CREATE ARTIST WALLET
            # ==============================

            wallet_url = (
                f"{SUPABASE_URL}"
                "/rest/v1/wallets"
            )

            wallet_data = {
                "user_id": user_id,
                "balance": 0,
                "total_earned": 0
            }

            wallet_response = requests.post(
                wallet_url,
                headers=artist_headers,
                json=wallet_data,
                timeout=15
            )

            if wallet_response.status_code not in [200, 201]:

                try:
                    error_data = wallet_response.json()
                except Exception:
                    error_data = {}

                error_message = (
                    error_data.get("message")
                    or error_data.get("hint")
                    or error_data.get("details")
                    or "Artist wallet could not be created."
                )

                raise HTTPException(
                    status_code=400,
                    detail=str(error_message)
                )

        # ==================================
        # REGISTRATION SUCCESS
        # ==================================

        return {
            "message": "Registration successful",
            "user_id": user_id,
            "role": role,
            "email": email
        }

    # ==================================
    # EXPECTED ERRORS
    # ==================================

    except HTTPException:
        raise

    # ==================================
    # CONNECTION ERRORS
    # ==================================

    except requests.RequestException as e:

        print("================================")
        print(
            "SUPABASE REGISTRATION "
            "REQUEST ERROR:",
            repr(e)
        )
        print("================================")

        raise HTTPException(
            status_code=502,
            detail=(
                "Unable to connect to "
                "Supabase authentication."
            )
        )

    # ==================================
    # UNEXPECTED ERRORS
    # ==================================

    except Exception as e:

        print("================================")
        print(
            "REGISTRATION ERROR:",
            repr(e)
        )
        print("================================")

        raise HTTPException(
            status_code=400,
            detail=str(e)
        )


# ==========================================
# USER LOGIN
# ==========================================

@router.post("/login")
def login_user(user: LoginUser):

    try:

        # ----------------------------------
        # CLEAN LOGIN INPUT
        # ----------------------------------

        email = str(user.email).strip().lower()
        password = user.password

        if not email:

            raise HTTPException(
                status_code=400,
                detail="Email is required"
            )

        if not password:

            raise HTTPException(
                status_code=400,
                detail="Password is required"
            )

        # ==================================
        # SUPABASE AUTH LOGIN
        # ==================================

        auth_url = (
            f"{SUPABASE_URL}"
            "/auth/v1/token"
            "?grant_type=password"
        )

        payload = {
            "email": email,
            "password": password
        }

        print("================================")
        print("KOLO LOGIN")
        print("EMAIL:", email)
        print("SUPABASE URL:", SUPABASE_URL)
        print("================================")

        response = requests.post(
            auth_url,
            headers=SUPABASE_HEADERS,
            json=payload,
            timeout=15
        )

        print(
            "SUPABASE AUTH STATUS:",
            response.status_code
        )

        # ==================================
        # AUTHENTICATION FAILED
        # ==================================

        if response.status_code != 200:

            try:
                error_data = response.json()
            except Exception:
                error_data = {}

            error_message = (
                error_data.get("msg")
                or error_data.get("message")
                or error_data.get("error_description")
                or error_data.get("error")
                or "Invalid email or password."
            )

            print(
                "SUPABASE AUTH ERROR:",
                error_message
            )

            error_lower = str(
                error_message
            ).lower()

            # --------------------------------
            # EMAIL NOT CONFIRMED
            # --------------------------------

            if "email not confirmed" in error_lower:

                raise HTTPException(
                    status_code=403,
                    detail=(
                        "Email not confirmed. "
                        "Please confirm your email first."
                    )
                )

            # --------------------------------
            # INVALID LOGIN
            # --------------------------------

            if (
                "invalid login credentials"
                in error_lower
                or "invalid_credentials"
                in error_lower
                or "invalid grant"
                in error_lower
            ):

                raise HTTPException(
                    status_code=401,
                    detail="Invalid email or password."
                )

            raise HTTPException(
                status_code=response.status_code,
                detail=str(error_message)
            )

        # ==================================
        # PARSE AUTH RESPONSE
        # ==================================

        auth_data = response.json()

        access_token = auth_data.get(
            "access_token"
        )

        refresh_token = auth_data.get(
            "refresh_token"
        )

        auth_user = auth_data.get(
            "user"
        )

        if not auth_user:

            raise HTTPException(
                status_code=401,
                detail="Authentication failed."
            )

        user_id = auth_user.get("id")

        if not user_id:

            raise HTTPException(
                status_code=401,
                detail="Authentication failed."
            )

        # ==================================
        # GET USER PROFILE
        # ==================================

        profile_url = (
            f"{SUPABASE_URL}"
            "/rest/v1/users"
            f"?id=eq.{user_id}"
            "&select=id,full_name,phone,role"
        )

        profile_response = requests.get(
            profile_url,
            headers=SUPABASE_HEADERS,
            timeout=15
        )

        print(
            "PROFILE STATUS:",
            profile_response.status_code
        )

        # ==================================
        # PROFILE REQUEST FAILED
        # ==================================

        if profile_response.status_code != 200:

            print(
                "PROFILE ERROR:",
                profile_response.text
            )

            raise HTTPException(
                status_code=500,
                detail=(
                    "Authentication successful, "
                    "but the user profile could not "
                    "be loaded."
                )
            )

        profile_data = profile_response.json()

        # ==================================
        # PROFILE DOES NOT EXIST
        # ==================================

        if not profile_data:

            raise HTTPException(
                status_code=404,
                detail=(
                    "Authentication successful, "
                    "but user profile was not found."
                )
            )

        profile = profile_data[0]

        # ==================================
        # LOGIN SUCCESS
        # ==================================

        print("================================")
        print("LOGIN SUCCESS")
        print("USER:", email)
        print("USER ID:", user_id)
        print("ROLE:", profile.get("role"))
        print("================================")

        return {
            "message": "Login successful",

            "access_token": access_token,

            "refresh_token": refresh_token,

            "token_type": "bearer",

            "user": {
                "id": profile["id"],
                "full_name": profile["full_name"],
                "phone": profile.get("phone"),
                "role": profile["role"]
            }
        }

    # ==================================
    # EXPECTED HTTP ERRORS
    # ==================================

    except HTTPException:
        raise

    # ==================================
    # SUPABASE CONNECTION ERROR
    # ==================================

    except requests.RequestException as e:

        print("================================")
        print(
            "SUPABASE AUTH REQUEST ERROR:",
            repr(e)
        )
        print("================================")

        raise HTTPException(
            status_code=502,
            detail=(
                "Unable to connect to "
                "Supabase authentication."
            )
        )

    # ==================================
    # UNEXPECTED ERROR
    # ==================================

    except Exception as e:

        print("================================")
        print(
            "LOGIN ERROR:",
            repr(e)
        )
        print("================================")

        raise HTTPException(
            status_code=400,
            detail=str(e)
        )