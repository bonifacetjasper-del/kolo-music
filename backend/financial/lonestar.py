import os
import uuid
from pathlib import Path

import httpx
from dotenv import load_dotenv


# ==========================================
# LOAD KOLO MUSIC BACKEND ENVIRONMENT
# ==========================================

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


class LonestarProvider:
    """
    KOLO MUSIC Lonestar / MTN MoMo provider.

    Handles MTN MoMo OAuth authentication and withdrawals.
    Credentials are loaded from backend/.env and are never
    hard-coded into the application.
    """

    def __init__(self):

        self.base_url = os.getenv(
            "LONESTAR_API_BASE_URL",
            "https://preprod.mtn.com/v1"
        ).rstrip("/")

        self.api_key = os.getenv(
            "LONESTAR_API_KEY"
        )

        self.client_id = os.getenv(
            "LONESTAR_CLIENT_ID"
        )

        self.client_secret = os.getenv(
            "LONESTAR_CLIENT_SECRET"
        )

        self.oauth_url = (
            "https://api.mtn.com/v1/oauth/access_token"
            
        )

    def _headers(self):

        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

        if self.api_key:
            headers["X-API-Key"] = self.api_key

        return headers

    def get_access_token(self):

        if not self.client_id:
            raise RuntimeError(
                "LONESTAR_CLIENT_ID is not configured."
            )

        if not self.client_secret:
            raise RuntimeError(
                "LONESTAR_CLIENT_SECRET is not configured."
            )

        headers = {
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "application/json",
        }

        response = httpx.post(
            self.oauth_url,
            params={
                "grant_type": "client_credentials"
            },
            headers=headers,
            data={
                "client_id": self.client_id,
                "client_secret": self.client_secret,
            },
            timeout=30,
        )

        print(
            "MTN OAUTH STATUS:",
            response.status_code
        )

        if response.status_code >= 400:
            raise RuntimeError(
                f"MTN OAuth failed: "
                f"{response.status_code} "
                f"{response.text[:1000]}"
            )

        data = response.json()

        token = data.get("access_token")

        if not token:
            raise RuntimeError(
                "MTN OAuth response did not contain access_token."
            )

        return token
    def create_withdrawal(
        self,
        amount: float,
        mobile_money_number: str,
        mobile_money_name: str,
        external_reference: str | None = None,
    ):

        if amount <= 0:
            raise ValueError(
                "Withdrawal amount must be greater than zero."
            )

        if not mobile_money_number:
            raise ValueError(
                "Mobile money number is required."
            )

        transaction_id = (
            external_reference or str(uuid.uuid4())
        )

        return {
            "success": False,
            "mode": "oauth_ready",
            "provider": "lonestar",
            "transaction_id": transaction_id,
            "amount": amount,
            "mobile_money_number": mobile_money_number,
            "mobile_money_name": mobile_money_name,
            "message": (
                "Lonestar provider is configured. "
                "OAuth authentication is ready. "
                "Withdrawal endpoint integration is next."
            ),
        }




