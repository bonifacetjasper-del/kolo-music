from fastapi import APIRouter, HTTPException, Header

from pydantic import BaseModel

from backend.database import supabase


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
    user_id: str = Header(...)
):

    try:

        # ==================================
        # GET ARTIST
        # ==================================

        artist = get_current_artist(user_id)

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

# ==========================================
# REQUEST WITHDRAWAL
# ==========================================

@router.post("/withdraw")
def request_withdrawal(
    withdrawal: WithdrawalRequest,
    user_id: str = Header(...)
):

    try:

        # ==================================
        # GET ARTIST
        # ==================================

        artist = get_current_artist(user_id)

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
        # GET WALLET
        # ==================================

        wallet_result = (
            supabase
            .table("wallets")
            .select("*")
            .eq("user_id", user_id)
            .execute()
        )

        if not wallet_result.data:

            raise HTTPException(
                status_code=404,
                detail="Wallet not found"
            )

        wallet = wallet_result.data[0]

        current_balance = int(
            wallet.get("balance") or 0
        )

        # ==================================
        # CHECK BALANCE
        # ==================================

        if current_balance < amount:

            raise HTTPException(
                status_code=400,
                detail=(
                    f"Insufficient balance. "
                    f"Available: {current_balance} LD"
                )
            )

        # ==================================
        # CREATE WITHDRAWAL
        # ==================================

        withdrawal_result = (
            supabase
            .table("withdrawals")
            .insert({
                "user_id": user_id,
                "amount": amount,
                "status": "pending"
            })
            .execute()
        )

        if not withdrawal_result.data:

            raise HTTPException(
                status_code=500,
                detail="Unable to create withdrawal request"
            )

        # ==================================
        # LOCK AMOUNT FROM WALLET
        # ==================================

        new_balance = current_balance - amount

        wallet_update = (
            supabase
            .table("wallets")
            .update({
                "balance": new_balance
            })
            .eq("user_id", user_id)
            .execute()
        )

        if not wallet_update.data:

            raise HTTPException(
                status_code=500,
                detail=(
                    "Withdrawal created but "
                    "wallet update failed"
                )
            )

        # ==================================
        # SUCCESS
        # ==================================

        return {

            "success": True,

            "message": (
                "Withdrawal request submitted successfully"
            ),

            "withdrawal": withdrawal_result.data[0],

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
    user_id: str = Header(...)
):

    try:

        artist = get_current_artist(user_id)

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
