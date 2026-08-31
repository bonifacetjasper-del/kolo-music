from pathlib import Path

import firebase_admin
from firebase_admin import credentials, messaging

from backend.database import supabase


BASE_DIR = Path(__file__).resolve().parent
SERVICE_ACCOUNT_FILE = BASE_DIR / "firebase-service-account.json"


# ==========================================
# FIREBASE INITIALIZATION
# ==========================================

def initialize_firebase():
    """
    Initialize Firebase Admin SDK once.
    """

    if firebase_admin._apps:
        return firebase_admin.get_app()

    if not SERVICE_ACCOUNT_FILE.exists():
        raise FileNotFoundError(
            f"Firebase service account not found: {SERVICE_ACCOUNT_FILE}"
        )

    cred = credentials.Certificate(str(SERVICE_ACCOUNT_FILE))

    app = firebase_admin.initialize_app(cred)

    print("KOLO FIREBASE ADMIN: Connected successfully")

    return app


# ==========================================
# SEND TO ONE DEVICE
# ==========================================

def send_notification(
    token: str,
    title: str,
    body: str,
    data: dict | None = None,
):
    """
    Send a Firebase Cloud Messaging notification
    to one device.
    """

    if not token:
        raise ValueError(
            "Firebase notification token is required"
        )

    initialize_firebase()

    message = messaging.Message(
        notification=messaging.Notification(
            title=title,
            body=body,
        ),
        data={
            str(key): str(value)
            for key, value in (data or {}).items()
        },
        token=token,
    )

    response = messaging.send(message)

    print(
        "KOLO FIREBASE: Notification sent:",
        response
    )

    return response


# ==========================================
# DELETE INVALID TOKEN
# ==========================================

def remove_notification_token(token: str):
    """
    Remove an invalid/expired FCM token from
    the notification_tokens table.
    """

    if not token:
        return

    try:

        supabase \
            .table("notification_tokens") \
            .delete() \
            .eq("token", token) \
            .execute()

        print(
            "KOLO FIREBASE: Removed invalid token"
        )

    except Exception as e:

        print(
            "KOLO FIREBASE TOKEN CLEANUP ERROR:",
            repr(e)
        )


# ==========================================
# SEND TO MULTIPLE TOKENS
# ==========================================

def send_notification_to_tokens(
    tokens: list[str],
    title: str,
    body: str,
    data: dict | None = None,
):
    """
    Send a notification to multiple FCM tokens.

    Invalid/unregistered tokens are removed.
    """

    results = []

    for token in tokens:

        if not token:
            continue

        try:

            response = send_notification(
                token=token,
                title=title,
                body=body,
                data=data,
            )

            results.append(
                {
                    "token": token,
                    "success": True,
                    "response": response,
                }
            )

        except Exception as e:

            error_text = str(e)

            print(
                "KOLO FIREBASE SEND ERROR:",
                repr(e)
            )

            # Firebase commonly reports invalid/unregistered
            # registration tokens with these messages.
            invalid_token = (
                "registration token is not a valid FCM registration token"
                in error_text
                or "Requested entity was not found"
                in error_text
                or "registration-token-not-registered"
                in error_text
            )

            if invalid_token:

                remove_notification_token(token)

            results.append(
                {
                    "token": token,
                    "success": False,
                    "error": error_text,
                }
            )

    return results


# ==========================================
# GET USER NOTIFICATION TOKENS
# ==========================================

def get_user_notification_tokens(
    user_id: str,
):
    """
    Get all notification tokens belonging to
    one KOLO MUSIC user.
    """

    if not user_id:
        return []

    result = (
        supabase
        .table("notification_tokens")
        .select("token")
        .eq("user_id", user_id)
        .execute()
    )

    rows = result.data or []

    return [
        row["token"]
        for row in rows
        if row.get("token")
    ]


# ==========================================
# SEND TO ONE KOLO USER
# ==========================================

def send_user_notification(
    user_id: str,
    title: str,
    body: str,
    data: dict | None = None,
):
    """
    Send a notification to all registered devices
    belonging to one KOLO MUSIC user.
    """

    tokens = get_user_notification_tokens(
        user_id
    )

    if not tokens:

        print(
            "KOLO FIREBASE: No notification tokens "
            f"found for user {user_id}"
        )

        return {
            "success": False,
            "message": "No notification tokens found",
            "user_id": user_id,
            "sent": 0,
            "results": [],
        }

    results = send_notification_to_tokens(
        tokens=tokens,
        title=title,
        body=body,
        data=data,
    )

    successful = sum(
        1
        for result in results
        if result.get("success")
    )

    return {
        "success": successful > 0,
        "message": "User notification processed",
        "user_id": user_id,
        "sent": successful,
        "tokens": len(tokens),
        "results": results,
    }


# ==========================================
# GET ALL ADMIN USERS
# ==========================================

def get_admin_user_ids():
    """
    Find every KOLO MUSIC user whose role is admin.
    """

    result = (
        supabase
        .table("users")
        .select("id")
        .eq("role", "admin")
        .execute()
    )

    rows = result.data or []

    return [
        row["id"]
        for row in rows
        if row.get("id")
    ]


# ==========================================
# SEND TO ALL ADMINS
# ==========================================

def send_admin_notification(
    title: str,
    body: str,
    data: dict | None = None,
):
    """
    Send a notification to every KOLO MUSIC admin
    on every registered device.
    """

    admin_ids = get_admin_user_ids()

    if not admin_ids:

        print(
            "KOLO FIREBASE: No admin users found"
        )

        return {
            "success": False,
            "message": "No admin users found",
            "admins": 0,
            "sent": 0,
            "results": [],
        }

    results = []

    total_sent = 0

    for admin_id in admin_ids:

        result = send_user_notification(
            user_id=admin_id,
            title=title,
            body=body,
            data=data,
        )

        total_sent += result.get(
            "sent",
            0
        )

        results.append(result)

    return {
        "success": total_sent > 0,
        "message": "Admin notification processed",
        "admins": len(admin_ids),
        "sent": total_sent,
        "results": results,
    }
