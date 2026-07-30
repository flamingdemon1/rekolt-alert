# Backend workspace

The FastAPI entry point is `backend.app.main:app`.

Implemented language routes:

- `GET /api/v1/health`
- `POST /api/v1/language/transcribe`
- `POST /api/v1/language/translate`
- `POST /api/v1/language/conversation/turn`
- `POST /api/v1/language/speech`

Run locally from the repository root:

```powershell
python -m uvicorn backend.app.main:app --reload
```

Interactive API documentation is available at `http://127.0.0.1:8000/docs`.
The ASR and TTS models load only when their routes are first called.

Kavish is the primary backend owner. Shihad co-owns Gemma prompts, language,
safety, and response-quality work. The image-analysis and structured-report
paths remain under integration and must not be described as complete.
