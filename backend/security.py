from fastapi import HTTPException, Header

from backend.database import supabase



# =====================================
# CHECK ADMIN USER
# =====================================

def require_admin(
    user_id: str = Header(...)
):

    try:

        # Find user profile

        user = supabase.table("users") \
            .select("*") \
            .eq("id", user_id) \
            .execute()


        if not user.data:

            raise HTTPException(
                status_code=404,
                detail="User not found"
            )


        user_data = user.data[0]


        # Check role

        if user_data["role"] != "admin":

            raise HTTPException(
                status_code=403,
                detail="Admin access required"
            )


        return user_data



    except HTTPException:

        raise


    except Exception as e:

        raise HTTPException(
            status_code=400,
            detail=str(e)
        )
        
        # =====================================
# CHECK ARTIST USER
# =====================================

def require_artist(
    user_id: str = Header(...)
):

    try:

        # =====================================
        # FIND USER
        # =====================================

        user = (
            supabase
            .table("users")
            .select("*")
            .eq("id", user_id)
            .execute()
        )

        if not user.data:

            raise HTTPException(
                status_code=404,
                detail="User not found"
            )

        user_data = user.data[0]

        # =====================================
        # CHECK USER ROLE
        # =====================================

        if user_data.get("role") != "artist":

            raise HTTPException(
                status_code=403,
                detail="Artist access required"
            )

        # =====================================
        # FIND ARTIST PROFILE
        # =====================================

        artist = (
            supabase
            .table("artists")
            .select("*")
            .eq("user_id", user_id)
            .execute()
        )

        if not artist.data:

            raise HTTPException(
                status_code=404,
                detail="Artist profile not found"
            )

        artist_data = artist.data[0]

        # =====================================
        # CHECK ARTIST APPROVAL
        # =====================================

        if artist_data.get("status") != "approved":

            raise HTTPException(
                status_code=403,
                detail="Artist account is not approved"
            )

        # =====================================
        # RETURN ARTIST INFORMATION
        # =====================================

        return {
            "user": user_data,
            "artist": artist_data
        }

    except HTTPException:

        raise

    except Exception as e:

        print(
            "ARTIST AUTHENTICATION ERROR:",
            repr(e)
        )

        raise HTTPException(
            status_code=400,
            detail=str(e)
        )
