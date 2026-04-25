# SignBridge AI — Product Requirements Document

## Original Problem Statement
Real-time two-way communication platform between hearing and deaf users using voice, text, and sign language. App Name: **SignBridge AI**.

- Hearing speaks → speech→text → Gemini simplifies → animated sign-language cards
- Deaf signs → MediaPipe webcam (or manual phrase tap) → text → ElevenLabs voice

Hackathon-grade. Must demo in 3–5 mins. Wins judged on Tech-for-Good, Best Use of Gemini, ElevenLabs, Snowflake, MongoDB.

## User Personas
- **Hearing user**: nurse / teacher / family member needing to be understood by a deaf person.
- **Deaf user**: patient / student / loved one who signs and needs voice replies.
- **Hackathon judges / NGOs / accessibility teams**: viewing the analytics dashboard to spot communication gaps.

## Tech Stack
- **Frontend**: React 19 + Tailwind + shadcn/ui + Recharts + lucide-react + Manrope/Work Sans
- **Backend**: FastAPI + Gemini API integration + httpx (ElevenLabs proxy)
- **DB**: MongoDB (motor)
- **CV**: MediaPipe Hands via CDN (browser)
- **STT**: Web Speech API (browser)
- **TTS**: ElevenLabs `eleven_multilingual_v2`, fallback to browser SpeechSynthesis
- **Analytics**: Snowflake-style — MongoDB aggregations branded as warehouse layer

## Architecture
```
React (Studio)
  ├─ mic → Web Speech API → /api/translate/voice-to-sign  → Gemini → sign tokens
  ├─ webcam → MediaPipe Hands → classify → /api/signs/detect
  └─ sign tokens → /api/translate/sign-to-voice → /api/tts/speak → ElevenLabs

FastAPI
  ├─ MongoDB: conversations · messages · detected_signs · phrase_mappings · feedback_corrections · accessibility_preferences
  └─ /api/analytics/snowflake (top phrases · confidence · emergency trends · gaps)
```

## What's Implemented (2026-04-25)
- Backend (`/app/backend/server.py`):
  - `GET /api/`, `GET /api/phrases` (14 seeded phrases)
  - `POST /api/conversations`, `GET /api/conversations`, `GET /api/conversations/{id}`
  - `POST /api/conversations/{id}/messages`
  - `POST /api/translate/voice-to-sign` (Gemini)
  - `POST /api/translate/sign-to-voice` (Gemini)
  - `POST /api/tts/speak` (ElevenLabs)
  - `POST /api/signs/detect`, `POST /api/feedback`
  - `GET /api/analytics/snowflake` — KPIs, top phrases, confidence series, emergency trend, misinterpreted, accessibility gaps, sample SQL
- Frontend pages:
  - `/` Landing — asymmetric bento, hero, pipeline, why-it-matters, CTA strip
  - `/studio` 3-pane Hearing | Sign Output | Deaf w/ MediaPipe webcam, manual phrase grid, transcript
  - `/analytics` Snowflake-style dashboard with Recharts (bar/pie/area/line) + accessibility gaps + SQL preview
  - `/about` Architecture, pitch, tech list

## Test Status
- Backend: 15/15 passed (iteration_1.json). Gemini and TTS proxy verified.
- ElevenLabs free tier blocked from datacenter IP (401 unusual_activity) — frontend uses browser SpeechSynthesis fallback.

## Backlog
- **P1**: Word-boundary regex in `_match_signs` to reduce false positives.
- **P1**: Move FastAPI lifecycle to `lifespan` (deprecation warning).
- **P2**: Train a small TF.js gesture classifier vs. heuristic.
- **P2**: ASL avatar (Three.js) replacing card grid for v2.
- **P2**: Real Snowflake connector w/ user-provided creds.
- **P2**: Save/replay conversations, share links.
- **P3**: Per-user accessibility preferences stored in `accessibility_preferences`.

## Next Tasks
1. Verify ElevenLabs voice in production (paid plan or non-cloud IP).
2. Add session export (JSON/PDF transcript).
3. Add user authentication if multi-tenant needed.
