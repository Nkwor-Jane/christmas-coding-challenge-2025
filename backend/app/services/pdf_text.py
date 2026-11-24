from io import BytesIO

from PyPDF2 import PdfReader


def extract_pages(file_bytes: bytes) -> list[dict]:
    reader = PdfReader(BytesIO(file_bytes))
    pages = []
    for index, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        text = text.replace("\x00", "").strip()
        method = "text" if text else "none"
        pages.append(
            {
                "page_number": index,
                "extracted_text": text,
                "extraction_method": method,
                "is_processed": True,
            }
        )
    return pages


def narration_segments(pages: list[dict], start_page: int = 1, max_chars: int = 280) -> list[dict]:
    """Split page text into ordered speakable segments without cutting words when possible."""
    segments = []
    for page in pages:
        if page["page_number"] < start_page:
            continue
        text = (page.get("extracted_text") or "").strip()
        if not text:
            continue
        cursor = 0
        while cursor < len(text):
            end = min(len(text), cursor + max_chars)
            if end < len(text):
                split_at = text.rfind(" ", cursor, end)
                if split_at > cursor + 40:
                    end = split_at
            piece = text[cursor:end].strip()
            if piece:
                segments.append(
                    {
                        "page_number": page["page_number"],
                        "text": piece,
                        "char_start": cursor,
                    }
                )
            cursor = end
            while cursor < len(text) and text[cursor] == " ":
                cursor += 1
    return segments


def chunk_pages(pages: list[dict], size: int = 700) -> list[dict]:
    chunks = []
    index = 0
    for page in pages:
        text = page.get("extracted_text") or ""
        if not text:
            continue
        start = 0
        while start < len(text):
            end = min(len(text), start + size)
            if end < len(text):
                split_at = text.rfind(" ", start, end)
                if split_at > start + 80:
                    end = split_at
            piece = text[start:end].strip()
            if piece:
                chunks.append(
                    {
                        "page_number": page["page_number"],
                        "chunk_text": piece,
                        "chunk_index": index,
                        "char_start": start,
                    }
                )
                index += 1
            start = end
            while start < len(text) and text[start] == " ":
                start += 1
    return chunks


def document_stats(pages: list[dict]) -> dict:
    full = "\n".join(page.get("extracted_text") or "" for page in pages)
    words = full.split()
    return {
        "total_pages": len(pages),
        "total_chars": len(full),
        "total_words": len(words),
        "full_text": full,
    }
