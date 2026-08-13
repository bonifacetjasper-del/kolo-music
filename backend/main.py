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
    marketplace
)

app = FastAPI(
    title="KOLO MUSIC API",
    description="Liberia's local music streaming platform",
    version="1.0"
)

# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "https://kolo-music.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================================================
# API ROUTES
# =========================================================

API_PREFIX = "/api"

app.include_router(auth.router, prefix=API_PREFIX)
app.include_router(admin.router, prefix=API_PREFIX)
app.include_router(songs.router, prefix=API_PREFIX)
app.include_router(payments.router, prefix=API_PREFIX)
app.include_router(stream.router, prefix=API_PREFIX)
app.include_router(artist.router, prefix=API_PREFIX)
app.include_router(listener.router, prefix=API_PREFIX)
app.include_router(marketplace.router, prefix=API_PREFIX)

# =========================================================
# API TEST ROUTE
# =========================================================

@app.get("/api")
@app.get("/api/")
def home():
    return {
        "message": "KOLO MUSIC backend is running 🎵"
    }