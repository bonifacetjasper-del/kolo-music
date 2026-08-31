from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.responses import Response, Response

from pydantic import BaseModel
import requests

from backend.database import supabase
from backend.security import require_artist


# ==========================================
# KOLO MUSIC ARTIST ROUTER
# ==========================================

router = APIRouter(
    prefix="/artist",
    tags=["Artist Dashboard"]
)


# ==========================================
# GET CURRENT ARTIST
# ==========================================

def get_current_artist(user_id: str):

    try:

        result = (
            supabase
            .table("artists")
            .select("*")
            .eq("user_id", user_id)
            .execute()
        )

        if not result.data:

            raise HTTPException(
                status_code=404,
                detail="Artist profile not found"
            )

        artist = result.data[0]

        return artist

    except HTTPException:
        raise

    except Exception as e:

        print(
            "GET CURRENT ARTIST ERROR:",
            repr(e)
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to load artist profile"
        )


# ==========================================
# ARTIST DASHBOARD
# ==========================================

@router.get("/dashboard")
def artist_dashboard(
    artist_context=Depends(require_artist)
):

    try:

        # ==================================
        # GET ARTIST
        # ==================================

        user_id = artist_context["user"]["id"]

        artist = artist_context["artist"]

        artist_id = artist["id"]


        # ==================================
        # CHECK ARTIST STATUS
        # ==================================

        if artist.get("status") != "approved":

            raise HTTPException(
                status_code=403,
                detail="Artist account is not approved"
            )


        # ==================================
        # GET WALLET
        # ==================================

        wallet_result = (
            supabase
            .table("wallets")
            .select("*")
            .eq("user_id", user_id)
            .execute()
        )


        wallet_data = {
            "id": None,
            "balance": 0,
            "total_earned": 0
        }


        if wallet_result.data:

            wallet = wallet_result.data[0]

            wallet_data = {
                "id": wallet.get("id"),
                "balance": wallet.get("balance", 0),
                "total_earned": wallet.get("total_earned", 0)
            }


        # ==================================
        # GET ARTIST SONGS
        # ==================================

        songs_result = (
            supabase
            .table("songs")
            .select("*")
            .eq("artist_id", artist_id)
            .execute()
        )


        songs = songs_result.data or []


        # ==================================
        # CALCULATE SALES
        # ==================================

        total_sales = 0

        total_revenue = 0

        approved_sales = []


        for song in songs:

            payments_result = (
                supabase
                .table("payments")
                .select("id,amount,status")
                .eq("song_id", song["id"])
                .eq("status", "approved")
                .execute()
            )


            payments = payments_result.data or []


            total_sales += len(payments)


            for payment in payments:

                amount = int(
                    payment.get("amount") or 0
                )

                total_revenue += amount


                approved_sales.append({
                    "payment_id": payment.get("id"),
                    "song_id": song.get("id"),
                    "song_title": song.get(
                        "title",
                        "Untitled"
                    ),
                    "amount": amount
                })


        # ==================================
        # ARTIST EARNINGS
        # ==================================
        #
        # KOLO MUSIC:
        #
        # SCREAM = 50 LD
        # PLATFORM = 30%
        # ARTIST = 70%
        #
        # Example:
        #
        # 50 LD payment
        # 15 LD platform
        # 35 LD artist
        #
        # ==================================

        artist_revenue = round(
            total_revenue * 70 / 100
        )


        # ==================================
        # RETURN DASHBOARD
        # ==================================

        return {

            "success": True,

            "artist": {

                "id": artist.get("id"),

                "user_id": artist.get(
                    "user_id"
                ),

                "artist_name": artist.get(
                    "artist_name"
                ),

                "status": artist.get(
                    "status"
                )

            },

            "wallet": wallet_data,

            "statistics": {

                "songs_uploaded": len(songs),

                "total_sales": total_sales,

                "total_revenue": total_revenue,

                "artist_revenue": artist_revenue

            },

            "songs": songs,

            "sales": approved_sales

        }


    except HTTPException:
        raise


    except Exception as e:

        print(
            "ARTIST DASHBOARD ERROR:",
            repr(e)
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to load artist dashboard"
        )


# ==========================================
# WITHDRAWAL REQUEST MODEL
# ==========================================

class WithdrawalRequest(BaseModel):
    amount: int
    payment_method: str
    mobile_money_name: str
    mobile_money_number: str


# ==========================================
# REQUEST WITHDRAWAL
# ==========================================

@router.post("/withdraw")
def request_withdrawal(
    withdrawal: WithdrawalRequest,
    artist_context=Depends(require_artist)
):

    try:

        # ==================================
        # GET ARTIST
        # ==================================

        user_id = artist_context["user"]["id"]

        artist = artist_context["artist"]

        # ==================================
        # CHECK APPROVAL
        # ==================================

        if artist.get("status") != "approved":

            raise HTTPException(
                status_code=403,
                detail="Artist account is not approved"
            )

        # ==================================
        # VALIDATE AMOUNT
        # ==================================

        amount = int(withdrawal.amount)

        if amount <= 0:

            raise HTTPException(
                status_code=400,
                detail="Invalid withdrawal amount"
            )

        # ==================================
        # VALIDATE PAYMENT INFORMATION
        # ==================================

        payment_method = withdrawal.payment_method.strip()
        mobile_money_name = withdrawal.mobile_money_name.strip()
        mobile_money_number = withdrawal.mobile_money_number.strip()

        if not payment_method:

            raise HTTPException(
                status_code=400,
                detail="Mobile Money provider is required"
            )

        if not mobile_money_name:

            raise HTTPException(
                status_code=400,
                detail="Mobile Money account name is required"
            )

        if not mobile_money_number:

            raise HTTPException(
                status_code=400,
                detail="Mobile Money number is required"
            )

        # ==================================
        # ATOMICALLY RESERVE THE WITHDRAWAL
        # ==================================

        rpc_result = (
            supabase
            .rpc(
                "create_kolo_withdrawal",
                {
                    "p_user_id": user_id,
                    "p_amount": amount,
                    "p_payment_method": payment_method,
                    "p_mobile_money_name": mobile_money_name,
                    "p_mobile_money_number": mobile_money_number
                }
            )
            .execute()
        )

        operation = rpc_result.data

        if isinstance(operation, list):

            if not operation:

                raise HTTPException(
                    status_code=500,
                    detail="Withdrawal creation returned no result"
                )

            operation = operation[0]

        if not isinstance(operation, dict):

            raise HTTPException(
                status_code=500,
                detail="Withdrawal creation returned an invalid result"
            )

        if not operation.get("success", False):

            error_code = operation.get("code")
            error_message = operation.get(
                "message",
                "Unable to create withdrawal request"
            )

            if error_code == "wallet_not_found":

                raise HTTPException(
                    status_code=404,
                    detail=error_message
                )

            if error_code in {
                "invalid_amount",
                "insufficient_balance"
            }:

                raise HTTPException(
                    status_code=400,
                    detail=error_message
                )

            raise HTTPException(
                status_code=500,
                detail="Unable to create withdrawal request"
            )

        withdrawal_data = operation.get("withdrawal")
        new_balance = operation.get("remaining_balance")

        if not isinstance(withdrawal_data, dict) or new_balance is None:

            raise HTTPException(
                status_code=500,
                detail="Withdrawal creation returned incomplete data"
            )

        # ==================================
        # SUCCESS
        # ==================================

        return {

            "success": True,

            "message": (
                "Withdrawal request submitted successfully"
            ),

            "withdrawal": withdrawal_data,

            "wallet": {
                "balance": new_balance
            }
        }

    except HTTPException:
        raise

    except Exception as e:

        print(
            "REQUEST WITHDRAWAL ERROR:",
            repr(e)
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to process withdrawal request"
        )


# ==========================================
# GET ARTIST WITHDRAWALS
# ==========================================

@router.get("/withdrawals")
def get_artist_withdrawals(
    artist_context=Depends(require_artist)
):

    try:

        user_id = artist_context["user"]["id"]

        artist = artist_context["artist"]

        if artist.get("status") != "approved":

            raise HTTPException(
                status_code=403,
                detail="Artist account is not approved"
            )


        result = (
            supabase
            .table("withdrawals")
            .select("*")
            .eq("user_id", user_id)
            .order(
                "created_at",
                desc=True
            )
            .execute()
        )


        return {

            "success": True,

            "withdrawals": result.data or []

        }


    except HTTPException:
        raise


    except Exception as e:

        print(
            "ARTIST WITHDRAWALS ERROR:",
            repr(e)
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to load withdrawals"
        )


# ==========================================
# ARTIST PROFILE
# ==========================================

class ArtistProfileUpdate(BaseModel):
    artist_name: str
    bio: str | None = None


# ==========================================
# GET ARTIST PROFILE
# ==========================================

@router.get("/profile")
def get_artist_profile(
    artist_context=Depends(require_artist)
):

    try:

        artist = artist_context["artist"]

        if artist.get("status") != "approved":

            raise HTTPException(
                status_code=403,
                detail="Artist account is not approved"
            )

        artist_id = artist["id"]

        # ==================================
        # GET ARTIST SONGS
        # ==================================

        songs_result = (
            supabase
            .table("songs")
            .select(
                "id, title, description, "
                "cover_image, audio_file, "
                "status, created_at"
            )
            .eq(
                "artist_id",
                artist_id
            )
            .order(
                "created_at",
                desc=True
            )
            .execute()
        )

        songs = songs_result.data or []

        return {
            "success": True,

            "artist": {
                "id": artist.get("id"),
                "user_id": artist.get("user_id"),
                "artist_name": artist.get("artist_name"),
                "bio": artist.get("bio"),
                "profile_photo_url": artist.get(
                    "profile_photo_url"
                ),
                "status": artist.get("status")
            },

            "songs": songs,

            "songs_count": len(songs)
        }

    except HTTPException:
        raise

    except Exception as e:

        print(
            "GET ARTIST PROFILE ERROR:",
            repr(e)
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to load artist profile"
        )


# ==========================================
# UPDATE ARTIST PROFILE
# ==========================================

@router.put("/profile")
def update_artist_profile(
    profile: ArtistProfileUpdate,
    artist_context=Depends(require_artist)
):

    try:

        artist = artist_context["artist"]

        if artist.get("status") != "approved":

            raise HTTPException(
                status_code=403,
                detail="Artist account is not approved"
            )

        artist_id = artist["id"]

        artist_name = profile.artist_name.strip()

        bio = (
            profile.bio.strip()
            if profile.bio
            else ""
        )

        if not artist_name:

            raise HTTPException(
                status_code=400,
                detail="Artist name is required"
            )

        if len(artist_name) > 100:

            raise HTTPException(
                status_code=400,
                detail="Artist name is too long"
            )

        if len(bio) > 1000:

            raise HTTPException(
                status_code=400,
                detail="Bio is too long"
            )

        result = (
            supabase
            .table("artists")
            .update(
                {
                    "artist_name": artist_name,
                    "bio": bio
                }
            )
            .eq(
                "id",
                artist_id
            )
            .execute()
        )

        if not result.data:

            raise HTTPException(
                status_code=404,
                detail="Artist profile not found"
            )

        updated_artist = result.data[0]

        return {
            "success": True,
            "message": "Artist profile updated successfully",

            "artist": {
                "id": updated_artist.get("id"),
                "artist_name": updated_artist.get(
                    "artist_name"
                ),
                "bio": updated_artist.get("bio"),
                "profile_photo_url": updated_artist.get(
                    "profile_photo_url"
                ),
                "status": updated_artist.get("status")
            }
        }

    except HTTPException:
        raise

    except Exception as e:

        print(
            "UPDATE ARTIST PROFILE ERROR:",
            repr(e)
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to update artist profile"
        )


# ==========================================
# UPLOAD ARTIST PROFILE PHOTO

# ==========================================
# ARTIST OWN SONG PLAYBACK
# ==========================================

@router.get("/song/{song_id}/play")
def play_own_song(
    song_id: str,
    artist_context=Depends(require_artist)
):

    try:

        artist = artist_context["artist"]

        artist_id = artist["id"]

        song_result = (
            supabase
            .table("songs")
            .select(
                "id, artist_id, title, status, audio_file"
            )
            .eq("id", song_id)
            .eq("artist_id", artist_id)
            .limit(1)
            .execute()
        )

        if not song_result.data:

            raise HTTPException(
                status_code=404,
                detail="Song not found."
            )

        song = song_result.data[0]

        if song.get("status") != "approved":

            raise HTTPException(
                status_code=403,
                detail="This song is not approved yet."
            )

        audio_url = song.get("audio_file")

        if not audio_url:

            raise HTTPException(
                status_code=404,
                detail="Audio file not available."
            )

        return {
            "success": True,
            "song_id": song["id"],
            "title": song.get("title"),
            "audio_url": audio_url
        }

    except HTTPException:
        raise

    except Exception as e:

        print(
            "ARTIST SONG PLAY ERROR:",
            repr(e)
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to play artist song."
        )

# ==========================================

@router.post("/profile-photo")
async def upload_artist_profile_photo(
    photo: UploadFile = File(...),
    artist_context=Depends(require_artist)
):

    try:

        artist = artist_context["artist"]

        if artist.get("status") != "approved":

            raise HTTPException(
                status_code=403,
                detail="Artist account is not approved"
            )

        artist_id = artist["id"]

        # ==================================
        # VALIDATE FILE
        # ==================================

        if not photo.content_type:

            raise HTTPException(
                status_code=400,
                detail="Invalid image file"
            )

        if not photo.content_type.startswith("image/"):

            raise HTTPException(
                status_code=400,
                detail="Profile photo must be an image"
            )

        photo_bytes = await photo.read()

        max_file_size = 5 * 1024 * 1024

        if len(photo_bytes) > max_file_size:

            raise HTTPException(
                status_code=400,
                detail="Profile photo must be smaller than 5 MB"
            )

        if not photo_bytes:

            raise HTTPException(
                status_code=400,
                detail="Profile photo is empty"
            )

        # ==================================
        # CREATE SAFE FILE PATH
        # ==================================

        extension = ""

        if "." in photo.filename:

            extension = (
                photo.filename
                .rsplit(".", 1)[1]
                .lower()
            )

        if extension not in {
            "jpg",
            "jpeg",
            "png",
            "webp"
        }:

            raise HTTPException(
                status_code=400,
                detail="Supported images: JPG, JPEG, PNG, WEBP"
            )

        profile_path = (
            f"{artist_id}/profile.{extension}"
        )

        # ==================================
        # REMOVE OLD PROFILE PHOTO
        # ==================================

        current_photo = artist.get(
            "profile_photo_url"
        )

        if current_photo:

            try:

                old_path = None

                marker = "/artist-profiles/"

                if marker in current_photo:

                    old_path = (
                        current_photo
                        .split(marker, 1)[1]
                    )

                if old_path:

                    supabase.storage.from_(
                        "artist-profiles"
                    ).remove(
                        [old_path]
                    )

            except Exception as cleanup_error:

                print(
                    "OLD PROFILE PHOTO CLEANUP WARNING:",
                    repr(cleanup_error)
                )

        # ==================================
        # UPLOAD NEW PHOTO
        # ==================================

        try:

            upload_result = (
                supabase
                .storage
                .from_("artist-profiles")
                .upload(
                    profile_path,
                    photo_bytes,
                    {
                        "content-type":
                            photo.content_type,
                        "upsert": "true"
                    }
                )
            )

            print(
                "PROFILE PHOTO UPLOADED:",
                upload_result
            )

        except Exception as e:

            print(
                "PROFILE PHOTO UPLOAD ERROR:",
                repr(e)
            )

            raise HTTPException(
                status_code=500,
                detail=f"Profile photo upload failed: {str(e)}"
            )

        # ==================================
        # CREATE PUBLIC URL
        # ==================================

        profile_photo_url = (
            supabase
            .storage
            .from_("artist-profiles")
            .get_public_url(
                profile_path
            )
        )

        # ==================================
        # SAVE URL
        # ==================================

        result = (
            supabase
            .table("artists")
            .update(
                {
                    "profile_photo_url":
                        profile_photo_url
                }
            )
            .eq(
                "id",
                artist_id
            )
            .execute()
        )

        if not result.data:

            raise HTTPException(
                status_code=404,
                detail="Artist profile not found"
            )

        return {
            "success": True,

            "message":
                "Profile photo updated successfully",

            "profile_photo_url":
                profile_photo_url
        }

    except HTTPException:
        raise

    except Exception as e:

        print(
            "UPLOAD ARTIST PROFILE PHOTO ERROR:",
            repr(e)
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to upload profile photo"
        )





