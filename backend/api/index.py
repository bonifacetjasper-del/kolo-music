from fastapi import FastAPI

app = FastAPI()



@app.get("/api")
def api_home():
    return {
        "message": "KOLO MUSIC API is working 🎵"
    }