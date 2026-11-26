"""my.t chat, transcription and speech adapters for Dokter Plant."""

import base64

import requests

from backend.app.config import Settings
from backend.app.services.speech_service import (
    decode_pcm_wav,
    prepare_english_transcript,
    prepare_morisien_transcript,
)


class MytClient:
    def __init__(self, settings: Settings):
        self.settings = settings

    def _post(self, path, **kwargs):
        key = self.settings.MYT_API_KEY
        base = self.settings.MYT_BASE_URL.strip().rstrip("/")
        if (
            not base.startswith("https://")
            or not key
            or not key.get_secret_value().strip()
        ):
            raise RuntimeError(
                "Configure MYT_BASE_URL and MYT_API_KEY in the backend .env"
            )
        try:
            response = requests.post(
                f"{base}/{path}",
                headers={"Authorization": f"Bearer {key.get_secret_value().strip()}"},
                timeout=(5, 35),
                allow_redirects=False,
                **kwargs,
            )
        except requests.RequestException as error:
            raise RuntimeError("Could not reach my.t AI Cloud") from error
        if not 200 <= response.status_code < 300:
            raise RuntimeError(f"my.t {path} returned HTTP {response.status_code}")
        return response

    def generate_text(self, *, system_instruction, prompt, json_output=False):
        return self._chat(system_instruction, prompt, json_output)

    def generate_multimodal_text(
        self, *, system_instruction, prompt, images, json_output=False
    ):
        content = [{"type": "text", "text": prompt}]
        for data, mime_type in images:
            encoded = base64.b64encode(data).decode("ascii")
            content.append(
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:{mime_type};base64,{encoded}"},
                }
            )
        return self._chat(system_instruction, content, json_output)

    def _chat(self, instruction, content, json_output):
        payload = {
            "model": self.settings.MYT_CHAT_MODEL,
            "messages": [
                {"role": "system", "content": instruction},
                {"role": "user", "content": content},
            ],
        }
        if json_output:
            payload["response_format"] = {"type": "json_object"}
        response = self._post("chat/completions", json=payload)
        try:
            reply = response.json()["choices"][0]["message"]["content"]
        except (KeyError, ValueError, IndexError, TypeError) as error:
            raise RuntimeError("my.t returned an invalid chat response") from error
        if not isinstance(reply, str) or not reply.strip():
            raise RuntimeError("my.t returned an empty chat reply")
        return reply.strip()

    def transcribe_wav(self, wav_bytes, *, language):
        decode_pcm_wav(wav_bytes)
        data = {"model": "myt/myt_asr", "response_format": "json"}
        if language == "en":
            data["language"] = "en"
        else:
            data["prompt"] = "Kreol Morisien (Mauritian Creole)."
        response = self._post(
            "audio/transcriptions",
            data=data,
            files={"file": ("recording.wav", wav_bytes, "audio/wav")},
        )
        try:
            transcript = response.json()["text"]
        except (ValueError, TypeError, KeyError) as error:
            raise RuntimeError("my.t returned an invalid transcript") from error
        if not isinstance(transcript, str) or not transcript.strip():
            raise RuntimeError("my.t returned no transcript")
        prepare = (
            prepare_english_transcript
            if language == "en"
            else prepare_morisien_transcript
        )
        return prepare(transcript)

    def synthesize_wav(self, text):
        response = self._post(
            "audio/speech",
            json={
                "model": "myt/myt_tts",
                "input": text,
                "voice": self.settings.MYT_TTS_VOICE,
                "response_format": "wav",
            },
        )
        audio = response.content
        if len(audio) <= 12 or audio[:4] != b"RIFF" or audio[8:12] != b"WAVE":
            raise RuntimeError("my.t returned an invalid WAV response")
        return audio
