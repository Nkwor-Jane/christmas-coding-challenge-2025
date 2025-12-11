import PyPDF2
from io import BytesIO
from typing import Dict, Optional
import uuid
import json
import os
from pathlib import Path

class PDFService:
    def __init__(self):
        # Create storage directory
        self.storage_dir = Path("pdf_storage")
        self.storage_dir.mkdir(exist_ok=True)
    
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
            
            # Save to file instead of memory
            pdf_data = {
                "filename": filename,
                "full_text": full_text,
                "page_texts": page_texts,
                "num_pages": len(pdf_reader.pages),
                "word_count": len(full_text.split())
            }
            
            # Save to disk
            storage_path = self.storage_dir / f"{pdf_id}.json"
            with open(storage_path, 'w', encoding='utf-8') as f:
                json.dump(pdf_data, f, ensure_ascii=False, indent=2)
            
            print(f"PDF saved to disk: {storage_path}")
            print(f"PDF ID: {pdf_id}")
            
            return {
                "success": True,
                "pdf_id": pdf_id,
                "filename": filename,
                "pages": len(pdf_reader.pages),
                "extracted_text": full_text,
                "word_count": len(full_text.split())
            }
            
        except Exception as e:
            print(f"Error extracting PDF: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def get_pdf_text(self, pdf_id: str) -> Optional[str]:
        """Retrieve PDF text from disk"""
        try:
            storage_path = self.storage_dir / f"{pdf_id}.json"
            
            if not storage_path.exists():
                print(f"Available PDFs: {list(self.storage_dir.glob('*.json'))}")
                return None
            
            with open(storage_path, 'r', encoding='utf-8') as f:
                pdf_data = json.load(f)
            
            print(f"PDF loaded from disk: {pdf_id}")
            return pdf_data["full_text"]
            
        except Exception as e:
            print(f"Error reading PDF: {str(e)}")
            return None
    
    def get_pdf_info(self, pdf_id: str) -> Optional[Dict]:
        """Get PDF metadata from disk"""
        try:
            storage_path = self.storage_dir / f"{pdf_id}.json"
            
            if not storage_path.exists():
                return None
            
            with open(storage_path, 'r', encoding='utf-8') as f:
                return json.load(f)
                
        except Exception as e:
            print(f"Error reading PDF info: {str(e)}")
            return None
    
    def list_cached_pdfs(self) -> list:
        """List all cached PDF IDs"""
        return [f.stem for f in self.storage_dir.glob('*.json')]

pdf_service = PDFService()