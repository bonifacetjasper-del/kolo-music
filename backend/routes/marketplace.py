from fastapi import APIRouter, HTTPException

from backend.database import supabase


# ==========================================
# MUSIC MARKETPLACE ROUTER
# ==========================================

router = APIRouter(
    prefix="/marketplace",
    tags=["Music Marketplace"]
)


# ==========================================
# GET ALL APPROVED SONGS
# ==========================================

@router.get("/songs")
def get_marketplace_songs():

    try:

        songs_result = (
            supabase
            .table("songs")
            .select(
                "id, title, description, "
                "cover_image, artist_id, created_at, status"
            )
            .eq("status", "approved")
            .order(
                "created_at",
                desc=True
            )
            .execute()
        )

        songs = songs_result.data or []

        result = []

        for song in songs:

            artist_name = "Unknown Artist"

            artist_id = song.get("artist_id")

            if artist_id:

                artist_result = (
                    supabase
                    .table("artists")
                    .select("artist_name")
                    .eq("id", artist_id)
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

            result.append(
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

                    "price":
                        50,

                    "currency":
                        "LD",

                    "created_at":
                        song.get("created_at")
                }
            )

        return {
            "songs": result,
            "count": len(result)
        }

    except Exception as e:

        print(
            "MARKETPLACE SONGS ERROR:",
            repr(e)
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to load marketplace songs"
        )


# ==========================================
# GET SINGLE SONG
# ==========================================

@router.get("/song/{song_id}")
def get_song(song_id: str):

    try:

        song_result = (
            supabase
            .table("songs")
            .select(
                "id, title, description, "
                "cover_image, artist_id, "
                "created_at, status"
            )
            .eq("id", song_id)
            .eq("status", "approved")
            .limit(1)
            .execute()
        )

        if not song_result.data:

            raise HTTPException(
                status_code=404,
                detail="Song not found"
            )

        song = song_result.data[0]

        artist_name = "Unknown Artist"
        artist_bio = None

        artist_id = song.get("artist_id")

        if artist_id:

            artist_result = (
                supabase
                .table("artists")
                .select(
                    "artist_name, bio"
                )
                .eq(
                    "id",
                    artist_id
                )
                .limit(1)
                .execute()
            )

            if artist_result.data:

                artist = artist_result.data[0]

                artist_name = artist.get(
                    "artist_name",
                    "Unknown Artist"
                )

                artist_bio = artist.get(
                    "bio"
                )

        return {

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

            "artist_bio":
                artist_bio,

            "price":
                50,

            "currency":
                "LD",

            "created_at":
                song.get("created_at")

        }

    except HTTPException:

        raise

    except Exception as e:

        print(
            "SINGLE SONG ERROR:",
            repr(e)
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to load song"
        )


# ==========================================
# SEARCH SONGS
# ==========================================

@router.get("/search")
def search_songs(query: str):

    try:

        query = query.strip()

        if not query:

            raise HTTPException(
                status_code=400,
                detail="Search query is required"
            )

        songs_result = (
            supabase
            .table("songs")
            .select(
                "id, title, description, "
                "cover_image, artist_id, "
                "created_at"
            )
            .eq(
                "status",
                "approved"
            )
            .ilike(
                "title",
                f"%{query}%"
            )
            .order(
                "created_at",
                desc=True
            )
            .execute()
        )

        songs = songs_result.data or []

        result = []

        for song in songs:

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

            result.append(
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

                    "price":
                        50,

                    "currency":
                        "LD"

                }
            )

        return {
            "songs": result,
            "count": len(result)
        }

    except HTTPException:

        raise

    except Exception as e:

        print(
            "SEARCH ERROR:",
            repr(e)
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to search songs"
        )


# ==========================================
# VIEW ARTIST PROFILE
# ==========================================

@router.get("/artist/{artist_id}")
def get_artist_profile(
    artist_id: str
):

    try:

        artist_result = (
            supabase
            .table("artists")
            .select(
                "id, artist_name, bio, status"
            )
            .eq(
                "id",
                artist_id
            )
            .eq(
                "status",
                "approved"
            )
            .limit(1)
            .execute()
        )

        if not artist_result.data:

            raise HTTPException(
                status_code=404,
                detail="Artist not found"
            )

        artist = artist_result.data[0]

        songs_result = (
            supabase
            .table("songs")
            .select(
                "id, title, description, "
                "cover_image, created_at"
            )
            .eq(
                "artist_id",
                artist_id
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

        songs = songs_result.data or []

        formatted_songs = []

        for song in songs:

            formatted_songs.append(
                {

                    "song_id":
                        song.get("id"),

                    "title":
                        song.get("title"),

                    "description":
                        song.get("description"),

                    "cover_image":
                        song.get("cover_image"),

                    "price":
                        50,

                    "currency":
                        "LD",

                    "created_at":
                        song.get("created_at")

                }
            )

        return {

            "artist_id":
                artist.get("id"),

            "artist_name":
                artist.get(
                    "artist_name"
                ),

            "bio":
                artist.get("bio"),

            "songs_uploaded":
                len(formatted_songs),

            "songs":
                formatted_songs

        }

    except HTTPException:

        raise

    except Exception as e:

        print(
            "ARTIST PROFILE ERROR:",
            repr(e)
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to load artist profile"
        )


# ==========================================
# TRENDING SONGS
# ==========================================

@router.get("/trending")
def get_trending_songs():

    try:

        songs_result = (
            supabase
            .table("songs")
            .select(
                "id, title, cover_image, "
                "artist_id, created_at"
            )
            .eq(
                "status",
                "approved"
            )
            .execute()
        )

        songs = songs_result.data or []

        trending = []

        for song in songs:

            # ----------------------------------
            # COUNT APPROVED SCREAMS
            # ----------------------------------

            sales_result = (
                supabase
                .table("payments")
                .select("id")
                .eq(
                    "song_id",
                    song.get("id")
                )
                .eq(
                    "status",
                    "approved"
                )
                .execute()
            )

            sales = len(
                sales_result.data or []
            )


            # ----------------------------------
            # GET ARTIST
            # ----------------------------------

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


            trending.append(
                {

                    "song_id":
                        song.get("id"),

                    "title":
                        song.get("title"),

                    "cover_image":
                        song.get("cover_image"),

                    "artist_name":
                        artist_name,

                    "sales":
                        sales,

                    "price":
                        50,

                    "currency":
                        "LD"

                }
            )


        # --------------------------------------
        # SORT BY SCREAMS
        # --------------------------------------

        trending.sort(
            key=lambda song:
                song["sales"],
            reverse=True
        )


        return {

            "songs":
                trending[:10],

            "count":
                len(trending[:10])

        }


    except Exception as e:

        print(
            "TRENDING ERROR:",
            repr(e)
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to load trending songs"
        )
