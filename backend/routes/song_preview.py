"""Initial HTML previews from the existing approved-only public lookup."""
from html import escape
import os
from pathlib import Path
import re
from urllib.parse import urlencode, urlsplit, unquote

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import HTMLResponse
from backend.routes.marketplace import get_song

router = APIRouter()
TEMPLATE = Path(__file__).resolve().parents[2] / "frontend" / "song.html"
ORIGIN = "https://kolo-music.vercel.app"
FALLBACK = ORIGIN + "/asserts/images/kolo-logo.png"
UUID = re.compile(r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", re.I)


def cover_url(value):
    if not isinstance(value, str) or any(ord(c) < 33 for c in value):
        return FALLBACK
    try:
        url = urlsplit(value)
        configured = urlsplit(os.getenv("SUPABASE_URL", ""))
        path = unquote(url.path)
        if (url.scheme != "https" or configured.scheme != "https"
                or not configured.hostname or url.netloc != configured.netloc
                or url.username or url.password or url.query or url.fragment
                or not path.startswith("/storage/v1/object/public/covers/")
                or "\\" in path or any(part in {".", ".."} for part in path.split("/"))
                or not path.lower().endswith((".jpg", ".jpeg", ".png", ".webp"))):
            return FALLBACK
        return value
    except ValueError:
        return FALLBACK


def unavailable(status):
    return HTMLResponse(
        '<!doctype html><html lang="en"><head><meta charset="UTF-8">'
        '<title>Song unavailable | KOLO MUSIC</title></head><body>'
        '<h1>This song is unavailable</h1><p>Explore more music on KOLO MUSIC.</p>'
        '<a href="/index.html">Back to KOLO MUSIC</a></body></html>',
        status_code=status, headers={"Cache-Control": "no-store"})


@router.get("/song.html", response_class=HTMLResponse, include_in_schema=False)
def song_preview(request: Request):
    ids = request.query_params.getlist("id")
    if len(ids) != 1 or not UUID.fullmatch(ids[0]):
        return unavailable(400)
    song_id = ids[0].lower()
    try:
        # Internal lookup: retains the public endpoint's approval filter and contract.
        song = get_song(song_id)
        if (not isinstance(song, dict) or song.get("song_id", "").lower() != song_id
                or not isinstance(song.get("title"), str) or not song["title"].strip()):
            return unavailable(503)
        title = song["title"].strip()
        artist = song.get("artist_name")
        artist = artist.strip() if isinstance(artist, str) and artist.strip() else "Unknown artist"
        description = f"Discover {title} by {artist} on KOLO MUSIC."
        canonical = ORIGIN + "/song.html?" + urlencode({"id": song_id})
        image = cover_url(song.get("cover_image"))
        page_title = f"{title} by {artist} | KOLO MUSIC"
        tags = [('property', 'og:type', 'website'), ('property', 'og:site_name', 'KOLO MUSIC'),
                ('property', 'og:title', page_title), ('property', 'og:description', description),
                ('property', 'og:url', canonical), ('property', 'og:image', image),
                ('property', 'og:image:alt', f"Cover for {title} by {artist}"),
                ('name', 'twitter:card', 'summary_large_image'), ('name', 'twitter:title', page_title),
                ('name', 'twitter:description', description), ('name', 'twitter:image', image)]
        metadata = f'<link rel="canonical" href="{escape(canonical, quote=True)}">\n'
        metadata += "\n".join(f'<meta {kind}="{key}" content="{escape(value, quote=True)}">'
                              for kind, key, value in tags)
        template = TEMPLATE.read_text(encoding="utf-8")
        template = re.sub(r"<title>.*?</title>", lambda _: f"<title>{escape(page_title, quote=True)}</title>", template, count=1)
        template = re.sub(r'<meta name="description" content="[^"]*">',
                          lambda _: f'<meta name="description" content="{escape(description, quote=True)}">', template, count=1)
        if template.count("<!-- SONG_PREVIEW_METADATA -->") != 1:
            return unavailable(503)
        return HTMLResponse(template.replace("<!-- SONG_PREVIEW_METADATA -->", metadata),
                            headers={"Cache-Control": "no-store"})
    except HTTPException as error:
        return unavailable(404 if error.status_code == 404 else 503)
    except Exception:
        return unavailable(503)
