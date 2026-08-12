
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr

from database import supabase


# ==========================================
# KOLO MUSIC AUTHENTICATION ROUTES
# ==========================================
#
# Handles:
# - Listener registration
# - Artist registration
# - User login
#
# Routes:
# POST /auth/register
# POST /auth/login
#
# ==========================================


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


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
        # VALIDATE BASIC INFORMATION
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
        # VALIDATE ARTIST INFORMATION
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

        # --------------------------------------
        # CHECK AUTH RESPONSE
        # --------------------------------------

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

        # Duplicate account
        if (
            "already registered" in error_lower
            or "already exists" in error_lower
        ):
            raise HTTPException(
                status_code=409,
                detail="An account with this email already exists"
            )

        # Email signups disabled
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
        # SUPABASE AUTHENTICATION
        # ======================================

        auth_response = (
            supabase.auth.sign_in_with_password(
                {
                    "email": email,
                    "password": password
                }
            )
        )

        # ======================================
        # CHECK AUTHENTICATION RESULT
        # ======================================

        if not auth_response.user:
            raise HTTPException(
                status_code=401,
                detail="Invalid email or password"
            )

        user_id = auth_response.user.id

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
    # SUPABASE / UNEXPECTED ERRORS
    # ======================================

    except Exception as e:

        print("================================")
        print("LOGIN ERROR:", repr(e))
        print("================================")

        error_message = str(e)
        error_lower = error_message.lower()

        # --------------------------------------
        # EMAIL NOT CONFIRMED
        # --------------------------------------

        if "email not confirmed" in error_lower:

            raise HTTPException(
                status_code=403,
                detail=(
                    "Email not confirmed. "
                    "Please confirm your email first."
                )
            )

        # --------------------------------------
        # INVALID CREDENTIALS
        # --------------------------------------

        if (
            "invalid login credentials" in error_lower
            or "invalid_credentials" in error_lower
        ):

            raise HTTPException(
                status_code=401,
                detail="Invalid email or password."
            )

        # --------------------------------------
        # OTHER ERROR
        # --------------------------------------

        raise HTTPException(
            status_code=400,
            detail=error_message
        )
