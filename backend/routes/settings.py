from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from backend.database import supabase
from backend.security import require_admin


# =========================================================
# KOLO MUSIC SETTINGS ROUTER
# =========================================================

router = APIRouter(
    prefix="/settings",
    tags=["Settings"]
)


# =========================================================
# SETTINGS UPDATE MODEL
# =========================================================

class SettingsUpdate(BaseModel):
    scream_price: float | None = None
    platform_fee_percent: float | None = None
    artist_percent: float | None = None

    listener_registration_enabled: bool | None = None
    artist_registration_enabled: bool | None = None
    maintenance_mode: bool | None = None

    homepage_title: str | None = None
    homepage_message: str | None = None


# =========================================================
# GET PUBLIC PLATFORM SETTINGS
# =========================================================

@router.get("")
def get_settings():

    try:

        result = (
            supabase
            .table("platform_settings")
            .select(
                """
                id,
                scream_price,
                platform_fee_percent,
                artist_percent,
                listener_registration_enabled,
                artist_registration_enabled,
                maintenance_mode,
                homepage_title,
                homepage_message,
                created_at,
                updated_at
                """
            )
            .limit(1)
            .execute()
        )

        if not result.data:

            raise HTTPException(
                status_code=404,
                detail="Platform settings not found"
            )

        return {
            "success": True,
            "settings": result.data[0]
        }

    except HTTPException:
        raise

    except Exception as e:

        print(
            "GET SETTINGS ERROR:",
            repr(e)
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to load platform settings"
        )


# =========================================================
# UPDATE PLATFORM SETTINGS
# ADMIN ONLY
# =========================================================

@router.put("")
def update_settings(
    settings: SettingsUpdate,
    admin=Depends(require_admin)
):

    try:

        # ---------------------------------------------
        # GET CURRENT SETTINGS ROW
        # ---------------------------------------------

        existing = (
            supabase
            .table("platform_settings")
            .select("id")
            .limit(1)
            .execute()
        )

        if not existing.data:

            raise HTTPException(
                status_code=404,
                detail="Platform settings not found"
            )

        settings_id = existing.data[0]["id"]


        # ---------------------------------------------
        # BUILD UPDATE DATA
        # ---------------------------------------------

        update_data = {}

        if settings.scream_price is not None:

            if settings.scream_price <= 0:

                raise HTTPException(
                    status_code=400,
                    detail="Scream price must be greater than 0"
                )

            update_data["scream_price"] = settings.scream_price


        if settings.platform_fee_percent is not None:

            if not 0 <= settings.platform_fee_percent <= 100:

                raise HTTPException(
                    status_code=400,
                    detail="Platform fee must be between 0 and 100"
                )

            update_data["platform_fee_percent"] = (
                settings.platform_fee_percent
            )


        if settings.artist_percent is not None:

            if not 0 <= settings.artist_percent <= 100:

                raise HTTPException(
                    status_code=400,
                    detail="Artist percentage must be between 0 and 100"
                )

            update_data["artist_percent"] = (
                settings.artist_percent
            )


        if settings.listener_registration_enabled is not None:

            update_data[
                "listener_registration_enabled"
            ] = settings.listener_registration_enabled


        if settings.artist_registration_enabled is not None:

            update_data[
                "artist_registration_enabled"
            ] = settings.artist_registration_enabled


        if settings.maintenance_mode is not None:

            update_data[
                "maintenance_mode"
            ] = settings.maintenance_mode


        if settings.homepage_title is not None:

            update_data[
                "homepage_title"
            ] = settings.homepage_title.strip()


        if settings.homepage_message is not None:

            update_data[
                "homepage_message"
            ] = settings.homepage_message.strip()


        # ---------------------------------------------
        # MAKE SURE SOMETHING WAS SENT
        # ---------------------------------------------

        if not update_data:

            raise HTTPException(
                status_code=400,
                detail="No settings were provided for update"
            )


        # ---------------------------------------------
        # UPDATE DATABASE
        # ---------------------------------------------

        result = (
            supabase
            .table("platform_settings")
            .update(update_data)
            .eq("id", settings_id)
            .execute()
        )


        if not result.data:

            raise HTTPException(
                status_code=500,
                detail="Settings could not be updated"
            )


        # ---------------------------------------------
        # SUCCESS
        # ---------------------------------------------

        print(
            "PLATFORM SETTINGS UPDATED:",
            update_data
        )

        return {
            "success": True,
            "message": "Platform settings updated successfully",
            "settings": result.data[0]
        }


    except HTTPException:
        raise

    except Exception as e:

        print(
            "UPDATE SETTINGS ERROR:",
            repr(e)
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to update platform settings"
        )