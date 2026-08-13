from fastapi import APIRouter, HTTPException

from backend.database import supabase


# ==========================================
# LISTENER ROUTER
# ==========================================

router = APIRouter(
    prefix="/listener",
    tags=["Listener Dashboard"]
)


# ==========================================
# LISTENER DASHBOARD
# ==========================================

@router.get("/dashboard/{user_id}")
def listener_dashboard(user_id: str):

    try:

        # --------------------------------------
        # GET USER
        # --------------------------------------

        user_result = (
            supabase
            .table("users")
            .select(
                "id, full_name, phone, role, created_at"
            )
            .eq("id", user_id)
            .limit(1)
            .execute()
        )

        if not user_result.data:

            raise HTTPException(
                status_code=404,
                detail="User not found"
            )

        user = user_result.data[0]


        # --------------------------------------
        # GET LISTENING ACCESS
        # --------------------------------------

        access_result = (
            supabase
            .table("listening_access")
            .select(
                "id, user_id, song_id, "
                "payment_id, used, created_at"
            )
            .eq("user_id", user_id)
            .order(
                "created_at",
                desc=True
            )
            .execute()
        )

        access_records = (
            access_result.data
            or []
        )


        # --------------------------------------
        # BUILD MUSIC LIBRARY
        # --------------------------------------

        songs = []


        for access in access_records:

            song_id = access.get("song_id")

            if not song_id:
                continue


            # ----------------------------------
            # GET SONG
            # ----------------------------------

            song_result = (
                supabase
                .table("songs")
                .select(
                    "id, title, description, "
                    "cover_image, artist_id, status"
                )
                .eq("id", song_id)
                .limit(1)
                .execute()
            )


            if not song_result.data:
                continue


            song = song_result.data[0]


            # ----------------------------------
            # GET ARTIST
            # ----------------------------------

            artist_name = "Unknown Artist"

            artist_id = song.get("artist_id")


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


            # ----------------------------------
            # ADD SONG
            # ----------------------------------

            songs.append(
                {

                    "access_id":
                        access.get("id"),

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

                    "purchased_at":
                        access.get(
                            "created_at"
                        ),

                    "payment_id":
                        access.get(
                            "payment_id"
                        )

                }
            )


        # --------------------------------------
        # DASHBOARD RESPONSE
        # --------------------------------------

        return {

            "user": {

                "id":
                    user.get("id"),

                "full_name":
                    user.get("full_name"),

                "phone":
                    user.get("phone"),

                "role":
                    user.get(
                        "role",
                        "listener"
                    )

            },

            "purchased_songs":
                len(songs),

            "available_screams":
                sum(
                    1
                    for song in songs
                    if not song["used"]
                ),

            "used_screams":
                sum(
                    1
                    for song in songs
                    if song["used"]
                ),

            "songs":
                songs

        }


    except HTTPException:

        raise


    except Exception as e:

        print(
            "LISTENER DASHBOARD ERROR:",
            repr(e)
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to load listener dashboard"
        )
