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
    
    # Check available PDFs
    available_pdfs = pdf_service.list_cached_pdfs()
    
    # Get PDF context
    pdf_text = pdf_service.get_pdf_text(request.pdf_id)
    
    if not pdf_text:
        # print(f"PDF not found: {request.pdf_id}")
        raise HTTPException(
            status_code=404, 
            detail=f"PDF not found. Available PDFs: {available_pdfs}"
        )
    
    print(f"PDF loaded successfully ({len(pdf_text)} characters)")
    
    # Convert Pydantic models to dicts
    conversation_history = []
    if request.conversation_history:
        conversation_history = [
            {
                "role": msg.role,
                "content": msg.content
            }
            for msg in request.conversation_history
        ]
    
    print(f"Conversation history: {len(conversation_history)} messages")
    
    # Chat with AI
    result = await ai_service.chat_with_context(
        user_message=request.message,
        pdf_context=pdf_text,
        conversation_history=conversation_history,
    )
    
    if not result["success"]:
        # print(f"Error: {result.get('error')}")
        raise HTTPException(status_code=500, detail=result.get("error", "AI service error"))
    
    return ChatResponse(
        success=True,
        response=result["response"],
        pdf_context_used=True
    )