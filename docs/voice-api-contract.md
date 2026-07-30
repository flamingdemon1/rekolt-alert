# Voice conversation API contract

Status: implemented for local backend and Dokter Plant frontend integration.
Public deployment is not yet complete.

## Required sequence

1. Record one short farmer turn as uncompressed PCM WAV.
2. Send the WAV bytes to the transcription route.
3. Show `corrected_transcript`. One-shot dictation leaves it in the editable
   composer. Conversation mode detects sustained trailing silence and submits
   the completed utterance automatically.
4. Send only the farmer-confirmed text to the conversation route.
5. Display `reply_text`.
6. Optionally send `reply_text` to the speech route and play the returned WAV.
7. Reuse the returned `case_id` for the next turn.
8. In conversation mode, resume listening after reply playback ends.

## Transcribe Morisien audio

```http
POST /api/v1/language/transcribe
Content-Type: audio/wav

<raw PCM WAV bytes>
```

Example response:

```json
{
  "language": "mfe",
  "raw_transcript": "lapliyer delo inn res danmo karo",
  "corrected_transcript": "lapli yer delo inn res dan mo karo",
  "automatic_corrections": [
    {
      "original": "lapliyer",
      "replacement": "lapli yer"
    },
    {
      "original": "danmo",
      "replacement": "dan mo"
    }
  ],
  "requires_confirmation": true
}
```

When `requires_confirmation` is `true`, the frontend must keep the transcript
visible. One-shot dictation requires the editable composer's send action.
Conversation mode treats detected end-of-speech as submission and keeps the
transcript visible during the response; spoken `wi/non` confirmation is not
used.

## Continue a turn with crop images

`POST /api/v1/language/conversation/turn-with-images` accepts the confirmed
statement plus one to three base64 JPEG, PNG, or WebP images. The backend checks
the declared type against the file signature before sending bytes to hosted
Gemma. Results are always preliminary visual observations, never a verified
diagnosis, chemical prescription, dosage, or guaranteed cure.

## Continue a confirmed conversation

For the first turn, omit `case_id` or send `null`:

```http
POST /api/v1/language/conversation/turn
Content-Type: application/json
```

```json
{
  "case_id": null,
  "confirmed_transcript": "Mo bann fey pe vinn zonn.",
  "language": "mfe"
}
```

Example response:

```json
{
  "case_id": "server-generated-id",
  "source_language": "mfe",
  "confirmed_transcript": "Mo bann fey pe vinn zonn.",
  "meaning_for_analysis_en": "My leaves are turning yellow.",
  "reply_text": "Sa kapav ena plizier koz. Ki plant sa?",
  "reply_language": "mfe",
  "translation_uncertain_segments": [],
  "preliminary_only": true
}
```

The frontend must reuse `case_id` for later turns in the same conversation.
Conversation history is memory-only and is lost when the backend restarts.

## Speak a Morisien reply

```http
POST /api/v1/language/speech
Content-Type: application/json
```

```json
{
  "text": "Sa kapav ena plizier koz. Ki plant sa?"
}
```

The response body is `audio/wav`. The frontend can create a browser object URL
from the response blob and play it with an `<audio>` element.

## Translate confirmed text directly

```http
POST /api/v1/language/translate
Content-Type: application/json
```

```json
{
  "source_text": "Mo bann fey pe vinn zonn.",
  "source_language": "mfe",
  "target_language": "en",
  "source_confirmed": true
}
```

Unconfirmed text receives HTTP `409`. Missing model dependencies or a missing
API key receive HTTP `503`. Invalid audio receives HTTP `415` or `422`.

## Security boundary

The frontend calls these backend routes and never receives, stores, or embeds
`GEMMA_API_KEY`. Uploaded audio is processed in memory and is not added to the
conversation history.
