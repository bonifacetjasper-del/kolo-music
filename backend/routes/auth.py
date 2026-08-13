
import os
import requests

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr

from backend.database import supabase


# ==========================================
# KOLO MUSIC AUTHENTICATION ROUTES
# ==========================================

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


# ==========================================
# SUPABASE CONFIGURATION
# ==========================================

SUPABASE_URL = os.getenv("SUPABASE_URL")

if not SUPABASE_URL:
    raise RuntimeError("SUPABASE_URL is missing")


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

        # --------------------------------------
        # CLEAN INPUT
        # --------------------------------------

        email = str(user.email).strip().lower()
        full_name = user.full_name.strip()
        role = user.role.strip().lower()

        # --------------------------------------
        # BASIC VALIDATION
        # --------------------------------------

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

        # --------------------------------------
        # VALIDATE ROLE
        # --------------------------------------

        if role not in ["listener", "artist"]:
            raise HTTPException(
                status_code=400,
                detail="Role must be listener or artist"
            )

        # --------------------------------------
        # VALIDATE ARTIST
        # --------------------------------------

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

        # ======================================
        # CREATE SUPABASE AUTH ACCOUNT
        # ======================================

        auth_response = supabase.auth.sign_up(
            {
                "email": email,
                "password": user.password
            }
        )

        if not auth_response.user:

            raise HTTPException(
                status_code=400,
                detail="Unable to create authentication account"
            )

        user_id = auth_response.user.id

        # ======================================
        # CREATE USER PROFILE
        # ======================================

        profile_data = {
            "id": user_id,
            "full_name": full_name,
            "phone": user.phone,
            "role": role
        }

        profile_response = (
            supabase
            .table("users")
            .insert(profile_data)
            .execute()
        )

        if not profile_response.data:

            raise HTTPException(
                status_code=400,
                detail=(
                    "Authentication account created, "
                    "but user profile could not be created"
                )
            )

        # ======================================
        # CREATE ARTIST PROFILE
        # ======================================

        if role == "artist":

            artist_response = (
                supabase
                .table("artists")
                .insert(
                    {
                        "user_id": user_id,
                        "artist_name": artist_name,
                        "bio": user.bio,
                        "status": "pending"
                    }
                )
                .execute()
            )

            if not artist_response.data:

                raise HTTPException(
                    status_code=400,
                    detail="Artist account could not be created"
                )

            # ==================================
            # CREATE ARTIST WALLET
            # ==================================

            wallet_response = (
                supabase
                .table("wallets")
                .insert(
                    {
                        "user_id": user_id,
                        "balance": 0,
                        "total_earned": 0
                    }
                )
                .execute()
            )

            if not wallet_response.data:

                raise HTTPException(
                    status_code=400,
                    detail="Artist wallet could not be created"
                )

        # ======================================
        # REGISTRATION SUCCESS
        # ======================================

        return {
            "message": "Registration successful",
            "user_id": user_id,
            "role": role,
            "email": email
        }

    # ======================================
    # EXPECTED ERRORS
    # ======================================

    except HTTPException:
        raise

    # ======================================
    # UNEXPECTED ERRORS
    # ======================================

    except Exception as e:

        print("================================")
        print("REGISTRATION ERROR:", repr(e))
        print("================================")

        error_message = str(e)
        error_lower = error_message.lower()

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
                detail="Email signups are disabled in Supabase."
            )

        raise HTTPException(
            status_code=400,
            detail=error_message
        )


# ==========================================
# USER LOGIN
# ==========================================

@router.post("/login")
def login_user(user: LoginUser):

    try:

        # --------------------------------------
        # CLEAN LOGIN INPUT
        # --------------------------------------

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

        # ======================================
        # SUPABASE AUTH HTTP LOGIN
        # ======================================

        auth_url = (
            f"{SUPABASE_URL}/auth/v1/token"
            "?grant_type=password"
        )

        service_key = os.getenv(
            "SUPABASE_SERVICE_ROLE_KEY"
        )

        if not service_key:

            raise HTTPException(
                status_code=500,
                detail="Supabase service key is missing"
            )

        headers = {
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
            "Content-Type": "application/json"
        }

        payload = {
            "email": email,
            "password": password
        }

        response = requests.post(
            auth_url,
            headers=headers,
            json=payload,
            timeout=15
        )

        # ======================================
        # HANDLE AUTH ERRORS
        # ======================================

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

            error_lower = str(
                error_message
            ).lower()

            if "email not confirmed" in error_lower:

                raise HTTPException(
                    status_code=403,
                    detail=(
                        "Email not confirmed. "
                        "Please confirm your email first."
                    )
                )

            if (
                "invalid login credentials" in error_lower
                or "invalid_credentials" in error_lower
                or "invalid grant" in error_lower
            ):

                raise HTTPException(
                    status_code=401,
                    detail="Invalid email or password."
                )

            raise HTTPException(
                status_code=response.status_code,
                detail=str(error_message)
            )

        # ======================================
        # PARSE AUTH RESPONSE
        # ======================================

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
                detail="Invalid email or password."
            )

        user_id = auth_user.get("id")

        if not user_id:

            raise HTTPException(
                status_code=401,
                detail="Authentication failed."
            )

        # ======================================
        # GET USER PROFILE
        # ======================================

        profile_response = (
            supabase
            .table("users")
            .select(
                "id, full_name, phone, role"
            )
            .eq(
                "id",
                user_id
            )
            .execute()
        )

        # --------------------------------------
        # PROFILE DOES NOT EXIST
        # --------------------------------------

        if not profile_response.data:

            raise HTTPException(
                status_code=404,
                detail=(
                    "Authentication successful, "
                    "but user profile was not found"
                )
            )

        profile = profile_response.data[0]

        # ======================================
        # LOGIN SUCCESS
        # ======================================

        print("================================")
        print("LOGIN SUCCESS")
        print("USER:", email)
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

    # ======================================
    # EXPECTED ERRORS
    # ======================================

    except HTTPException:
        raise

    # ======================================
    # UNEXPECTED ERRORS
    # ======================================

    except requests.RequestException as e:

        print("================================")
        print("SUPABASE AUTH REQUEST ERROR:", repr(e))
        print("================================")

        raise HTTPException(
            status_code=502,
            detail="Unable to connect to Supabase authentication."
        )

    except Exception as e:

        print("================================")
        print("LOGIN ERROR:", repr(e))
        print("================================")

        raise HTTPException(
            status_code=400,
            detail=str(e)
        )
