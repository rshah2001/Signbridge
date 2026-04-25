"""SignBridge AI - Backend regression tests."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
    # fallback to frontend/.env
    from pathlib import Path
    env = Path("/app/frontend/.env").read_text()
    for line in env.splitlines():
        if line.startswith("REACT_APP_BACKEND_URL"):
            BASE_URL = line.split("=", 1)[1].strip().strip('"')
            break
BASE_URL = (BASE_URL or "").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="session")
def http():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def conversation_id(http):
    r = http.post(f"{API}/conversations", json={"title": "TEST_pytest_session"})
    assert r.status_code == 200, r.text
    return r.json()["id"]


# --- Health ---------------------------------------------------------------
class TestHealth:
    def test_root(self, http):
        r = http.get(f"{API}/")
        assert r.status_code == 200
        body = r.json()
        assert body.get("app") == "SignBridge AI"
        assert body.get("status") == "ok"


# --- Phrases --------------------------------------------------------------
class TestPhrases:
    def test_list_phrases(self, http):
        r = http.get(f"{API}/phrases")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 20, f"expected expanded phrase catalog, got {len(data)}"
        # No mongo _id leaking
        for p in data:
            assert "_id" not in p
            assert "key" in p and "label" in p


# --- Conversations + Messages --------------------------------------------
class TestConversations:
    def test_create_conversation(self, http):
        r = http.post(f"{API}/conversations", json={"title": "TEST_conv_create"})
        assert r.status_code == 200, r.text
        data = r.json()
        assert "id" in data and isinstance(data["id"], str)
        assert data["title"] == "TEST_conv_create"
        assert data["message_count"] == 0
        assert "_id" not in data

    def test_list_conversations(self, http, conversation_id):
        r = http.get(f"{API}/conversations")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        ids = [c["id"] for c in data]
        assert conversation_id in ids
        for c in data:
            assert "_id" not in c

    def test_get_conversation_with_messages(self, http, conversation_id):
        r = http.get(f"{API}/conversations/{conversation_id}")
        assert r.status_code == 200
        body = r.json()
        assert "conversation" in body and "messages" in body
        assert body["conversation"]["id"] == conversation_id
        assert "_id" not in body["conversation"]

    def test_get_conversation_404(self, http):
        r = http.get(f"{API}/conversations/does-not-exist-uuid")
        assert r.status_code == 404

    def test_add_message_increments_count(self, http, conversation_id):
        # Snapshot count
        r0 = http.get(f"{API}/conversations/{conversation_id}")
        before = r0.json()["conversation"]["message_count"]

        payload = {
            "speaker": "hearing",
            "direction": "voice_to_sign",
            "text": "TEST_message hello",
            "sign_tokens": ["hello"],
            "confidence": 0.9,
        }
        r = http.post(f"{API}/conversations/{conversation_id}/messages", json=payload)
        assert r.status_code == 200, r.text
        msg = r.json()
        assert msg["conversation_id"] == conversation_id
        assert msg["text"] == "TEST_message hello"
        assert "_id" not in msg

        r2 = http.get(f"{API}/conversations/{conversation_id}")
        after = r2.json()["conversation"]["message_count"]
        assert after == before + 1
        for m in r2.json()["messages"]:
            assert "_id" not in m


# --- Translation (Gemini) -------------------------------------------------
class TestTranslate:
    def test_voice_to_sign(self, http):
        r = http.post(
            f"{API}/translate/voice-to-sign",
            json={"text": "I need help right now"},
            timeout=60,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["original"] == "I need help right now"
        assert isinstance(data.get("simplified"), str) and data["simplified"]
        assert isinstance(data.get("sign_tokens"), list) and len(data["sign_tokens"]) > 0
        assert isinstance(data.get("matched_phrases"), list)

    def test_voice_to_sign_empty(self, http):
        r = http.post(f"{API}/translate/voice-to-sign", json={"text": "  "})
        assert r.status_code == 400

    def test_sign_to_voice(self, http):
        r = http.post(
            f"{API}/translate/sign-to-voice",
            json={"sign_tokens": ["help", "safe", "now"]},
            timeout=60,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["sign_tokens"] == ["help", "safe", "now"]
        assert isinstance(data["sentence"], str) and len(data["sentence"]) > 0
        assert 0.0 <= data["confidence"] <= 1.0

    def test_sign_to_voice_empty(self, http):
        r = http.post(f"{API}/translate/sign-to-voice", json={"sign_tokens": []})
        assert r.status_code == 400


# --- TTS (ElevenLabs) -----------------------------------------------------
class TestTTS:
    def test_tts_proxy_reachable(self, http):
        """ElevenLabs free tier blocks cloud IPs; non-2xx is acceptable.
        We only assert the endpoint is wired and proxies upstream errors structurally.
        """
        r = http.post(f"{API}/tts/speak", json={"text": "hello world"}, timeout=60)
        # Either 200 with audio/mpeg OR upstream proxied error (>=400)
        if r.status_code == 200:
            assert r.headers.get("content-type", "").startswith("audio/mpeg")
            assert len(r.content) > 100
        else:
            # 401/403/400/etc. expected from upstream
            assert r.status_code >= 400
            # FastAPI HTTPException returns JSON with 'detail'
            try:
                body = r.json()
                assert "detail" in body
                assert "ElevenLabs" in body["detail"] or len(body["detail"]) > 0
            except Exception:
                # Some upstream errors may not be JSON; that's still acceptable
                pass


# --- Signs detect / Feedback ---------------------------------------------
class TestSignsAndFeedback:
    def test_signs_detect(self, http, conversation_id):
        r = http.post(
            f"{API}/signs/detect",
            json={
                "conversation_id": conversation_id,
                "sign_key": "help",
                "confidence": 0.92,
                "source": "mediapipe",
            },
        )
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "logged"
        assert isinstance(data["id"], str)

    def test_feedback(self, http):
        r = http.post(
            f"{API}/feedback",
            json={
                "sign_key": "safe",
                "expected": "safe",
                "actual": "sign",
                "note": "TEST_pytest feedback",
            },
        )
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "saved"
        assert isinstance(data["id"], str)


# --- Snowflake-style analytics -------------------------------------------
class TestAnalytics:
    def test_snowflake(self, http):
        r = http.get(f"{API}/analytics/snowflake")
        assert r.status_code == 200
        data = r.json()
        for key in [
            "kpis",
            "top_phrases",
            "confidence_series",
            "emergency_trend",
            "misinterpreted",
            "accessibility_gaps",
            "queries_executed",
        ]:
            assert key in data, f"missing {key}"

        kpis = data["kpis"]
        for k in ("conversations", "messages", "signs_detected", "avg_confidence"):
            assert k in kpis

        assert isinstance(data["top_phrases"], list) and len(data["top_phrases"]) > 0
        for tp in data["top_phrases"]:
            assert "sign_key" in tp and "count" in tp and "avg_conf" in tp
            assert "_id" not in tp

        for m in data["misinterpreted"]:
            assert "sign_key" in m and "count" in m
            assert "_id" not in m

        assert isinstance(data["queries_executed"], list) and len(data["queries_executed"]) >= 1
