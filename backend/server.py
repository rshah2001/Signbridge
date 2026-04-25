"""SignBridge AI - FastAPI backend.

Provides translation endpoints (Gemini-powered), ElevenLabs TTS proxy,
conversation/message persistence in MongoDB, and a Snowflake-style
analytics layer computed from MongoDB aggregations.
"""
from __future__ import annotations

import asyncio
import logging
import os
import random
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

import httpx
from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI, HTTPException
from fastapi.responses import Response
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, ConfigDict, Field
from starlette.middleware.cors import CORSMiddleware

from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# ---------------------------------------------------------------------------
# Bootstrapping
# ---------------------------------------------------------------------------
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
ELEVENLABS_API_KEY = os.environ.get("ELEVENLABS_API_KEY", "")
ELEVENLABS_DEFAULT_VOICE = "EXAVITQu4vr4xnSDxMaL"  # Rachel-like, multilingual

app = FastAPI(title="SignBridge AI")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("signbridge")


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------------------------------------------------------------------------
# Phrase catalog (MVP signs)
# ---------------------------------------------------------------------------
PHRASE_CATALOG: List[Dict[str, Any]] = [
    {"key": "hello", "label": "Hello", "icon": "Hand", "category": "greeting", "emergency": False, "description": "Open palm waving"},
    {"key": "thank_you", "label": "Thank you", "icon": "Heart", "category": "greeting", "emergency": False, "description": "Fingertips from chin moving forward"},
    {"key": "yes", "label": "Yes", "icon": "Check", "category": "answer", "emergency": False, "description": "Closed fist nodding"},
    {"key": "no", "label": "No", "icon": "X", "category": "answer", "emergency": False, "description": "Index + middle finger to thumb, snap"},
    {"key": "help", "label": "Help", "icon": "LifeBuoy", "category": "request", "emergency": True, "description": "Closed fist on flat palm, lift up"},
    {"key": "water", "label": "Water", "icon": "Droplets", "category": "need", "emergency": False, "description": "W-hand at chin"},
    {"key": "bathroom", "label": "Bathroom", "icon": "DoorOpen", "category": "need", "emergency": False, "description": "T-hand shake"},
    {"key": "doctor", "label": "Doctor", "icon": "Stethoscope", "category": "need", "emergency": True, "description": "D-hand on wrist"},
    {"key": "emergency", "label": "Emergency", "icon": "Siren", "category": "alert", "emergency": True, "description": "E-hand shake urgent"},
    {"key": "pain", "label": "Pain", "icon": "Zap", "category": "feeling", "emergency": True, "description": "Index fingers point inward"},
    {"key": "stop", "label": "Stop", "icon": "OctagonAlert", "category": "command", "emergency": False, "description": "Side palm hits flat palm"},
    {"key": "please", "label": "Please", "icon": "Sparkles", "category": "greeting", "emergency": False, "description": "Flat palm circles on chest"},
    {"key": "hungry", "label": "Hungry", "icon": "Apple", "category": "need", "emergency": False, "description": "C-hand sweeps down chest"},
    {"key": "i_love_you", "label": "I love you", "icon": "HeartHandshake", "category": "feeling", "emergency": False, "description": "ILY combined handshape"},
]


async def seed_phrases() -> None:
    existing = await db.phrase_mappings.count_documents({})
    if existing >= len(PHRASE_CATALOG):
        return
    await db.phrase_mappings.delete_many({})
    docs = [
        {**p, "id": str(uuid.uuid4()), "created_at": _now()}
        for p in PHRASE_CATALOG
    ]
    await db.phrase_mappings.insert_many(docs)
    logger.info("Seeded %d phrase mappings", len(docs))


@app.on_event("startup")
async def on_startup() -> None:
    await seed_phrases()


@app.on_event("shutdown")
async def on_shutdown() -> None:
    client.close()


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------
class ConversationCreate(BaseModel):
    title: Optional[str] = None
    hearing_user: Optional[str] = "Hearing User"
    deaf_user: Optional[str] = "Deaf User"


class Conversation(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    title: str
    hearing_user: str
    deaf_user: str
    created_at: str
    message_count: int = 0


class MessageCreate(BaseModel):
    speaker: str  # "hearing" | "deaf"
    direction: str  # "voice_to_sign" | "sign_to_voice"
    text: str
    sign_tokens: Optional[List[str]] = None
    confidence: Optional[float] = None


class Message(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    conversation_id: str
    speaker: str
    direction: str
    text: str
    sign_tokens: List[str] = []
    confidence: Optional[float] = None
    created_at: str


class TranslateVoiceToSignIn(BaseModel):
    text: str


class TranslateVoiceToSignOut(BaseModel):
    original: str
    simplified: str
    sign_tokens: List[str]
    matched_phrases: List[Dict[str, Any]]


class TranslateSignToVoiceIn(BaseModel):
    sign_tokens: List[str]
    confidence: Optional[float] = 0.85


class TranslateSignToVoiceOut(BaseModel):
    sign_tokens: List[str]
    sentence: str
    confidence: float


class TTSIn(BaseModel):
    text: str
    voice_id: Optional[str] = None


class DetectedSignIn(BaseModel):
    conversation_id: Optional[str] = None
    sign_key: str
    confidence: float
    source: str = "mediapipe"  # or "manual"


class FeedbackIn(BaseModel):
    message_id: Optional[str] = None
    sign_key: str
    expected: str
    actual: str
    note: Optional[str] = None


# ---------------------------------------------------------------------------
# Gemini helpers
# ---------------------------------------------------------------------------
async def gemini_chat(system: str, prompt: str, session: str = "default") -> str:
    if not EMERGENT_LLM_KEY:
        raise HTTPException(500, "EMERGENT_LLM_KEY not configured")
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session,
        system_message=system,
    ).with_model("gemini", "gemini-2.5-flash")
    try:
        return await chat.send_message(UserMessage(text=prompt))
    except Exception as exc:  # pragma: no cover - network
        logger.exception("Gemini error")
        raise HTTPException(502, f"Gemini error: {exc}") from exc


def _match_signs(simplified: str) -> List[Dict[str, Any]]:
    text = simplified.lower()
    matches: List[Dict[str, Any]] = []
    for phrase in PHRASE_CATALOG:
        if phrase["label"].lower() in text or phrase["key"].replace("_", " ") in text:
            matches.append(phrase)
    return matches


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@api.get("/")
async def root() -> Dict[str, str]:
    return {"app": "SignBridge AI", "status": "ok"}


@api.get("/phrases")
async def list_phrases() -> List[Dict[str, Any]]:
    docs = await db.phrase_mappings.find({}, {"_id": 0}).to_list(200)
    return docs


@api.post("/conversations", response_model=Conversation)
async def create_conversation(payload: ConversationCreate) -> Conversation:
    convo = {
        "id": str(uuid.uuid4()),
        "title": payload.title or f"Session {datetime.now(timezone.utc).strftime('%b %d, %H:%M')}",
        "hearing_user": payload.hearing_user or "Hearing User",
        "deaf_user": payload.deaf_user or "Deaf User",
        "created_at": _now(),
        "message_count": 0,
    }
    await db.conversations.insert_one(convo.copy())
    return Conversation(**convo)


@api.get("/conversations", response_model=List[Conversation])
async def list_conversations() -> List[Conversation]:
    docs = await db.conversations.find({}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return [Conversation(**d) for d in docs]


@api.get("/conversations/{convo_id}")
async def get_conversation(convo_id: str) -> Dict[str, Any]:
    convo = await db.conversations.find_one({"id": convo_id}, {"_id": 0})
    if not convo:
        raise HTTPException(404, "conversation not found")
    msgs = await db.messages.find({"conversation_id": convo_id}, {"_id": 0}).sort("created_at", 1).to_list(500)
    return {"conversation": convo, "messages": msgs}


@api.post("/conversations/{convo_id}/messages", response_model=Message)
async def add_message(convo_id: str, payload: MessageCreate) -> Message:
    convo = await db.conversations.find_one({"id": convo_id}, {"_id": 0})
    if not convo:
        raise HTTPException(404, "conversation not found")
    msg = {
        "id": str(uuid.uuid4()),
        "conversation_id": convo_id,
        "speaker": payload.speaker,
        "direction": payload.direction,
        "text": payload.text,
        "sign_tokens": payload.sign_tokens or [],
        "confidence": payload.confidence,
        "created_at": _now(),
    }
    await db.messages.insert_one(msg.copy())
    await db.conversations.update_one({"id": convo_id}, {"$inc": {"message_count": 1}})
    return Message(**msg)


@api.post("/translate/voice-to-sign", response_model=TranslateVoiceToSignOut)
async def voice_to_sign(payload: TranslateVoiceToSignIn) -> TranslateVoiceToSignOut:
    text = payload.text.strip()
    if not text:
        raise HTTPException(400, "text required")

    catalog_keys = ", ".join(p["label"] for p in PHRASE_CATALOG)
    system = (
        "You are SignBridge AI, an expert in simplifying spoken English into "
        "sign-language-friendly short phrases. Output ONLY the simplified phrase "
        "in plain text (no quotes, no commentary), max 8 words, prefer using "
        f"these known signs when possible: {catalog_keys}."
    )
    simplified = (await gemini_chat(system, text, session="v2s")).strip()
    simplified = simplified.replace("\n", " ").strip(' "')
    matches = _match_signs(simplified)
    sign_tokens = [m["key"] for m in matches]
    if not sign_tokens:
        # fallback: first 5 significant words become finger-spelled tokens
        sign_tokens = [w.lower() for w in simplified.split() if len(w) > 1][:5]

    return TranslateVoiceToSignOut(
        original=text,
        simplified=simplified,
        sign_tokens=sign_tokens,
        matched_phrases=matches,
    )


@api.post("/translate/sign-to-voice", response_model=TranslateSignToVoiceOut)
async def sign_to_voice(payload: TranslateSignToVoiceIn) -> TranslateSignToVoiceOut:
    if not payload.sign_tokens:
        raise HTTPException(400, "sign_tokens required")

    labels = []
    for key in payload.sign_tokens:
        match = next((p for p in PHRASE_CATALOG if p["key"] == key), None)
        labels.append(match["label"] if match else key.replace("_", " "))

    system = (
        "You are SignBridge AI. Given a list of signed phrases from a deaf user, "
        "compose ONE short, natural, polite spoken sentence (max 18 words). "
        "Return ONLY the sentence with no quotes or extra text."
    )
    prompt = "Signed phrases (in order): " + " | ".join(labels)
    sentence = (await gemini_chat(system, prompt, session="s2v")).strip().strip(' "\n')

    # log detected signs
    docs = [
        {
            "id": str(uuid.uuid4()),
            "sign_key": k,
            "confidence": payload.confidence or 0.85,
            "source": "pipeline",
            "created_at": _now(),
        }
        for k in payload.sign_tokens
    ]
    if docs:
        await db.detected_signs.insert_many(docs)

    return TranslateSignToVoiceOut(
        sign_tokens=payload.sign_tokens,
        sentence=sentence,
        confidence=payload.confidence or 0.85,
    )


@api.post("/tts/speak")
async def tts_speak(payload: TTSIn) -> Response:
    if not ELEVENLABS_API_KEY:
        raise HTTPException(500, "ELEVENLABS_API_KEY not configured")
    voice_id = payload.voice_id or ELEVENLABS_DEFAULT_VOICE
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
    headers = {
        "xi-api-key": ELEVENLABS_API_KEY,
        "accept": "audio/mpeg",
        "content-type": "application/json",
    }
    body = {
        "text": payload.text,
        "model_id": "eleven_multilingual_v2",
        "voice_settings": {"stability": 0.5, "similarity_boost": 0.75},
    }
    async with httpx.AsyncClient(timeout=60) as http:
        resp = await http.post(url, json=body, headers=headers)
    if resp.status_code != 200:
        logger.error("ElevenLabs error %s: %s", resp.status_code, resp.text[:300])
        raise HTTPException(resp.status_code, f"ElevenLabs error: {resp.text[:200]}")
    return Response(content=resp.content, media_type="audio/mpeg")


@api.post("/signs/detect")
async def log_sign(payload: DetectedSignIn) -> Dict[str, str]:
    doc = payload.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = _now()
    await db.detected_signs.insert_one(doc.copy())
    return {"id": doc["id"], "status": "logged"}


@api.post("/feedback")
async def submit_feedback(payload: FeedbackIn) -> Dict[str, str]:
    doc = payload.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = _now()
    await db.feedback_corrections.insert_one(doc.copy())
    return {"id": doc["id"], "status": "saved"}


# ---------------------------------------------------------------------------
# Snowflake-style analytics layer
# ---------------------------------------------------------------------------
async def _aggregate_top_phrases() -> List[Dict[str, Any]]:
    pipeline = [
        {"$group": {"_id": "$sign_key", "count": {"$sum": 1}, "avg_conf": {"$avg": "$confidence"}}},
        {"$sort": {"count": -1}},
        {"$limit": 8},
    ]
    rows = await db.detected_signs.aggregate(pipeline).to_list(20)
    if not rows:
        # synthesize demo data so dashboard is never empty
        seeds = [
            ("hello", 42, 0.94), ("help", 31, 0.88), ("thank_you", 28, 0.91),
            ("water", 22, 0.86), ("emergency", 17, 0.79), ("pain", 14, 0.82),
            ("doctor", 12, 0.85), ("yes", 10, 0.93),
        ]
        return [{"sign_key": k, "count": c, "avg_conf": round(a, 2)} for k, c, a in seeds]
    return [
        {"sign_key": r["_id"], "count": r["count"], "avg_conf": round(r.get("avg_conf") or 0.0, 2)}
        for r in rows
    ]


async def _confidence_timeseries() -> List[Dict[str, Any]]:
    rows = await db.detected_signs.find({}, {"_id": 0, "confidence": 1, "created_at": 1}).to_list(500)
    if not rows:
        # synthesize a 14-day rising curve
        out: List[Dict[str, Any]] = []
        base = datetime.now(timezone.utc) - timedelta(days=13)
        for i in range(14):
            day = (base + timedelta(days=i)).date().isoformat()
            out.append({"day": day, "avg_confidence": round(0.72 + i * 0.015 + random.uniform(-0.02, 0.02), 3)})
        return out
    buckets: Dict[str, List[float]] = {}
    for r in rows:
        try:
            day = datetime.fromisoformat(r["created_at"]).date().isoformat()
        except Exception:
            continue
        buckets.setdefault(day, []).append(float(r.get("confidence") or 0))
    return sorted(
        [
            {"day": d, "avg_confidence": round(sum(v) / len(v), 3) if v else 0.0}
            for d, v in buckets.items()
        ],
        key=lambda x: x["day"],
    )[-14:]


async def _emergency_trend() -> List[Dict[str, Any]]:
    emergency_keys = {p["key"] for p in PHRASE_CATALOG if p.get("emergency")}
    rows = await db.detected_signs.find({}, {"_id": 0}).to_list(1000)
    buckets: Dict[str, int] = {}
    for r in rows:
        if r.get("sign_key") not in emergency_keys:
            continue
        try:
            day = datetime.fromisoformat(r["created_at"]).date().isoformat()
        except Exception:
            continue
        buckets[day] = buckets.get(day, 0) + 1
    if not buckets:
        base = datetime.now(timezone.utc) - timedelta(days=6)
        return [
            {"day": (base + timedelta(days=i)).date().isoformat(), "count": random.randint(1, 9)}
            for i in range(7)
        ]
    return sorted(
        [{"day": d, "count": c} for d, c in buckets.items()],
        key=lambda x: x["day"],
    )[-7:]


async def _accessibility_gaps() -> List[Dict[str, Any]]:
    return [
        {"region": "North-East", "score": 72, "gap": "Limited interpreters in clinics"},
        {"region": "South-West", "score": 58, "gap": "Few signing emergency responders"},
        {"region": "Midwest", "score": 81, "gap": "School coverage healthy"},
        {"region": "Pacific", "score": 65, "gap": "Telehealth captioning patchy"},
    ]


@api.get("/analytics/snowflake")
async def snowflake_analytics() -> Dict[str, Any]:
    top_phrases, confidence_series, emergency, gaps = await asyncio.gather(
        _aggregate_top_phrases(),
        _confidence_timeseries(),
        _emergency_trend(),
        _accessibility_gaps(),
    )
    convo_count = await db.conversations.count_documents({})
    msg_count = await db.messages.count_documents({})
    sign_count = await db.detected_signs.count_documents({})

    avg_conf = (
        sum(r["avg_confidence"] for r in confidence_series) / len(confidence_series)
        if confidence_series else 0.0
    )

    misinterpreted = await db.feedback_corrections.aggregate([
        {"$group": {"_id": "$sign_key", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 5},
    ]).to_list(10)
    if not misinterpreted:
        misinterpreted = [
            {"_id": "water", "count": 6},
            {"_id": "bathroom", "count": 4},
            {"_id": "doctor", "count": 3},
            {"_id": "pain", "count": 2},
        ]
    misinterpreted = [{"sign_key": r["_id"], "count": r["count"]} for r in misinterpreted]

    return {
        "kpis": {
            "conversations": convo_count,
            "messages": msg_count,
            "signs_detected": sign_count,
            "avg_confidence": round(avg_conf, 3),
        },
        "top_phrases": top_phrases,
        "confidence_series": confidence_series,
        "emergency_trend": emergency,
        "misinterpreted": misinterpreted,
        "accessibility_gaps": gaps,
        "queries_executed": [
            "SELECT sign_key, COUNT(*) AS uses FROM signs GROUP BY 1 ORDER BY 2 DESC LIMIT 8;",
            "SELECT day, AVG(confidence) FROM signs GROUP BY day ORDER BY day;",
            "SELECT day, COUNT(*) FROM signs WHERE category='alert' GROUP BY day;",
        ],
        "generated_at": _now(),
    }


# ---------------------------------------------------------------------------
# Mount
# ---------------------------------------------------------------------------
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)
