# =========================================================
# KOLO MUSIC API
# FastAPI Backend
# =========================================================

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
)


# =========================================================
# CREATE FASTAPI APPLICATION
# =========================================================

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
        # Local development
        "http://127.0.0.1:5500",
        "http://localhost:5500",

        # Live KOLO MUSIC frontend
        "https://kolo-music-l71hm4slf-kolo-music.vercel.app",
    ],

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"],
)


# =========================================================
# CONNECT API ROUTES
# =========================================================

app.include_router(auth.router)

app.include_router(admin.router)

app.include_router(songs.router)

app.include_router(payments.router)

app.include_router(stream.router)

app.include_router(artist.router)

app.include_router(listener.router)

app.include_router(marketplace.router)


# =========================================================
# API HOME / HEALTH CHECK
# =========================================================

@app.get("/api")
@app.get("/api/")
def home():

    return {
        "success": True,
        "message": "KOLO MUSIC backend is running 🎵",
    }