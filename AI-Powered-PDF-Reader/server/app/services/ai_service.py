from openai import OpenAI
from typing import List, Dict
from app.config import settings


class AIService:
    def __init__(self, model: str = "openai/gpt-oss-120b"):
        if not settings.OPENAI_API_KEY:
            raise ValueError("OpenAI API key is required")
# openai/gpt-oss-120b
        self.client = OpenAI(
            api_key=settings.OPENAI_API_KEY,
            base_url="https://api.tokenfactory.nebius.com/v1/"
        )
        self.model = model

    async def chat_with_context(
        self,
        user_message: str,
        pdf_context: str,
        conversation_history: List[Dict] = None
    ) -> Dict:
        """
        Chat with OpenAI using PDF context
        """
        try:
            # Full system prompt including PDF content
            system_prompt = f"""
You are a helpful AI assistant analyzing a PDF document.

Here is the content of the PDF:

<pdf_content>
{pdf_context[:50000]}
</pdf_content>

Answer questions about this PDF accurately and concisely.
If the answer is not found in the PDF, clearly say so.
Cite specific sections or sentences when relevant.
"""

            formatted_history = []

            if conversation_history:
                for msg in conversation_history:
                    formatted_history.append({
                        "role": msg["role"],
                        "content": msg["content"]
                    })

            # Add latest user message
            formatted_history.append({
                "role": "user",
                "content": user_message
            })

            response = self.client.chat.completions.create(
                model="openai/gpt-oss-120b",
                messages=[
                    {"role": "system", "content": system_prompt},
                    *formatted_history
                ],
                max_tokens=2000
            )


            answer = response.choices[0].message.content

            return {
                "success": True,
                "response": answer
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }


ai_service = AIService()
