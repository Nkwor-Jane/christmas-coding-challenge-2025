from pydantic import BaseModel, Field
from typing import Optional, List, Union

class PDFUploadResponse(BaseModel):
    success: bool
    message: str
    pdf_id: str
    filename: str
    size: int
    pages: int
    extracted_text_length: int

class TextExtractionResponse(BaseModel):
    success: bool
    text: str
    pages: int
    word_count: int

class ChatMessage(BaseModel):
    role: str = Field(..., description="Role: 'user' or 'assistant'")
    content: str

class ChatRequest(BaseModel):
    pdf_id: str
    message: str
    conversation_history: Optional[List[Union[ChatMessage, dict]]] = []

    class Config:
        from_attributes = True

class ChatResponse(BaseModel):
    success: bool
    response: str
    pdf_context_used: bool

class TTSRequest(BaseModel):
    text: str
    voice: Optional[str] = "alloy"
    speed: Optional[float] = 1.0

class TTSResponse(BaseModel):
    success: bool
    audio_url: str
    duration: Optional[float] = None