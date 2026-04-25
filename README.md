# SignBridge AI

SignBridge AI is a two-way accessibility app for conversations between hearing and deaf users. It combines speech recognition, sign-supported phrase workflows, voice playback, MongoDB-backed session history, and analytics that highlight urgent communication needs.

## What It Does

- Hearing user speaks or types and gets sign-friendly output.
- Deaf user signs with camera-assisted detection or taps phrase cards and gets spoken output.
- Emergency phrases like `Help`, `Doctor`, `Pain`, and `Emergency` are elevated in the Studio workflow.
- MongoDB stores conversations, messages, feedback, and detection events.
- Analytics summarize confidence trends, emergency activity, and communication gaps.

## Stack

- Frontend: React 19, CRACO, Tailwind CSS, Recharts
- Backend: FastAPI, Motor, httpx
- Database: MongoDB
- AI/TTS: Gemini API and ElevenLabs with graceful fallback behavior
- CV/STT: MediaPipe Hands and Web Speech API in the browser

## Repo Layout

- [frontend](/Users/rs/Downloads/SignBridge/frontend)
- [backend](/Users/rs/Downloads/SignBridge/backend)
- [docs](/Users/rs/Downloads/SignBridge/docs)
- [memory](/Users/rs/Downloads/SignBridge/memory)

## Local Setup

### Backend

1. Create a Python virtual environment:
   `python3 -m venv .venv`
2. Install backend dependencies:
   `.venv/bin/pip install -r backend/requirements.txt`
3. Copy [backend/.env.example](/Users/rs/Downloads/SignBridge/backend/.env.example) to `backend/.env` and fill in values.
4. Start the API:
   `.venv/bin/python -m uvicorn backend.server:app --reload --port 8000`

### Frontend

1. Install frontend dependencies:
   `cd frontend && npm install`
2. Copy [frontend/.env.example](/Users/rs/Downloads/SignBridge/frontend/.env.example) to `frontend/.env` if needed.
3. Start the app:
   `npm start`

The frontend will use `REACT_APP_BACKEND_URL` when provided. In local development it defaults to `http://127.0.0.1:8000`.

## Production Notes

- MongoDB is the primary backend. If MongoDB is unavailable, the API degrades into an in-memory mode so the demo can still function.
- `GET /api/health` reports backend, database, AI, and voice-service readiness.
- The frontend is currently deployed on Vercel.
- The backend should be deployed separately with real environment variables and a managed MongoDB instance.

## Recommended Environment Variables

Backend:

- `MONGO_URL`
- `DB_NAME`
- `GEMINI_API_KEY` or `GOOGLE_API_KEY`
- `ELEVENLABS_API_KEY`
- `CORS_ORIGINS`

Frontend:

- `REACT_APP_BACKEND_URL`
- `ENABLE_HEALTH_CHECK`

## Testing

Frontend:

- `cd frontend && npm test -- --watchAll=false`

Backend:

- `python -m pytest backend/tests`

## Next Priorities

- Deploy the FastAPI backend against a production MongoDB instance.
- Expand sign and phrase coverage beyond the MVP catalog.
- Improve gesture classification quality beyond heuristics.
- Add authentication and saved user workspaces if the product becomes multi-user.
