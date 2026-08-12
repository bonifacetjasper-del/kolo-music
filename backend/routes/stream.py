from fastapi import APIRouter, HTTPException
from fastapi.responses import RedirectResponse

from database import supabase


# =========================================================
# STREAMING ROUTER
# =========================================================

router = APIRouter(
    prefix="/stream",
    tags=["Streaming"]
)


# =========================================================
# GET LISTENER MUSIC LIBRARY
# =========================================================
#
# Library = songs the listener has purchased.
#
# We only use:
# listening_access
#
# Actual access columns:
# id
# user_id
# song_id
# payment_id
# used
#
# =========================================================

@router.get("/library/{user_id}")
def get_listener_library(user_id: str):

    try:

        # -------------------------------------------------
        # VALIDATE USER ID
        # -------------------------------------------------

        if not user_id:

            raise HTTPException(
                status_code=400,
                detail="User ID is required."
            )


        # -------------------------------------------------
        # GET LISTENING ACCESS
        # -------------------------------------------------

        access_result = (
            supabase
            .table("listening_access")
            .select(
                "id, user_id, song_id, payment_id, used"
            )
            .eq(
                "user_id",
                user_id
            )
            .order(
                "id",
                desc=True
            )
            .execute()
        )


        access_records = (
            access_result.data
            if access_result.data
            else []
        )


        # -------------------------------------------------
        # EMPTY LIBRARY
        # -------------------------------------------------

        if not access_records:

            return {
                "success": True,
                "songs": []
            }


        songs = []


        # -------------------------------------------------
        # GET SONGS
        # -------------------------------------------------

        for access in access_records:

            song_id = access.get("song_id")


            if not song_id:
                continue


            song_result = (
                supabase
                .table("songs")
                .select(
                    "id, title, description, "
                    "cover_image, artist_id, status"
                )
                .eq(
                    "id",
                    song_id
                )
                .limit(1)
                .execute()
            )


            if not song_result.data:
                continue


            song = song_result.data[0]


            # -------------------------------------------------
            # ONLY APPROVED SONGS
            # -------------------------------------------------

            if song.get("status") != "approved":
                continue


            # -------------------------------------------------
            # GET ARTIST NAME
            # -------------------------------------------------

            artist_name = "Unknown Artist"

            artist_id = song.get("artist_id")


            if artist_id:

                artist_result = (
                    supabase
                    .table("artists")
                    .select("artist_name")
                    .eq(
                        "id",
                        artist_id
                    )
                    .limit(1)
                    .execute()
                )


                if artist_result.data:

                    artist_name = (
                        artist_result
                        .data[0]
                        .get(
                            "artist_name",
                            "Unknown Artist"
                        )
                    )


            # -------------------------------------------------
            # ADD TO LIBRARY
            # -------------------------------------------------

            songs.append(
                {
                    "song_id":
                        song.get("id"),

                    "title":
                        song.get("title"),

                    "description":
                        song.get("description"),

                    "cover_image":
                        song.get("cover_image"),

                    "artist_name":
                        artist_name,

                    "used":
                        bool(
                            access.get(
                                "used",
                                False
                            )
                        ),

                    "access_id":
                        access.get("id"),

                    "payment_id":
                        access.get("payment_id")
                }
            )


        # -------------------------------------------------
        # RETURN LIBRARY
        # -------------------------------------------------

        return {
            "success": True,
            "songs": songs
        }


    except HTTPException:

        raise


    except Exception as e:

        print(
            "LIBRARY ERROR:",
            repr(e)
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to load music library."
        )


# =========================================================
# CHECK LISTENING ACCESS
# =========================================================

@router.get(
    "/access/{user_id}/{song_id}"
)
def check_listening_access(
    user_id: str,
    song_id: str
):

    try:

        # -------------------------------------------------
        # FIND UNUSED ACCESS
        # -------------------------------------------------

        access_result = (
            supabase
            .table("listening_access")
            .select(
                "id, user_id, song_id, payment_id, used"
            )
            .eq(
                "user_id",
                user_id
            )
            .eq(
                "song_id",
                song_id
            )
            .eq(
                "used",
                False
            )
            .limit(1)
            .execute()
        )


        if not access_result.data:

            return {
                "success": True,
                "allowed": False,
                "message":
                    "No available listening access."
            }


        access = access_result.data[0]


        return {
            "success": True,

            "allowed": True,

            "message":
                "Listening access available.",

            "access":
                access
        }


    except Exception as e:

        print(
            "ACCESS CHECK ERROR:",
            repr(e)
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to check listening access."
        )


# =========================================================
# DISCOVER MUSIC
# =========================================================
#
# This endpoint returns ALL approved songs.
#
# Discover != Library
#
# Discover:
#   All approved songs
#
# Library:
#   Songs purchased by current listener
#
# =========================================================

@router.get("/discover")
def discover_music():

    try:

        # -------------------------------------------------
        # GET APPROVED SONGS
        # -------------------------------------------------

        songs_result = (
            supabase
            .table("songs")
            .select(
                "id, title, description, "
                "cover_image, artist_id, status"
            )
            .eq(
                "status",
                "approved"
            )
            .order(
                "created_at",
                desc=True
            )
            .execute()
        )


        songs_data = (
            songs_result.data
            if songs_result.data
            else []
        )


        songs = []


        # -------------------------------------------------
        # GET ARTIST INFORMATION
        # -------------------------------------------------

        for song in songs_data:

            artist_name = "Unknown Artist"

            artist_id = song.get(
                "artist_id"
            )


            if artist_id:

                artist_result = (
                    supabase
                    .table("artists")
                    .select(
                        "artist_name"
                    )
                    .eq(
                        "id",
                        artist_id
                    )
                    .limit(1)
                    .execute()
                )


                if artist_result.data:

                    artist_name = (
                        artist_result
                        .data[0]
                        .get(
                            "artist_name",
                            "Unknown Artist"
                        )
                    )


            songs.append(
                {
                    "song_id":
                        song.get("id"),

                    "title":
                        song.get("title"),

                    "description":
                        song.get("description"),

                    "cover_image":
                        song.get("cover_image"),

                    "artist_name":
                        artist_name,

                    "status":
                        song.get("status")
                }
            )


        return {
            "success": True,
            "songs": songs
        }


    except Exception as e:

        print(
            "DISCOVER MUSIC ERROR:",
            repr(e)
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to load approved music."
        )


# =========================================================
# PLAY / STREAM SONG
# =========================================================
#
# URL:
#
# /stream/{user_id}/{song_id}
#
# Rules:
#
# 1. Listener must have listening_access.
# 2. Access must have used = false.
# 3. Song must be approved.
# 4. Access is consumed.
# 5. Browser is redirected to audio.
#
# =========================================================

@router.get(
    "/{user_id}/{song_id}"
)
def stream_song(
    user_id: str,
    song_id: str
):

    try:

        # -------------------------------------------------
        # VALIDATE USER
        # -------------------------------------------------

        if not user_id:

            raise HTTPException(
                status_code=400,
                detail="User ID is required."
            )


        if not song_id:

            raise HTTPException(
                status_code=400,
                detail="Song ID is required."
            )


        # -------------------------------------------------
        # FIND UNUSED LISTENING ACCESS
        # -------------------------------------------------

        access_result = (
            supabase
            .table("listening_access")
            .select(
                "id, user_id, song_id, payment_id, used"
            )
            .eq(
                "user_id",
                user_id
            )
            .eq(
                "song_id",
                song_id
            )
            .eq(
                "used",
                False
            )
            .limit(1)
            .execute()
        )


        if not access_result.data:

            raise HTTPException(
                status_code=403,
                detail=(
                    "No available listening access. "
                    "Please purchase another Scream."
                )
            )


        access = access_result.data[0]

        access_id = access.get("id")


        if not access_id:

            raise HTTPException(
                status_code=500,
                detail="Listening access ID is missing."
            )


        # -------------------------------------------------
        # VERIFY SONG
        # -------------------------------------------------

        song_result = (
            supabase
            .table("songs")
            .select(
                "id, title, artist_id, "
                "cover_image, audio_file, status"
            )
            .eq(
                "id",
                song_id
            )
            .eq(
                "status",
                "approved"
            )
            .limit(1)
            .execute()
        )


        if not song_result.data:

            raise HTTPException(
                status_code=404,
                detail="Approved song not found."
            )


        song = song_result.data[0]


        audio_url = song.get(
            "audio_file"
        )


        if not audio_url:

            raise HTTPException(
                status_code=404,
                detail="Audio file is not available."
            )


        # -------------------------------------------------
        # CONSUME LISTENING ACCESS
        # -------------------------------------------------
        #
        # IMPORTANT:
        #
        # We update ONLY:
        #
        #   id = exact access ID
        #
        # AND:
        #
        #   used = false
        #
        # This prevents an already-used access record
        # from being consumed again.
        #
        # -------------------------------------------------

        update_result = (
            supabase
            .table("listening_access")
            .update(
                {
                    "used": True
                }
            )
            .eq(
                "id",
                access_id
            )
            .eq(
                "used",
                False
            )
            .execute()
        )


        if not update_result.data:

            raise HTTPException(
                status_code=403,
                detail=(
                    "This listening access "
                    "has already been used."
                )
            )


        # -------------------------------------------------
        # REDIRECT TO AUDIO
        # -------------------------------------------------

        print(
            "STREAM STARTED:",
            user_id,
            song_id,
            access_id
        )


        return RedirectResponse(
            url=audio_url,
            status_code=307
        )


    except HTTPException:

        raise


    except Exception as e:

        print(
            "STREAM ERROR:",
            repr(e)
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to start stream."
        )