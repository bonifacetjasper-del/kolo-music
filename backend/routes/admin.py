from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from backend.database import supabase
from backend.security import require_admin
from backend.firebase_service import send_notification, send_admin_notification, send_user_notification


# ==========================================
# KOLO MUSIC ADMIN ROUTER
# ==========================================

router = APIRouter(
    prefix="/admin",
    tags=["Admin"]
)

# ==========================================
# KOLO MUSIC FINANCIAL SETTINGS
# ==========================================


# ==========================================
# FIREBASE NOTIFICATION TOKEN
# ==========================================

class NotificationTokenRequest(BaseModel):
    user_id: str
    token: str
    platform: str | None = None

@router.post("/notification-token")
def save_notification_token(
    notification: NotificationTokenRequest
):

    try:

        # ==========================================
        # VALIDATE INPUT
        # ==========================================

        if not notification.user_id:
            raise HTTPException(
                status_code=400,
                detail="User ID is required"
            )

        if not notification.token:
            raise HTTPException(
                status_code=400,
                detail="Notification token is required"
            )

        # ==========================================
        # CHECK WHETHER THIS TOKEN ALREADY EXISTS
        # ==========================================

        existing = (
            supabase
            .table("notification_tokens")
            .select("id,user_id,token,platform")
            .eq("token", notification.token)
            .limit(1)
            .execute()
        )

        existing_data = existing.data or []

        # ==========================================
        # UPDATE EXISTING TOKEN
        # ==========================================

        if existing_data:

            existing_token = existing_data[0]

            result = (
                supabase
                .table("notification_tokens")
                .update({
                    "user_id": notification.user_id,
                    "platform": notification.platform or "web"
                })
                .eq("id", existing_token["id"])
                .execute()
            )

        # ==========================================
        # CREATE NEW TOKEN
        # ==========================================

        else:

            result = (
                supabase
                .table("notification_tokens")
                .insert({
                    "user_id": notification.user_id,
                    "token": notification.token,
                    "platform": notification.platform or "web"
                })
                .execute()
            )

        return {
            "success": True,
            "message": "Notification token saved",
            "data": result.data
        }

    except HTTPException:
        raise

    except Exception as e:

        print(
            "NOTIFICATION TOKEN ERROR:",
            repr(e)
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Unable to save notification token: "
                f"{str(e)}"
            )
        )


# ==========================================
# REMOVE NOTIFICATION TOKEN
# ==========================================

class RemoveNotificationTokenRequest(BaseModel):
    token: str


@router.post("/notification-token/remove")
def remove_notification_token(
    notification: RemoveNotificationTokenRequest
):

    try:

        if not notification.token:

            raise HTTPException(
                status_code=400,
                detail="Notification token is required"
            )

        result = (
            supabase
            .table("notification_tokens")
            .delete()
            .eq("token", notification.token)
            .execute()
        )

        return {
            "success": True,
            "message": "Notification token removed",
            "data": result.data or []
        }

    except HTTPException:
        raise

    except Exception as e:

        print(
            "REMOVE NOTIFICATION TOKEN ERROR:",
            repr(e)
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to remove notification token"
        )

def get_platform_settings():
    """
    Get the current KOLO MUSIC financial
    settings from the platform_settings table.
    """

    result = (
        supabase
        .table("platform_settings")
        .select(
            "scream_price, "
            "platform_fee_percent, "
            "artist_percent"
        )
        .limit(1)
        .execute()
    )

    if not result.data:
        raise Exception(
            "KOLO MUSIC platform settings not found"
        )

    return result.data[0]


# ==========================================
# GET CURRENT SCREAM PRICE
# ==========================================

def get_scream_price():

    settings = get_platform_settings()

    price = float(
        settings.get("scream_price") or 0
    )

    if price <= 0:
        raise Exception(
            "Invalid KOLO MUSIC scream price"
        )

    return price


# ==========================================
# CALCULATE PAYMENT SPLIT
# ==========================================

def calculate_split(amount: float):

    settings = get_platform_settings()

    platform_percent = float(
        settings.get("platform_fee_percent") or 0
    )

    artist_percent = float(
        settings.get("artist_percent") or 0
    )

    if not 0 <= platform_percent <= 100:
        raise Exception(
            "Invalid platform fee percentage"
        )

    if not 0 <= artist_percent <= 100:
        raise Exception(
            "Invalid artist percentage"
        )

    if round(
        platform_percent + artist_percent,
        2
    ) != 100:
        raise Exception(
            "Platform fee and artist percentage "
            "must equal 100%"
        )

    platform_fee = round(
        amount * platform_percent / 100,
        2
    )

    artist_amount = round(
        amount * artist_percent / 100,
        2
    )

    return platform_fee, artist_amount

# ==========================================
# PENDING ARTISTS
# ==========================================

@router.get("/artists/pending")
def get_pending_artists(
    admin=Depends(require_admin)
):

    try:

        # ==========================================
        # GET PENDING ARTISTS
        # ==========================================

        artist_result = (
            supabase
            .table("artists")
            .select("*")
            .eq("status", "pending")
            .order("created_at", desc=True)
            .execute()
        )

        artists = artist_result.data or []

        if not artists:

            return {
                "artists": []
            }

        # ==========================================
        # GET USER PROFILES
        # ==========================================

        user_ids = [
            artist.get("user_id")
            for artist in artists
            if artist.get("user_id")
        ]

        users_by_id = {}

        if user_ids:

            user_result = (
                supabase
                .table("users")
                .select("id,full_name,phone,role")
                .in_("id", user_ids)
                .execute()
            )

            for user in user_result.data or []:

                users_by_id[
                    str(user["id"])
                ] = user

        # ==========================================
        # GET AUTH EMAILS
        # ==========================================

        auth_users_by_id = {}

        for user_id in user_ids:

            try:

                auth_response = (
                    supabase
                    .auth
                    .admin
                    .get_user_by_id(str(user_id))
                )

                auth_user = getattr(
                    auth_response,
                    "user",
                    None
                )

                if auth_user:

                    auth_users_by_id[
                        str(user_id)
                    ] = auth_user

            except Exception as auth_error:

                print(
                    "PENDING ARTIST AUTH EMAIL ERROR:",
                    str(user_id),
                    repr(auth_error)
                )

        # ==========================================
        # BUILD COMPLETE ARTIST RECORDS
        # ==========================================

        enriched_artists = []

        for artist in artists:

            user_id = artist.get("user_id")

            user = users_by_id.get(
                str(user_id),
                {}
            )

            auth_user = auth_users_by_id.get(
                str(user_id)
            )

            auth_email = ""

            if auth_user:

                auth_email = (
                    getattr(
                        auth_user,
                        "email",
                        None
                    )
                    or ""
                )

            enriched_artist = {
                **artist,

                "full_name": (
                    user.get("full_name")
                    or "Not provided"
                ),

                "phone": (
                    user.get("phone")
                    or "Not provided"
                ),

                "email": (
                    auth_email
                    or "Not provided"
                )
            }

            enriched_artists.append(
                enriched_artist
            )

        return {
            "artists": enriched_artists
        }

    except HTTPException:

        raise

    except Exception as e:

        print(
            "PENDING ARTISTS ERROR:",
            repr(e)
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to load pending artists"
        )


# ==========================================
# APPROVE ARTIST
# ==========================================

@router.post("/artists/{artist_id}/approve")
def approve_artist(
    artist_id: str,
    admin=Depends(require_admin)
):

    try:

        existing = (
            supabase
            .table("artists")
            .select("*")
            .eq("id", artist_id)
            .execute()
        )

        if not existing.data:

            raise HTTPException(
                status_code=404,
                detail="Artist not found"
            )

        artist = existing.data[0]

        if artist.get("status") == "approved":

            return {
                "success": False,
                "message": "Artist is already approved",
                "artist": artist
            }

        result = (
            supabase
            .table("artists")
            .update({
                "status": "approved"
            })
            .eq("id", artist_id)
            .execute()
        )

        # ==========================================
        # NOTIFY ARTIST
        # ==========================================

        notification_result = None

        user_id = artist.get("user_id")

        if user_id:

            try:

                notification_result = send_user_notification(
                    user_id=user_id,
                    title="Artist Account Approved",
                    body="Your KOLO MUSIC artist account has been approved.",
                    data={
                        "type": "artist_approved",
                        "artist_id": str(artist_id)
                    }
                )

            except Exception as notification_error:

                print(
                    "ARTIST APPROVAL NOTIFICATION ERROR:",
                    repr(notification_error)
                )

        else:

            print(
                "ARTIST APPROVAL NOTIFICATION SKIPPED: "
                "artist user_id not found"
            )

        return {
            "success": True,
            "message": "Artist approved",
            "artist": result.data,
            "notification": notification_result
        }

    except HTTPException:
        raise

    except Exception as e:

        print(
            "APPROVE ARTIST ERROR:",
            repr(e)
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to approve artist"
        )


# ==========================================
# REJECT ARTIST
# ==========================================

@router.post("/artists/{artist_id}/reject")
def reject_artist(
    artist_id: str,
    admin=Depends(require_admin)
):

    try:

        existing = (
            supabase
            .table("artists")
            .select("id,status")
            .eq("id", artist_id)
            .execute()
        )

        if not existing.data:

            raise HTTPException(
                status_code=404,
                detail="Artist not found"
            )

        result = (
            supabase
            .table("artists")
            .update({
                "status": "rejected"
            })
            .eq("id", artist_id)
            .execute()
        )

        # ==========================================
        # NOTIFY ARTIST
        # ==========================================

        notification_result = None

        user_id = None

        artist_full = (
            supabase
            .table("artists")
            .select("user_id")
            .eq("id", artist_id)
            .limit(1)
            .execute()
        )

        if artist_full.data:

            user_id = artist_full.data[0].get("user_id")

        if user_id:

            try:

                notification_result = send_user_notification(
                    user_id=user_id,
                    title="Artist Account Rejected",
                    body="Your KOLO MUSIC artist account has been rejected.",
                    data={
                        "type": "artist_rejected",
                        "artist_id": str(artist_id)
                    }
                )

            except Exception as notification_error:

                print(
                    "ARTIST REJECTION NOTIFICATION ERROR:",
                    repr(notification_error)
                )

        else:

            print(
                "ARTIST REJECTION NOTIFICATION SKIPPED: "
                "artist user_id not found"
            )

        return {
            "success": True,
            "message": "Artist rejected",
            "artist": result.data,
            "notification": notification_result
        }

    except HTTPException:
        raise

    except Exception as e:

        print(
            "REJECT ARTIST ERROR:",
            repr(e)
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to reject artist"
        )


# ==========================================
# PENDING SONGS
# ==========================================

@router.get("/songs/pending")
def get_pending_songs(
    admin=Depends(require_admin)
):

    try:

        result = (
            supabase
            .table("songs")
            .select("*")
            .eq("status", "pending")
            .execute()
        )

        return {
            "songs": result.data or []
        }

    except Exception as e:

        print(
            "PENDING SONGS ERROR:",
            repr(e)
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to load pending songs"
        )


# ==========================================
# APPROVE SONG
# ==========================================

@router.post("/songs/{song_id}/approve")
def approve_song(
    song_id: str,
    admin=Depends(require_admin)
):

    try:

        existing = (
            supabase
            .table("songs")
            .select("*")
            .eq("id", song_id)
            .execute()
        )

        if not existing.data:

            raise HTTPException(
                status_code=404,
                detail="Song not found"
            )

        song = existing.data[0]

        if song.get("status") == "approved":

            return {
                "success": False,
                "message": "Song is already approved",
                "song": song
            }

        result = (
            supabase
            .table("songs")
            .update({
                "status": "approved"
            })
            .eq("id", song_id)
            .execute()
        )

        # ==========================================
        # NOTIFY SONG OWNER
        # ==========================================

        notification_result = None

        artist_id = song.get("artist_id")
        user_id = None

        if artist_id:

            try:

                artist_result = (
                    supabase
                    .table("artists")
                    .select("user_id")
                    .eq("id", artist_id)
                    .limit(1)
                    .execute()
                )

                if artist_result.data:

                    user_id = artist_result.data[0].get("user_id")

            except Exception as lookup_error:

                print(
                    "SONG APPROVAL ARTIST LOOKUP ERROR:",
                    repr(lookup_error)
                )

        if user_id:

            try:

                notification_result = send_user_notification(
                    user_id=user_id,
                    title="Song Approved",
                    body=(
                        f'Your song "{song.get("title", "Untitled")}" '
                        "has been approved and is now available on KOLO MUSIC."
                    ),
                    data={
                        "type": "song_approved",
                        "song_id": str(song_id),
                        "artist_id": str(artist_id)
                    }
                )

            except Exception as notification_error:

                print(
                    "SONG APPROVAL NOTIFICATION ERROR:",
                    repr(notification_error)
                )

        else:

            print(
                "SONG APPROVAL NOTIFICATION SKIPPED: "
                "artist user_id not found"
            )

        return {
            "success": True,
            "message": "Song approved",
            "song": result.data,
            "notification": notification_result
        }

    except HTTPException:
        raise

    except Exception as e:

        print(
            "APPROVE SONG ERROR:",
            repr(e)
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to approve song"
        )


# ==========================================
# REJECT SONG
# ==========================================

@router.post("/songs/{song_id}/reject")
def reject_song(
    song_id: str,
    admin=Depends(require_admin)
):

    try:

        existing = (
            supabase
            .table("songs")
            .select("id,status")
            .eq("id", song_id)
            .execute()
        )

        if not existing.data:

            raise HTTPException(
                status_code=404,
                detail="Song not found"
            )

        result = (
            supabase
            .table("songs")
            .update({
                "status": "rejected"
            })
            .eq("id", song_id)
            .execute()
        )

        # ==========================================
        # NOTIFY SONG OWNER
        # ==========================================

        notification_result = None

        song_full = (
            supabase
            .table("songs")
            .select("artist_id,title")
            .eq("id", song_id)
            .limit(1)
            .execute()
        )

        artist_id = None
        song_title = "Untitled"

        if song_full.data:

            artist_id = song_full.data[0].get("artist_id")
            song_title = song_full.data[0].get("title") or "Untitled"

        user_id = None

        if artist_id:

            try:

                artist_result = (
                    supabase
                    .table("artists")
                    .select("user_id")
                    .eq("id", artist_id)
                    .limit(1)
                    .execute()
                )

                if artist_result.data:

                    user_id = artist_result.data[0].get("user_id")

            except Exception as lookup_error:

                print(
                    "SONG REJECTION ARTIST LOOKUP ERROR:",
                    repr(lookup_error)
                )

        if user_id:

            try:

                notification_result = send_user_notification(
                    user_id=user_id,
                    title="Song Rejected",
                    body=(
                        f'Your song "{song_title}" '
                        "has been rejected on KOLO MUSIC."
                    ),
                    data={
                        "type": "song_rejected",
                        "song_id": str(song_id),
                        "artist_id": str(artist_id)
                    }
                )

            except Exception as notification_error:

                print(
                    "SONG REJECTION NOTIFICATION ERROR:",
                    repr(notification_error)
                )

        else:

            print(
                "SONG REJECTION NOTIFICATION SKIPPED: "
                "artist user_id not found"
            )

        return {
            "success": True,
            "message": "Song rejected",
            "song": result.data,
            "notification": notification_result
        }

    except HTTPException:
        raise

    except Exception as e:

        print(
            "REJECT SONG ERROR:",
            repr(e)
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to reject song"
        )


# ==========================================
# PENDING PAYMENTS
# ==========================================

@router.get("/payments/pending")
def get_pending_payments(
    admin=Depends(require_admin)
):

    try:

        result = (
            supabase
            .table("payments")
            .select("*")
            .eq("status", "pending")
            .execute()
        )

        return {
            "payments": result.data or []
        }

    except Exception as e:

        print(
            "PENDING PAYMENTS ERROR:",
            repr(e)
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to load pending payments"
        )


# ==========================================
# APPROVE PAYMENT
# ==========================================

@router.post("/payments/{payment_id}/approve")
def approve_payment(
    payment_id: str,
    admin=Depends(require_admin)
):

    try:

        result = (
            supabase
            .rpc(
                "approve_kolo_payment",
                {
                    "p_payment_id": payment_id
                }
            )
            .execute()
        )

        if not result.data:

            raise HTTPException(
                status_code=500,
                detail="Payment approval returned no result."
            )

        approval = result.data

        if isinstance(approval, list):

            if not approval:

                raise HTTPException(
                    status_code=500,
                    detail="Payment approval returned empty result."
                )

            approval = approval[0]

        if approval.get("already_approved"):

            return {
                "success": False,
                "message": approval.get(
                    "message",
                    "Payment is already approved"
                )
            }

        return {
            "success": approval.get(
                "success",
                True
            ),

            "message": approval.get(
                "message",
                "Payment approved successfully"
            ),

            "payment_id": approval.get(
                "payment_id"
            ),

            "user_id": approval.get(
                "user_id"
            ),

            "song_id": approval.get(
                "song_id"
            ),

            "artist_id": approval.get(
                "artist_id"
            ),

            "amount": approval.get(
                "amount"
            ),

            "platform_fee": approval.get(
                "platform_fee"
            ),

            "artist_amount": approval.get(
                "artist_amount"
            ),

            "access_id": approval.get(
                "access_id"
            )
        }

    except HTTPException:
        raise

    except Exception as e:

        print(
            "APPROVE PAYMENT ERROR:",
            repr(e)
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to approve payment"
        )


# ==========================================
# REJECT PAYMENT
# ==========================================

@router.post("/payments/{payment_id}/reject")
def reject_payment(
    payment_id: str,
    admin=Depends(require_admin)
):

    try:

        existing = (
            supabase
            .table("payments")
            .select("id,status")
            .eq("id", payment_id)
            .execute()
        )

        if not existing.data:

            raise HTTPException(
                status_code=404,
                detail="Payment not found"
            )

        payment = existing.data[0]

        if payment.get("status") == "rejected":

            return {
                "success": False,
                "message": "Payment is already rejected",
                "payment": payment
            }

        result = (
            supabase
            .table("payments")
            .update({
                "status": "rejected"
            })
            .eq("id", payment_id)
            .execute()
        )

        return {
            "success": True,
            "message": "Payment rejected",
            "payment": result.data
        }

    except HTTPException:
        raise

    except Exception as e:

        print(
            "REJECT PAYMENT ERROR:",
            repr(e)
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to reject payment"
        )


# ==========================================
# PENDING WITHDRAWALS
# ==========================================

@router.get("/withdrawals/pending")
def get_pending_withdrawals(
    admin=Depends(require_admin)
):

    try:

        # ------------------------------------------
        # GET PENDING WITHDRAWALS
        # ------------------------------------------

        withdrawals = (
            supabase
            .table("withdrawals")
            .select("*")
            .eq("status", "pending")
            .execute()
        )

        withdrawal_data = withdrawals.data or []

        # ------------------------------------------
        # ADD ARTIST + REVENUE INFORMATION
        # ------------------------------------------

        for withdrawal in withdrawal_data:

            user_id = withdrawal.get("user_id")

            withdrawal["artist_name"] = "Unknown Artist"
            withdrawal["total_revenue"] = 0
            withdrawal["artist_revenue"] = 0

            if not user_id:
                continue

            # --------------------------------------
            # GET USER
            # --------------------------------------

            user_result = (
                supabase
                .table("users")
                .select("id,full_name,phone,role")
                .eq("id", user_id)
                .execute()
            )

            user = None

            if user_result.data:
                user = user_result.data[0]

                withdrawal["full_name"] = user.get(
                    "full_name"
                )

                withdrawal["phone"] = user.get(
                    "phone"
                )

                withdrawal["role"] = user.get(
                    "role"
                )

            # --------------------------------------
            # GET ARTIST
            # --------------------------------------

            artist_result = (
                supabase
                .table("artists")
                .select("id,artist_name,status")
                .eq("user_id", user_id)
                .execute()
            )

            if not artist_result.data:
                withdrawal["artist_name"] = (
                    user.get("full_name")
                    if user
                    else "Unknown Artist"
                )

                continue

            artist = artist_result.data[0]

            withdrawal["artist_name"] = (
                artist.get("artist_name")
                or (
                    user.get("full_name")
                    if user
                    else "Unknown Artist"
                )
            )

            artist_id = artist.get("id")

            if not artist_id:
                continue

            # --------------------------------------
            # GET ARTIST SONGS
            # --------------------------------------

            songs_result = (
                supabase
                .table("songs")
                .select("id")
                .eq("artist_id", artist_id)
                .execute()
            )

            songs = songs_result.data or []

            song_ids = [
                song.get("id")
                for song in songs
                if song.get("id")
            ]

            if not song_ids:
                continue

            # --------------------------------------
            # GET APPROVED PAYMENTS
            # --------------------------------------

            total_revenue = 0
            artist_revenue = 0

            for song_id in song_ids:

                payments_result = (
                    supabase
                    .table("payments")
                    .select(
                        "amount,artist_amount,status"
                    )
                    .eq("song_id", song_id)
                    .eq("status", "approved")
                    .execute()
                )

                payments = payments_result.data or []

                for payment in payments:

                    total_revenue += int(
                        payment.get("amount") or 0
                    )

                    artist_revenue += int(
                        payment.get("artist_amount") or 0
                    )

            # --------------------------------------
            # ATTACH REVENUE
            # --------------------------------------

            withdrawal["total_revenue"] = total_revenue

            withdrawal["artist_revenue"] = artist_revenue

        # ------------------------------------------
        # RETURN
        # ------------------------------------------

        return {
            "withdrawals": withdrawal_data
        }

    except Exception as e:

        print(
            "PENDING WITHDRAWALS ERROR:",
            repr(e)
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to load withdrawals"
        )


# ==========================================
# ==========================================

@router.post("/withdrawals/{withdrawal_id}/approve")
def approve_withdrawal(
    withdrawal_id: str,
    admin=Depends(require_admin)
):

    try:

        # --------------------------------------
        # FIRST: VERIFY WITHDRAWAL EXISTS
        # --------------------------------------

        existing = (
            supabase
            .table("withdrawals")
            .select("*")
            .eq("id", withdrawal_id)
            .execute()
        )

        if not existing.data:

            raise HTTPException(
                status_code=404,
                detail="Withdrawal not found"
            )

        withdrawal = existing.data[0]

        # --------------------------------------
        # PREVENT DOUBLE APPROVAL
        # --------------------------------------

        if withdrawal.get("status") == "approved":

            return {
                "success": False,
                "message": "Withdrawal is already approved",
                "withdrawal_id": withdrawal_id
            }

        # --------------------------------------
        # PREVENT APPROVING REJECTED WITHDRAWAL
        # --------------------------------------

        if withdrawal.get("status") == "rejected":

            raise HTTPException(
                status_code=400,
                detail="A rejected withdrawal cannot be approved."
            )

        # --------------------------------------
        # CHECK AMOUNT
        # --------------------------------------

        amount = withdrawal.get("amount")

        if amount is None or int(amount) <= 0:

            raise HTTPException(
                status_code=400,
                detail="Invalid withdrawal amount."
            )

        # --------------------------------------
        # GET USER INFORMATION
        # --------------------------------------

        user_id = withdrawal.get("user_id")

        if not user_id:

            raise HTTPException(
                status_code=400,
                detail="Withdrawal has no user."
            )

        user_result = (
            supabase
            .table("users")
            .select("id,full_name,phone,role")
            .eq("id", user_id)
            .execute()
        )

        if not user_result.data:

            raise HTTPException(
                status_code=404,
                detail="Withdrawal user not found."
            )

        user = user_result.data[0]

        phone = user.get("phone")

        if not phone:

            raise HTTPException(
                status_code=400,
                detail="Artist does not have a mobile-money phone number."
            )

        # --------------------------------------
        # APPROVE THROUGH DATABASE RPC
        #
        # The RPC is responsible for the
        # atomic wallet deduction.
        # --------------------------------------

        result = (
            supabase
            .rpc(
                "approve_kolo_withdrawal",
                {
                    "p_withdrawal_id": withdrawal_id
                }
            )
            .execute()
        )

        if not result.data:

            raise HTTPException(
                status_code=500,
                detail="Withdrawal approval returned no result."
            )

        approval = result.data

        if isinstance(approval, list):

            if not approval:

                raise HTTPException(
                    status_code=500,
                    detail="Withdrawal approval returned empty result."
                )

            approval = approval[0]

        # --------------------------------------
        # RETURN COMPLETE RESULT
        # --------------------------------------

        return {
            "success": approval.get(
                "success",
                True
            ),

            "message": approval.get(
                "message",
                "Withdrawal approved successfully"
            ),

            "withdrawal_id": approval.get(
                "withdrawal_id",
                withdrawal_id
            ),

            "user_id": user_id,

            "full_name": user.get(
                "full_name"
            ),

            "phone": phone,

            "amount": approval.get(
                "amount",
                amount
            ),

            "remaining_balance": approval.get(
                "remaining_balance"
            )
        }

    except HTTPException:
        raise

    except Exception as e:

        print(
            "APPROVE WITHDRAWAL ERROR:",
            repr(e)
        )

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# ==========================================
# REJECT WITHDRAWAL
# ==========================================

@router.post("/withdrawals/{withdrawal_id}/reject")
def reject_withdrawal(
    withdrawal_id: str,
    admin=Depends(require_admin)
):

    try:

        # ======================================
        # VERIFY WITHDRAWAL EXISTS
        # ======================================

        existing = (
            supabase
            .table("withdrawals")
            .select("*")
            .eq("id", withdrawal_id)
            .execute()
        )

        if not existing.data:

            raise HTTPException(
                status_code=404,
                detail="Withdrawal not found"
            )

        withdrawal = existing.data[0]

        # ======================================
        # PREVENT DOUBLE REJECTION
        # ======================================

        if withdrawal.get("status") == "rejected":

            return {
                "success": False,
                "message": "Withdrawal already rejected",
                "withdrawal": withdrawal
            }

        # ======================================
        # PREVENT REJECTING APPROVED WITHDRAWAL
        # ======================================

        if withdrawal.get("status") == "approved":

            raise HTTPException(
                status_code=400,
                detail="An approved withdrawal cannot be rejected."
            )

        # ======================================
        # REJECT THROUGH DATABASE RPC
        #
        # The RPC:
        # 1. Locks the withdrawal
        # 2. Locks the artist wallet
        # 3. Returns the reserved amount
        # 4. Marks withdrawal as rejected
        # ======================================

        result = (
            supabase
            .rpc(
                "reject_kolo_withdrawal",
                {
                    "p_withdrawal_id": withdrawal_id
                }
            )
            .execute()
        )

        if not result.data:

            raise HTTPException(
                status_code=500,
                detail="Withdrawal rejection returned no result."
            )

        rejection = result.data

        if isinstance(rejection, list):

            if not rejection:

                raise HTTPException(
                    status_code=500,
                    detail="Withdrawal rejection returned empty result."
                )

            rejection = rejection[0]

        # ======================================
        # CHECK RPC RESULT
        # ======================================

        if not rejection.get("success", False):

            raise HTTPException(
                status_code=400,
                detail=rejection.get(
                    "message",
                    "Unable to reject withdrawal."
                )
            )

        # ======================================
        # RETURN COMPLETE RESULT
        # ======================================

        return {

            "success": True,

            "message": rejection.get(
                "message",
                "Withdrawal rejected and funds returned to wallet"
            ),

            "withdrawal_id": rejection.get(
                "withdrawal_id",
                withdrawal_id
            ),

            "user_id": withdrawal.get(
                "user_id"
            ),

            "amount_returned": rejection.get(
                "amount_returned",
                withdrawal.get("amount")
            ),

            "new_balance": rejection.get(
                "new_balance"
            )
        }

    except HTTPException:
        raise

    except Exception as e:

        print(
            "REJECT WITHDRAWAL ERROR:",
            repr(e)
        )

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# ==========================================
# ADMIN ANALYTICS
# ==========================================

@router.get("/analytics")
def admin_analytics(
    admin=Depends(require_admin)
):

    try:

        # ======================================
        # USERS
        # ======================================

        users_result = (
            supabase
            .table("users")
            .select("id", count="exact")
            .execute()
        )

        total_users = (
            users_result.count
            if users_result.count is not None
            else len(users_result.data or [])
        )

        # ======================================
        # ARTISTS
        # ======================================

        artists_result = (
            supabase
            .table("artists")
            .select("id,status")
            .execute()
        )

        artists_data = artists_result.data or []

        total_artists = len(artists_data)

        approved_artists = sum(
            1
            for artist in artists_data
            if artist.get("status") == "approved"
        )

        pending_artists = sum(
            1
            for artist in artists_data
            if artist.get("status") == "pending"
        )

        rejected_artists = sum(
            1
            for artist in artists_data
            if artist.get("status") == "rejected"
        )

        # ======================================
        # SONGS
        # ======================================

        songs_result = (
            supabase
            .table("songs")
            .select("id,status")
            .execute()
        )

        songs_data = songs_result.data or []

        total_songs = len(songs_data)

        approved_songs = sum(
            1
            for song in songs_data
            if song.get("status") == "approved"
        )

        pending_songs = sum(
            1
            for song in songs_data
            if song.get("status") == "pending"
        )

        rejected_songs = sum(
            1
            for song in songs_data
            if song.get("status") == "rejected"
        )

        # ======================================
        # PAYMENTS
        # ======================================

        payments_result = (
            supabase
            .table("payments")
            .select("id,amount,status")
            .execute()
        )

        payments_data = payments_result.data or []

        total_payments = len(payments_data)

        approved_payment_rows = [
            payment
            for payment in payments_data
            if payment.get("status") == "approved"
        ]

        pending_payment_rows = [
            payment
            for payment in payments_data
            if payment.get("status") == "pending"
        ]

        rejected_payment_rows = [
            payment
            for payment in payments_data
            if payment.get("status") == "rejected"
        ]

        approved_payment_count = len(
            approved_payment_rows
        )

        pending_payment_count = len(
            pending_payment_rows
        )

        rejected_payment_count = len(
            rejected_payment_rows
        )

        # ======================================
        # REVENUE
        # ======================================

        total_revenue = sum(
            float(payment.get("amount") or 0)
            for payment in approved_payment_rows
        )
        settings = get_platform_settings()

        platform_percent = float(
            settings.get("platform_fee_percent") or 0
        )

        artist_percent = float(
            settings.get("artist_percent") or 0
        )

        platform_revenue = round(
            total_revenue
            * platform_percent
            / 100,
            2
        )

        artist_revenue = round(
            total_revenue
            * artist_percent
            / 100,
            2
        )

        # ======================================
        # WITHDRAWALS
        # ======================================

        withdrawals_result = (
            supabase
            .table("withdrawals")
            .select("id,status")
            .execute()
        )

        withdrawals_data = (
            withdrawals_result.data or []
        )

        total_withdrawals = len(
            withdrawals_data
        )

        approved_withdrawals = sum(
            1
            for withdrawal in withdrawals_data
            if withdrawal.get("status") == "approved"
        )

        pending_withdrawals = sum(
            1
            for withdrawal in withdrawals_data
            if withdrawal.get("status") == "pending"
        )

        rejected_withdrawals = sum(
            1
            for withdrawal in withdrawals_data
            if withdrawal.get("status") == "rejected"
        )

        # ======================================
        # DEBUG INFORMATION
        # ======================================

        print(
            "ADMIN ANALYTICS:",
            {
                "users": total_users,
                "approved_payments": approved_payment_count,
                "pending_payments": pending_payment_count,
                "rejected_payments": rejected_payment_count,
                "total_revenue": total_revenue,
                "platform_revenue": platform_revenue,
                "artist_revenue": artist_revenue
            }
        )

        # ======================================
        # RETURN ANALYTICS
        # ======================================

        return {

            # ----------------------------------
            # USERS
            # ----------------------------------

            "users": total_users,
            "total_users": total_users,

            # ----------------------------------
            # ARTISTS
            # ----------------------------------

            "artists": total_artists,
            "approved_artists": approved_artists,
            "pending_artists": pending_artists,
            "rejected_artists": rejected_artists,

            # ----------------------------------
            # SONGS
            # ----------------------------------

            "songs": total_songs,
            "approved_songs": approved_songs,
            "pending_songs": pending_songs,
            "rejected_songs": rejected_songs,

            # ----------------------------------
            # PAYMENTS
            # ----------------------------------

            "payments": total_payments,

            "sales": approved_payment_count,

            "approved_payments": approved_payment_count,

            "pending_payments": pending_payment_count,

            "rejected_payments": rejected_payment_count,

            # ----------------------------------
            # REVENUE
            # ----------------------------------

            "revenue": total_revenue,

            "total_revenue": total_revenue,

            "platform_revenue": platform_revenue,

            "artist_revenue": artist_revenue,

            # ----------------------------------
            # WITHDRAWALS
            # ----------------------------------

            "withdrawals": total_withdrawals,

            "approved_withdrawals": approved_withdrawals,

            "pending_withdrawals": pending_withdrawals,

            "rejected_withdrawals": rejected_withdrawals
        }

    except Exception as e:

        print(
            "ADMIN ANALYTICS ERROR:",
            repr(e)
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to load admin analytics"
        )


# ==========================================
# VIEW ALL ARTISTS
# ==========================================

@router.get("/artists")
def get_all_artists(
    admin=Depends(require_admin)
):

    try:

        result = (
            supabase
            .table("artists")
            .select("*")
            .execute()
        )

        return {
            "artists": result.data or []
        }

    except Exception as e:

        print(
            "ALL ARTISTS ERROR:",
            repr(e)
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to load artists"
        )


# ==========================================
# VIEW ALL SONGS
# ==========================================

@router.get("/songs")
def get_all_songs(
    admin=Depends(require_admin)
):

    try:

        result = (
            supabase
            .table("songs")
            .select("*")
            .execute()
        )

        return {
            "songs": result.data or []
        }

    except Exception as e:

        print(
            "ALL SONGS ERROR:",
            repr(e)
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to load songs"
        )


# ==========================================
# VIEW ALL PAYMENTS
# ==========================================

@router.get("/payments")
def get_all_payments(
    admin=Depends(require_admin)
):

    try:

        result = (
            supabase
            .table("payments")
            .select("*")
            .execute()
        )

        return {
            "payments": result.data or []
        }

    except Exception as e:

        print(
            "ALL PAYMENTS ERROR:",
            repr(e)
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to load payments"
        )


# ==========================================
# VIEW ALL WITHDRAWALS
# ==========================================

@router.get("/withdrawals")
def get_all_withdrawals(
    admin=Depends(require_admin)
):

    try:

        withdrawals = (
            supabase
            .table("withdrawals")
            .select("*")
            .execute()
        )

        withdrawal_data = withdrawals.data or []

        # ==========================================
        # ADD USER, ARTIST AND REVENUE INFORMATION
        # ==========================================

        for withdrawal in withdrawal_data:

            user_id = withdrawal.get("user_id")

            if not user_id:
                continue

            # --------------------------------------
            # GET USER
            # --------------------------------------

            user_result = (
                supabase
                .table("users")
                .select("id,full_name,phone,role")
                .eq("id", user_id)
                .execute()
            )

            if user_result.data:

                user = user_result.data[0]

                withdrawal["full_name"] = user.get(
                    "full_name"
                )

                withdrawal["phone"] = user.get(
                    "phone"
                )

                withdrawal["role"] = user.get(
                    "role"
                )

            # --------------------------------------
            # GET ARTIST
            # --------------------------------------

            artist_result = (
                supabase
                .table("artists")
                .select("id,artist_name,status")
                .eq("user_id", user_id)
                .execute()
            )

            artist = (
                artist_result.data[0]
                if artist_result.data
                else None
            )

            if not artist:
                withdrawal["artist_name"] = (
                    withdrawal.get("full_name")
                    or "Unknown Artist"
                )

                withdrawal["total_revenue"] = 0

                withdrawal["artist_revenue"] = 0

                continue

            artist_id = artist.get("id")

            withdrawal["artist_name"] = (
                artist.get("artist_name")
                or "Unknown Artist"
            )

            # --------------------------------------
            # GET ARTIST SONGS
            # --------------------------------------

            songs_result = (
                supabase
                .table("songs")
                .select("id")
                .eq("artist_id", artist_id)
                .execute()
            )

            songs = songs_result.data or []

            song_ids = [
                song.get("id")
                for song in songs
                if song.get("id")
            ]

            total_revenue = 0
            artist_revenue = 0

            # --------------------------------------
            # GET APPROVED PAYMENTS
            # --------------------------------------

            for song_id in song_ids:

                payments_result = (
                    supabase
                    .table("payments")
                    .select(
                        "amount,artist_amount,status"
                    )
                    .eq("song_id", song_id)
                    .eq("status", "approved")
                    .execute()
                )

                payments = payments_result.data or []

                for payment in payments:

                    total_revenue += int(
                        payment.get("amount") or 0
                    )

                    artist_revenue += int(
                        payment.get("artist_amount") or 0
                    )

            # --------------------------------------
            # ATTACH REVENUE
            # --------------------------------------

            withdrawal["total_revenue"] = (
                total_revenue
            )

            withdrawal["artist_revenue"] = (
                artist_revenue
            )

        # ==========================================
        # RETURN WITHDRAWALS
        # ==========================================

        return {
            "withdrawals": withdrawal_data
        }

    except Exception as e:

        print(
            "ALL WITHDRAWALS ERROR:",
            repr(e)
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to load withdrawals"
        )











# ==========================================
# FIREBASE ADMIN NOTIFICATION TEST
# ==========================================

@router.post("/test-admin-notification")
def test_admin_notification():

    try:

        result = send_admin_notification(
            title="KOLO MUSIC ADMIN",
            body="Admin notifications are working!",
            data={
                "type": "admin_test",
                "source": "kolo_music",
            },
        )

        return result

    except Exception as e:

        print(
            "ADMIN NOTIFICATION TEST ERROR:",
            repr(e)
        )

        raise HTTPException(
            status_code=500,
            detail=f"Unable to send admin notification: {str(e)}"
        )


# ==========================================
# FIREBASE USER NOTIFICATION TEST
# ==========================================

class UserNotificationTestRequest(BaseModel):
    user_id: str


@router.post("/test-user-notification")
def test_user_notification(
    notification: UserNotificationTestRequest
):

    try:

        if not notification.user_id:
            raise HTTPException(
                status_code=400,
                detail="User ID is required"
            )

        result = send_user_notification(
            user_id=notification.user_id,
            title="KOLO MUSIC TEST",
            body="User notification system is working!",
            data={
                "type": "user_test",
                "source": "kolo_music"
            }
        )

        return result

    except HTTPException:
        raise

    except Exception as e:

        print(
            "USER NOTIFICATION TEST ERROR:",
            repr(e)
        )

        raise HTTPException(
            status_code=500,
            detail=f"Unable to send user notification: {str(e)}"
        )

# ==========================================
# FIREBASE NOTIFICATION TEST
# ==========================================

@router.post("/test-notification")
def test_firebase_notification():

    try:

        result = (
            supabase
            .table("notification_tokens")
            .select("token,user_id,platform")
            .not_.in_(
                "token",
                [
                    "TEST_KOLO_TOKEN_123",
                    "TEST_CONNECTION_TOKEN"
                ]
            )
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )

        tokens = result.data or []

        if not tokens:
            raise HTTPException(
                status_code=404,
                detail="No notification token found"
            )

        notification_token = tokens[0]["token"]

        firebase_response = send_notification(
            token=notification_token,
            title="KOLO MUSIC",
            body="Firebase notifications are working!",
            data={
                "type": "test",
                "source": "kolo_music"
            }
        )

        return {
            "success": True,
            "message": "Firebase notification sent successfully",
            "firebase_response": firebase_response,
            "user_id": tokens[0]["user_id"],
            "platform": tokens[0]["platform"]
        }

    except HTTPException:
        raise

    except Exception as e:

        print(
            "FIREBASE TEST NOTIFICATION ERROR:",
            repr(e)
        )

        raise HTTPException(
            status_code=500,
            detail=f"Unable to send Firebase notification: {str(e)}"
        )











