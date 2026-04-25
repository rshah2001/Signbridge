# Deployment Guide

## Frontend

The frontend is compatible with Vercel. The project includes [.npmrc](/Users/rs/Downloads/SignBridge/frontend/.npmrc) so dependency installation matches local development.

Required environment variable:

- `REACT_APP_BACKEND_URL`

## Backend

Deploy the FastAPI backend separately on a platform that supports long-running Python services.

Recommended runtime command:

`uvicorn backend.server:app --host 0.0.0.0 --port $PORT`

Required environment variables:

- `MONGO_URL`
- `DB_NAME`
- `GEMINI_API_KEY`
- `ELEVENLABS_API_KEY`
- `CORS_ORIGINS`

## MongoDB

Use a managed MongoDB deployment in production. The API is MongoDB-first and falls back to memory mode only when the database is unavailable or when `SIGNBRIDGE_USE_MEMORY_STORE=true`.

## Health Checks

Use `GET /api/health` for readiness checks. The response includes:

- overall mode (`mongo` or `memory`)
- database status
- AI status
- voice service status
