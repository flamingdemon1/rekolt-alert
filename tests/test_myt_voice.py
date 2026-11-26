import io
import json
import wave

from fastapi.testclient import TestClient
from requests import Response

from backend.app.api import language
from backend.app.config import Settings
from backend.app.main import app
from backend.app.services import myt_client


def test_myt_record_confirm_chat_and_speak(monkeypatch):
    settings = Settings(
        _env_file=None,
        AI_PROVIDER="myt",
        MYT_API_KEY="test",
        MYT_BASE_URL="https://example.test/v1",
    )
    monkeypatch.setattr(language, "settings", settings)
    stream = io.BytesIO()
    with wave.open(stream, "wb") as wav:
        wav.setparams((1, 2, 16000, 0, "NONE", ""))
        wav.writeframes(b"\x00\x20" * 1600)
    audio = stream.getvalue()
    paths = []

    def post(url, **kwargs):
        path = url.removeprefix("https://example.test/v1/")
        paths.append(path)
        assert kwargs["headers"]["Authorization"] == "Bearer test"
        response = Response()
        response.status_code = 200
        if path == "audio/transcriptions":
            assert kwargs["files"]["file"][1] == audio
            body = {"text": "My tomato leaves are yellow."}
        elif path == "chat/completions":
            payload = kwargs["json"]
            assert payload["model"] == "myt/deepseek-v4-flash"
            assert "My tomato leaves are yellow." in payload["messages"][1]["content"]
            reply = "How often do you water the tomato plant?"
            body = {
                "choices": [
                    {
                        "message": {
                            "content": json.dumps(
                                {
                                    "meaning_for_analysis_en": "My tomato leaves are yellow.",
                                    "reply_language": "en",
                                    "assistant_reply_en": reply,
                                    "reply_text": reply,
                                    "recommended_product_ids": [],
                                    "uncertain_segments": [],
                                }
                            )
                        }
                    }
                ]
            }
        else:
            assert path == "audio/speech"
            assert kwargs["json"]["response_format"] == "wav"
            response._content = audio
            return response
        response._content = json.dumps(body).encode()
        return response

    monkeypatch.setattr(myt_client.requests, "post", post)
    monkeypatch.setattr(
        language,
        "_fast_conversation_client",
        language._fast_conversation_client.__wrapped__,
    )
    client = TestClient(app)
    prefix = "/api/v1/language"
    draft = client.post(
        prefix + "/transcribe?language=en",
        content=audio,
        headers={"Content-Type": "audio/wav"},
    ).json()
    assert draft["requires_confirmation"]
    turn = client.post(
        prefix + "/conversation/turn",
        json={
            "language": "en",
            "confirmed_transcript": draft["corrected_transcript"],
        },
    )
    assert turn.status_code == 200, turn.text
    spoken = client.post(prefix + "/speech", json={"text": turn.json()["reply_text"]})
    assert spoken.content == audio
    assert paths == ["audio/transcriptions", "chat/completions", "audio/speech"]
