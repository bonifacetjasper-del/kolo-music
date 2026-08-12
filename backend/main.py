from fastapi import FastAPI

from fastapi.middleware.cors import CORSMiddleware

from routes import auth, admin, songs, payments, stream, artist, listener, marketplace


app = FastAPI(
    title="KOLO MUSIC API",
    description="Liberia's local music streaming platform",
    version="1.0"
)

# ==============================
# ENABLE FRONTEND CONNECTION
# ==============================

app.add_middleware(
    CORSMiddleware,

    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500"
    ],

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"],
)

# ==============================
# CONNECT API ROUTES
# ==============================

app.include_router(auth.router)

app.include_router(admin.router)

app.include_router(songs.router)

app.include_router(payments.router)

app.include_router(stream.router)

app.include_router(artist.router)

app.include_router(listener.router)

app.include_router(marketplace.router)

# ==============================
# HOME TEST ROUTE
# ==============================

@app.get("/")
def home():

    return {
        "message": "KOLO MUSIC backend is running 🎵"
    }