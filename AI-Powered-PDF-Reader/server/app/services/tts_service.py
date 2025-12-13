from gtts import gTTS
from elevenlabs.client import ElevenLabs
from elevenlabs.play import play
from io import BytesIO
import base64
from typing import Dict
from app.config import settings
from dotenv import load_dotenv
import os

load_dotenv()

class TTSService:
    def __init__(self):
        self.elevenlabs_client = ElevenLabs(
            api_key=settings.ELEVEN_LABS_API_KEY
        )
    
    async def generate_speech(self, text: str, provider: str = "elevenlabs", voice: str = "Rachel", speed: float = 1.0) -> Dict:
        """
        Generate speech from text
        """
        try:
            if provider == "gtts":
                return await self._generate_gtts(text, speed)
            elif provider == "elevenlabs":
                return await self._generate_elevenlabs(text, voice)
            else:
                return {
                    "success": False,
                    "error": "Invalid TTS provider"
                }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
        
    async def _generate_gtts(self, text: str, speed: float) -> Dict:
        """Generate speech using Google TTS"""
        try:
            tts = gTTS(text=text, lang='en', slow=(speed < 1.0))
            
            # Save to BytesIO
            audio_buffer = BytesIO()
            tts.write_to_fp(audio_buffer)
            audio_buffer.seek(0)
            
            # Convert to base64
            audio_base64 = base64.b64encode(audio_buffer.read()).decode('utf-8')
            
            return {
                "success": True,
                "audio_data": audio_base64,
                "format": "mp3",
                "provider": "gtts"
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    
    async def _generate_elevenlabs(self, text: str, voice: str) -> Dict:
        """Generate speech using ElevenLabs (premium quality)"""
        try:
            print(f"Generating speech with ElevenLabs...")
            print(f"Text length: {len(text)} characters")
            print(f"Voice: {voice}")
            
            # Voice ID mapping 
            voice_ids = { 
                "Bill": "pqHfZKP75CvOlQylNhV4",
                "Lily":"pFZP5JQG7iQjIQuC4Bku",
                "Daniel": "onwK4e9ZLuTAKqWW03F9",
                "Brian": "nPczCjzI2devNBz1zQrb",
                "Chris": "iP95p4xoKVk53GoZ742B",
                "Eric": "cjVigY5qzO86Huf0OWal",
                "Jessica":"cgSgspJ2msm6clMCkdW9",
                "Will": "bIHbv24MWmeRgasZH58o",
                "Matilda": "rExE9yKIg1WjnnlVkGX",
                "Alice": "Xb7hH8MSUJpSbSDYk0k2",
                "Liam": "TX3LPaxmHKxFdv7VOQHJ",
                "Harry": "SOYHLrjzK2X1ezoPC6cr",
                "River": "SAz9YHcvj6GT2YYXdXww",
                "Callum": "N2lVS1w4EtoT3dr4eOWO",
                "George": "JBFqnCBsd6RMkjVDRZzb",
                "Charlie": "IKne3meq5aSn9XLyUdCD",
                "Laura": "FGY2WhTYpPnrIDTdsKH5",
                "Sarah": "EXAVITQu4vr4xnSDxMaL",
                "Roger": "CwhRBWXzGAHq8TQ4Fs17",
            }
            
            # Get voice_id 
            voice_id = voice_ids.get(voice, voice)
            
            # Generate audio using ElevenLabs
            audio_generator = self.elevenlabs_client.text_to_speech.convert(
                text=text,
                voice_id=voice_id,
                model_id="eleven_multilingual_v2",
                output_format="mp3_44100_128"
            )
            
            # Collect audio bytes from generator
            audio_bytes = b""
            for chunk in audio_generator:
                audio_bytes += chunk
            
            # Convert to base64
            audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')
            
            print(f"Audio generated successfully ({len(audio_bytes)} bytes)")
            
            return {
                "success": True,
                "audio_data": audio_base64,
                "format": "mp3",
                "provider": "elevenlabs",
                "voice_used": voice
            }
            
        except Exception as e:
            print(f"ElevenLabs Error: {str(e)}")
            import traceback
            print(f"Traceback: {traceback.format_exc()}")
            
            return {
                "success": False,
                "error": str(e)
            }
        
    async def list_voices(self) -> Dict:
        """Get available ElevenLabs voices"""
        try:
            voices_response = self.elevenlabs_client.voices.get_all()
            
            voice_list = [
                {
                    "voice_id": voice.voice_id,
                    "name": voice.name,
                    "category": getattr(voice, 'category', 'general')
                }
                for voice in voices_response.voices
            ]
            
            return {
                "success": True,
                "voices": voice_list
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

tts_service = TTSService()