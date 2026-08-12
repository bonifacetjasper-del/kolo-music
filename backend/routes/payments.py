from fastapi import (
    APIRouter,
    HTTPException,
    UploadFile,
    File,
    Form
)

from pydantic import BaseModel

from database import supabase



# ==============================
# PAYMENTS ROUTER
# ==============================

router = APIRouter(
    prefix="/payments",
    tags=["Payments"]
)


# ==========================
# PAYMENT REQUEST MODEL
# ==========================

class PaymentRequest(BaseModel):

    user_id: str
    song_id: str
    amount: int
    payment_method: str



# ==========================
# CREATE PAYMENT
# ==========================

@router.post("/create")
def create_payment(payment: PaymentRequest):

    try:

        # Check song exists and approved

        song = supabase.table("songs") \
            .select("*") \
            .eq("id", payment.song_id) \
            .eq("status", "approved") \
            .execute()


        if not song.data:

            raise HTTPException(
                status_code=404,
                detail="Song not available"
            )


        # Create payment record

        result = supabase.table("payments").insert(
            {
                "user_id": payment.user_id,
                "song_id": payment.song_id,
                "amount": payment.amount,
                "payment_method": payment.payment_method,
                "status": "pending"
            }
        ).execute()



        return {

            "message": "Payment request created",

            "payment": result.data

        }



    except Exception as e:

        raise HTTPException(
            status_code=400,
            detail=str(e)
        )
    



    # ==========================
# UPLOAD PAYMENT PROOF
# ==========================

@router.post("/upload-proof")
async def upload_payment_proof(
    
    payment_id: str = Form(...),
    proof: UploadFile = File(...)

):

    try:

        # Check payment exists

        payment = supabase.table("payments") \
            .select("*") \
            .eq("id", payment_id) \
            .execute()


        if not payment.data:

            raise HTTPException(
                status_code=404,
                detail="Payment not found"
            )


        # Upload image

        file_bytes = await proof.read()


        file_path = f"{payment_id}/{proof.filename}"


        supabase.storage \
            .from_("payment-proofs") \
            .upload(
                file_path,
                file_bytes
            )


        proof_url = supabase.storage \
            .from_("payment-proofs") \
            .get_public_url(
                file_path
            )


        # Update payment record

        updated = supabase.table("payments") \
            .update(
                {
                    "proof_image": proof_url
                }
            ) \
            .eq("id", payment_id) \
            .execute()


        return {

            "message": "Payment proof uploaded",

            "payment": updated.data

        }


    except Exception as e:

        raise HTTPException(
            status_code=400,
            detail=str(e)
        )