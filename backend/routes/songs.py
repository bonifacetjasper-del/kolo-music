from fastapi import APIRouter, UploadFile, File, Form, HTTPException

from backend.database import supabase

router = APIRouter(
    prefix="/songs",
    tags=["Songs"]
)


@router.post("/upload")
async def upload_song(
    artist_id: str = Form(...),
    title: str = Form(...),
    description: str = Form(None),
    cover: UploadFile = File(...),
    audio: UploadFile = File(...)
):
    try:

        # =====================================================
        # STEP 1 — CHECK ARTIST
        # =====================================================

        print("STEP 1 - Checking artist...")

        artist_check = (
            supabase
            .table("artists")
            .select("*")
            .eq("id", artist_id)
            .eq("status", "approved")
            .execute()
        )

        if not artist_check.data:
            raise HTTPException(
                status_code=403,
                detail="Artist not approved"
            )

        print("STEP 1 SUCCESS - Artist approved.")

        # =====================================================
        # STEP 2 — UPLOAD COVER
        # =====================================================

        print("STEP 2 - Reading cover...")

        cover_bytes = await cover.read()

        cover_path = f"{artist_id}/{cover.filename}"

        print("STEP 2 - Cover path:", cover_path)

        try:
            cover_upload = (
                supabase
                .storage
                .from_("covers")
                .upload(
                    cover_path,
                    cover_bytes
                )
            )

            print(
                "STEP 2 SUCCESS - Cover uploaded:",
                cover_upload
            )

        except Exception as e:
            print("STEP 2 FAILED - COVER UPLOAD:", repr(e))

            raise HTTPException(
                status_code=403,
                detail=f"Cover upload failed: {str(e)}"
            )

        # =====================================================
        # STEP 3 — COVER URL
        # =====================================================

        print("STEP 3 - Creating cover URL...")

        cover_url = (
            supabase
            .storage
            .from_("covers")
            .get_public_url(cover_path)
        )

        print("STEP 3 SUCCESS - Cover URL:", cover_url)

        # =====================================================
        # STEP 4 — UPLOAD AUDIO
        # =====================================================

        print("STEP 4 - Reading audio...")

        audio_bytes = await audio.read()

        audio_path = f"{artist_id}/{audio.filename}"

        print("STEP 4 - Audio path:", audio_path)

        try:
            audio_upload = (
                supabase
                .storage
                .from_("songs")
                .upload(
                    audio_path,
                    audio_bytes
                )
            )

            print(
                "STEP 4 SUCCESS - Audio uploaded:",
                audio_upload
            )

        except Exception as e:
            print("STEP 4 FAILED - AUDIO UPLOAD:", repr(e))

            raise HTTPException(
                status_code=403,
                detail=f"Audio upload failed: {str(e)}"
            )

        # =====================================================
        # STEP 5 — AUDIO URL
        # =====================================================

        print("STEP 5 - Creating audio URL...")

        audio_url = (
            supabase
            .storage
            .from_("songs")
            .get_public_url(audio_path)
        )

        print("STEP 5 SUCCESS - Audio URL:", audio_url)

        # =====================================================
        # STEP 6 — SAVE SONG
        # =====================================================

        print("STEP 6 - Saving song to database...")

        try:
            song = (
                supabase
                .table("songs")
                .insert(
                    {
                        "artist_id": artist_id,
                        "title": title,
                        "description": description,
                        "cover_image": cover_url,
                        "audio_file": audio_url,
                        "status": "pending"
                    }
                )
                .execute()
            )

            print(
                "STEP 6 SUCCESS - Song saved:",
                song.data
            )

        except Exception as e:
            print(
                "STEP 6 FAILED - SONG DATABASE INSERT:",
                repr(e)
            )

            raise HTTPException(
                status_code=403,
                detail=f"Song database insert failed: {str(e)}"
            )

        # =====================================================
        # STEP 7 — FINISHED
        # =====================================================

        print("STEP 7 - Finished!")

        return {
            "success": True,
            "message": "Song uploaded successfully",
            "song": song.data
        }

    except HTTPException:
        raise

    except Exception as e:

        print("SONG UPLOAD ERROR:", repr(e))

        raise HTTPException(
            status_code=400,
            detail=str(e)
        )
        
        
        # ==========================================
# DISCOVER APPROVED MUSIC
# ==========================================

@router.get("/discover")
def discover_music():

    try:

        # --------------------------------------
        # GET APPROVED SONGS
        # --------------------------------------

        result = (
            supabase
            .table("songs")
            .select(
                "id, title, description, "
                "cover_image, artist_id, status"
            )
            .eq("status", "approved")
            .order("created_at", desc=True)
            .execute()
        )

        songs = []

        # --------------------------------------
        # ADD ARTIST INFORMATION
        # --------------------------------------

        for song in result.data or []:

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

            songs.append({

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

            })

        # --------------------------------------
        # RETURN DISCOVER MUSIC
        # --------------------------------------

        return {
            "songs": songs
        }

    except Exception as e:

        print(
            "DISCOVER MUSIC ERROR:",
            repr(e)
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to load discover music"
        )
