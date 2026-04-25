# Architecture Notes

## Frontend

- `src/App.js` wires the router and global health provider.
- `src/components/SystemStatusBar.jsx` surfaces backend and service readiness.
- `src/pages/StudioPage.jsx` handles the core hearing-to-sign and sign-to-voice workflow.
- `src/pages/AnalyticsPage.jsx` renders communication telemetry.

## Backend

- `backend/server.py` currently hosts routes, fallback logic, MongoDB access, and analytics.
- MongoDB stores:
  - conversations
  - messages
  - phrase mappings
  - detected signs
  - feedback corrections

## Reliability Model

- MongoDB is the primary data store.
- Gemini and ElevenLabs are optional enhancements; the app degrades gracefully when they are unavailable.
- The frontend polls backend health so users can see service quality before they start a session.
