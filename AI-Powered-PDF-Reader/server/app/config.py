from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    # API Keys
    OPENAI_API_KEY: str = ""
    ELEVEN_LABS_API_KEY: str = ""
    
    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = True
    
    # CORS
    allowed_origins: List[str] = ["http://localhost:5173"]
    
    # File Upload
    max_file_size: int = 10485760  # 10MB
    allowed_extensions: List[str] = [".pdf"]
    
    class Config:
        env_file = ".env"

settings = Settings()