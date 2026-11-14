from fastapi import FastAPI

app = FastAPI(
    title="BijliWise API",
    description="Smart Energy. Smart Pakistan.",
    version="1.0.0"
)

@app.get("/")
def home():
    return {
        "message": "Welcome to BijliWise API",
        "status": "running"
    }

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "application": "BijliWise"
    }
