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
    settings,
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

app.include_router(auth.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(songs.router, prefix="/api")
app.include_router(payments.router, prefix="/api")
app.include_router(stream.router, prefix="/api")
app.include_router(artist.router, prefix="/api")
app.include_router(listener.router, prefix="/api")
app.include_router(marketplace.router, prefix="/api")
app.include_router(settings.router, prefix="/api")

# =========================================================
# TEMPORARY SUPABASE DEBUG ROUTE
# =========================================================

app.include_router(debug.router, prefix="/api")

# =========================================================
# API TEST
# =========================================================

@app.get("/api")
@app.get("/api/")
def home():
    return {
        "message": "KOLO MUSIC backend is running"
    }
