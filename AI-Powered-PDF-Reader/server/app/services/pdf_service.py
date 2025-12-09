import PyPDF2
from io import BytesIO
from typing import Dict, Optional
import uuid

class PDFService:
    def __init__(self):
        self.pdf_cache: Dict[str, Dict] = {}
    
    async def extract_text_from_pdf(self, file_content: bytes, filename: str) -> Dict:
        """Extract text from PDF file"""
        try:
            pdf_file = BytesIO(file_content)
            pdf_reader = PyPDF2.PdfReader(pdf_file)
            
            # Extract text from all pages
            full_text = ""
            page_texts = []
            
            for page_num, page in enumerate(pdf_reader.pages):
                page_text = page.extract_text()
                page_texts.append({
                    "page_number": page_num + 1,
                    "text": page_text
                })
                full_text += f"\n\n--- Page {page_num + 1} ---\n\n{page_text}"
            
            # Generate unique ID for this PDF
            pdf_id = str(uuid.uuid4())
            
            # Cache the extracted text
            self.pdf_cache[pdf_id] = {
                "filename": filename,
                "full_text": full_text,
                "page_texts": page_texts,
                "num_pages": len(pdf_reader.pages),
                "word_count": len(full_text.split())
            }
            
            return {
                "success": True,
                "pdf_id": pdf_id,
                "filename": filename,
                "pages": len(pdf_reader.pages),
                "extracted_text": full_text,
                "word_count": len(full_text.split())
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def get_pdf_text(self, pdf_id: str) -> Optional[str]:
        """Retrieve cached PDF text"""
        pdf_data = self.pdf_cache.get(pdf_id)
        return pdf_data["full_text"] if pdf_data else None
    
    def get_pdf_info(self, pdf_id: str) -> Optional[Dict]:
        """Get PDF metadata"""
        return self.pdf_cache.get(pdf_id)

pdf_service = PDFService()