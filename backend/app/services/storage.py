from pathlib import Path

from app.core.config import get_settings


class LocalStorage:
    """Device-independent file store. Supabase Storage can replace this when configured."""

    def __init__(self, root: str | None = None):
        self.root = Path(root or get_settings().storage_dir)

    def save_pdf(self, user_id: str, document_id: str, data: bytes) -> str:
        folder = self.root / user_id
        folder.mkdir(parents=True, exist_ok=True)
        path = folder / f"{document_id}.pdf"
        path.write_bytes(data)
        return str(path)

    def read_pdf(self, path: str) -> bytes:
        return Path(path).read_bytes()

    def delete_pdf(self, path: str | None) -> None:
        if not path:
            return
        file_path = Path(path)
        if file_path.exists():
            file_path.unlink()


def storage_status() -> dict:
    settings = get_settings()
    supabase_ready = bool(settings.supabase_url and settings.supabase_service_role_key)
    return {
        "driver": "supabase" if supabase_ready else "local",
        "supabase_configured": supabase_ready,
    }
