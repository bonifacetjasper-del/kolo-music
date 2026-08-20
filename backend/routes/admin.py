from fastapi import APIRouter, HTTPException, Depends

from backend.database import supabase
from backend.security import require_admin


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

        result = (
            supabase
            .table("artists")
            .select("*")
            .eq("status", "pending")
            .execute()
        )

        return {
            "artists": result.data or []
        }

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

        return {
            "success": True,
            "message": "Artist approved",
            "artist": result.data
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

        return {
            "success": True,
            "message": "Artist rejected",
            "artist": result.data
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

        return {
            "success": True,
            "message": "Song approved",
            "song": result.data
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

        return {
            "success": True,
            "message": "Song rejected",
            "song": result.data
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



