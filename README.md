# Reading Companion

A personal PDF reading assistant evolved from the Christmas Coding Challenge PDF reader. The original web prototype remains in `AI-Powered-PDF-Reader`. New work lives in two places:

- `backend` — FastAPI, SQLAlchemy, and Alembic. Accounts, a document library, separate reading and listening progress, session timing, sync, and the document chatbot.
- `mobile` — React Native and Expo. Library, reader, continuous narration, and progress.

## Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

SQLite is the default database so the API can boot without extra services. Set `DATABASE_URL` to PostgreSQL when you want that engine. `OPENAI_API_KEY` is optional: when it is set, chat uses the existing Nebius-compatible client; otherwise answers are taken from the document text and cite a page.

```bash
pytest
alembic upgrade head
```

## Mobile

```bash
cd mobile
npm install
EXPO_PUBLIC_API_URL=http://127.0.0.1:8000 npm run web
```

Android and iOS use the same project (`npm run android` / `npm run ios`) and need an Expo development build before background audio and a native PDF view are available. The web build uses the device speech engine and is enough to exercise the library, reader, narration queue, and progress sync.

Supabase Auth and Storage are the intended cloud file layer. Until those keys are set, PDFs are stored on the API machine and sign-in is handled by the API.
