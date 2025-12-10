from fastapi import APIRouter, HTTPException
from app.services.ai_service import ai_service
from app.services.pdf_service import pdf_service
from app.models.schemas import ChatRequest, ChatResponse

router = APIRouter(prefix="/api/chat", tags=["Chat"])

@router.post("/", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Chat with AI about the PDF content
    """
    # Get PDF context
    pdf_text = pdf_service.get_pdf_text(request.pdf_id)
    
    if not pdf_text:
        raise HTTPException(status_code=404, detail="PDF not found")
    
    # Chat with AI
    result = await ai_service.chat_with_context(
        user_message=request.message,
        pdf_context=pdf_text,
        conversation_history=request.conversation_history,
        provider="openai"
    )
    
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result.get("error", "AI service error"))
    
    return ChatResponse(
        success=True,
        response=result["response"],
        pdf_context_used=True
    )