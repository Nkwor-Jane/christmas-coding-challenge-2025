import re

STOP_WORDS = {
    "the", "and", "for", "that", "with", "this", "from", "what", "when", "where",
    "who", "why", "how", "are", "was", "were", "have", "has", "had", "you", "your",
    "about", "into", "page", "please", "explain", "summarise", "summarize",
}


def retrieve_chunks(question: str, chunks: list) -> tuple[list, list[int]]:
    terms = [
        term
        for term in re.findall(r"[a-z0-9']+", question.lower())
        if len(term) > 2 and term not in STOP_WORDS
    ]
    scored = []
    for chunk in chunks:
        text = chunk.chunk_text.lower()
        score = sum(text.count(term) for term in terms)
        scored.append((score, chunk))
    scored.sort(key=lambda item: item[0], reverse=True)
    matched = [chunk for score, chunk in scored if score > 0][:3]
    if not matched and scored:
        matched = [scored[0][1]]
        if not terms:
            return [], []
        if scored[0][0] == 0:
            return [], []
    pages = sorted({chunk.page_number for chunk in matched})
    return matched, pages


def extractive_answer(question: str, chunks: list) -> tuple[str, list[int]]:
    words = set(re.findall(r"[a-z0-9']+", question.lower()))
    if words & {"summarise", "summarize", "summary"} and chunks:
        opening = chunks[:2]
        pages = sorted({chunk.page_number for chunk in opening})
        excerpts = "\n\n".join(f"Page {chunk.page_number}: {chunk.chunk_text.strip()}" for chunk in opening)
        return f"Summary from the document:\n\n{excerpts}", pages
    matched, pages = retrieve_chunks(question, chunks)
    if not matched:
        return "I could not find that in this document.", []
    excerpts = "\n\n".join(f"Page {chunk.page_number}: {chunk.chunk_text.strip()}" for chunk in matched)
    return f"Based on the document:\n\n{excerpts}", pages


def llm_answer(question: str, history: list[dict], context: str, cited_pages: list[int]) -> str | None:
    from app.core.config import get_settings

    settings = get_settings()
    if not settings.openai_api_key:
        return None
    try:
        from openai import OpenAI

        client = OpenAI(api_key=settings.openai_api_key, base_url=settings.openai_base_url)
        messages = [
            {
                "role": "system",
                "content": (
                    "You are a helpful reading assistant. Answer only from the document context. "
                    "If the answer is not in the context, say so. Cite page numbers when you use them.\n\n"
                    f"<pdf_content>\n{context[:50000]}\n</pdf_content>"
                ),
            },
            *history,
            {"role": "user", "content": question},
        ]
        response = client.chat.completions.create(
            model=settings.openai_model,
            messages=messages,
            max_tokens=800,
        )
        return response.choices[0].message.content
    except Exception:
        return None
