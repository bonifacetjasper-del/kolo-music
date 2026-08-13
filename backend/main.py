from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.routes import (
    auth,
    admin,
    songs,
    payments,
    stream,
    artist,
    listener,
    marketplace,
    debug,
)

app = FastAPI(
    title="KOLO MUSIC API",
    description="Liberia's local music streaming platform",
    version="1.0",
)

# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "https://kolo-music.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================================================
# API ROUTES
# =========================================================
#
# Each router already has its own prefix:
#
# auth       -> /auth
# admin      -> /admin
# songs      -> /songs
# payments   -> /payments
# stream     -> /stream
# artist     -> /artist
# listener   -> /listener
# marketplace-> /marketplace
# debug      -> /debug
#
# Vercel adds /api through vercel.json.
#
# Therefore:
#
# /auth/login       -> local
# /api/auth/login   -> Vercel
#
# =========================================================

app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(songs.router)
app.include_router(payments.router)
app.include_router(stream.router)
app.include_router(artist.router)
app.include_router(listener.router)
app.include_router(marketplace.router)

# Temporary Supabase connectivity diagnostic
app.include_router(debug.router)

# =========================================================
# API TEST
# =========================================================

@app.get("/api")
@app.get("/api/")
def home():
    return {
        "message": "KOLO MUSIC backend is running"
    }