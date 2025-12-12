from fastapi import APIRouter, HTTPException
from app.services.tts_service import tts_service
from app.models.schemas import TTSRequest
from pydantic import BaseModel

router = APIRouter(prefix="/api/tts", tags=["TTS"])

class TTSRequest(BaseModel):
    text: str
    voice: str = "Rachel"
    speed: float = 1.0
    provider: str = "elevenlabs"

@router.post("/generate")
async def generate_speech(request: TTSRequest):
    """
    Generate speech from text
    """
    print(f"TTS Request received")
    print(f"Provider: {request.provider}")
    print(f"Voice: {request.voice}")
    print(f"Text: {request.text[:100]}...")
    
    result = await tts_service.generate_speech(
        text=request.text,
        provider=request.provider,
        voice=request.voice,
        speed=request.speed
    )
    
    if not result["success"]:
        raise HTTPException(
            status_code=500, 
            detail=result.get("error", "TTS generation failed")
        )
    
    return result

@router.get("/voices")
async def get_voices():
    """
    Get available ElevenLabs voices
    """
    result = await tts_service.list_voices()
    
    if not result["success"]:
        raise HTTPException(
            status_code=500,
            detail=result.get("error", "Failed to fetch voices")
        )
    
    return result