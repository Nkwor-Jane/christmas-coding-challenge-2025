from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routes import pdf, chat, tts

app = FastAPI(
    title="AI-Powered PDF Reader API",
    description="Backend for AI-powered PDF reading with TTS and chat",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(pdf.router)
app.include_router(chat.router)
# app.include_router(tts.router)

@app.get("/")
async def root():
    return {
        "message": "AI-Powered PDF Reader API",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=settings.host, port=settings.port)