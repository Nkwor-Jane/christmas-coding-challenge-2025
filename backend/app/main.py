from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.database import Base, get_engine
from app.models import tables as _tables  # noqa: F401
from app.routers import ai, analytics, audio, auth, documents, planner, progress, sessions, sync
from app.services.storage import storage_status

settings = get_settings()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    Base.metadata.create_all(bind=get_engine())
    yield


app = FastAPI(title="Reading Companion API", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(documents.router)
app.include_router(progress.router)
app.include_router(sessions.router)
app.include_router(ai.router)
app.include_router(planner.router)
app.include_router(analytics.router)
app.include_router(sync.router)
app.include_router(audio.router)


@app.get("/health")
def health():
    return {"status": "healthy", "storage": storage_status()}
