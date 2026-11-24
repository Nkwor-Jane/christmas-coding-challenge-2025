import json

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.tables import AIConversation, AIMessage, DocumentChunk, User
from app.services.ai_service import extractive_answer, llm_answer
from app.services.library import cited_pages_json, owned_document

router = APIRouter(prefix="/ai", tags=["ai"])


class ChatRequest(BaseModel):
    document_id: str
    message: str = Field(min_length=1, max_length=4000)
    conversation_id: str | None = None


class SummarizeRequest(BaseModel):
    document_id: str


def _history(db: Session, conversation_id: str) -> list[dict]:
    rows = (
        db.query(AIMessage)
        .filter(AIMessage.conversation_id == conversation_id)
        .order_by(AIMessage.created_at)
        .all()
    )
    return [{"role": row.role, "content": row.content} for row in rows if row.role in {"user", "assistant"}]


@router.post("/chat")
def chat(body: ChatRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    document = owned_document(db, user.id, body.document_id)
    chunks = (
        db.query(DocumentChunk)
        .filter(DocumentChunk.document_id == document.id)
        .order_by(DocumentChunk.chunk_index)
        .all()
    )
    if body.conversation_id:
        conversation = db.get(AIConversation, body.conversation_id)
        if conversation is None or conversation.user_id != user.id or conversation.document_id != document.id:
            raise HTTPException(status_code=404, detail="Conversation not found")
    else:
        conversation = AIConversation(
            user_id=user.id,
            document_id=document.id,
            title=body.message[:80],
        )
        db.add(conversation)
        db.commit()
        db.refresh(conversation)

    fallback, pages = extractive_answer(body.message, chunks)
    context = "\n\n".join(f"Page {chunk.page_number}: {chunk.chunk_text}" for chunk in chunks[:40])
    generated = llm_answer(body.message, _history(db, conversation.id)[-8:], context, pages)
    answer = generated or fallback
    source = "llm" if generated else "document"
    db.add(AIMessage(conversation_id=conversation.id, role="user", content=body.message, cited_pages="[]"))
    db.add(
        AIMessage(
            conversation_id=conversation.id,
            role="assistant",
            content=answer,
            cited_pages=cited_pages_json(pages),
        )
    )
    db.commit()
    return {
        "conversation_id": conversation.id,
        "response": answer,
        "cited_pages": pages,
        "source": source,
    }


@router.post("/summarize")
def summarize(body: SummarizeRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return chat(
        ChatRequest(document_id=body.document_id, message="Summarise this document."),
        user,
        db,
    )


@router.get("/conversations/{document_id}")
def list_conversations(document_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    owned_document(db, user.id, document_id)
    rows = (
        db.query(AIConversation)
        .filter(AIConversation.user_id == user.id, AIConversation.document_id == document_id)
        .order_by(AIConversation.created_at.desc())
        .all()
    )
    payload = []
    for conversation in rows:
        messages = (
            db.query(AIMessage)
            .filter(AIMessage.conversation_id == conversation.id)
            .order_by(AIMessage.created_at)
            .all()
        )
        payload.append(
            {
                "id": conversation.id,
                "title": conversation.title,
                "created_at": conversation.created_at,
                "messages": [
                    {
                        "role": message.role,
                        "content": message.content,
                        "cited_pages": json.loads(message.cited_pages or "[]"),
                        "created_at": message.created_at,
                    }
                    for message in messages
                ],
            }
        )
    return payload
