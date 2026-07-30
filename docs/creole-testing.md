# Morisien testing

Owner: Shihad.

## Current status

A 12-clip pilot evaluation was completed with Gemma 4 E2B and repeated with
Meta MMS using its `mfe` adapter. The tests used short agricultural statements
recorded by multiple team members.

The Gemma E2B results in `data/demo/creole_examples.json` produced:

- 0 reliable passes
- 8 partial transcriptions
- 4 failed transcriptions

The MMS results in `data/demo/mms_evaluation_results.json` produced:

- 1 exact pass
- 8 partial transcriptions
- 3 failed transcriptions
- 26.2% average word error rate

Gemma E2B frequently produced non-Morisien normalization and changed the
meaning. MMS retained meaning more consistently, but still merged words and
made spelling errors across speakers and microphones. These clips were used
for evaluation only; they did not train or fine-tune either model.

## Translation pilot

The 12 farmer-confirmed Morisien statements were translated into English with
the hosted `gemma-4-26b-a4b-it` model. Human review found that all 12 outputs
preserved the intended agricultural meaning. A separate English-to-Morisien
check showed that the prompt must explicitly preserve `bann` for plural nouns
and `pe` for ongoing actions; the revised prompt then produced the expected
standard Morisien sentence.

The reviewed outputs are stored in
`data/demo/translation_evaluation_results.json`. One API response wrapped the
requested JSON object in a one-item list, so production code must validate the
response schema rather than assuming well-formed model output.

## Text-to-speech pilot

The official `facebook/mms-tts-mfe` Morisien checkpoint produced clear and
understandable speech, although its default rhythm contained excessive pauses.
The selected settings use a speaking rate of `1.15`, duration randomness of
`0.40`, and noise scale of `0.60`.

A natural Morisien calibration recording measured comma pauses of 526 ms and
477 ms, and a sentence pause of 716 ms. The service therefore uses a 500 ms
comma pause and a 700 ms sentence pause, while compressing model-generated
internal silences longer than 180 ms to 90 ms. These values calibrate rhythm;
they do not fine-tune the model or clone the speaker's voice.

The runtime implementation lives in
`backend/app/services/tts_service.py`. It loads model weights only when speech
is requested. The backend team must add compatible `torch`, `transformers`,
and `numpy` runtime dependencies when integrating the service into deployment.

## Agreed workflow

The application must treat speech recognition as a draft:

1. MMS with the `mfe` adapter creates a Morisien draft transcript.
2. Deterministic rules split uniquely identifiable merged words.
3. A constrained normalization pass may correct remaining spelling.
4. The farmer reviews and edits the transcript.
5. Only the farmer-confirmed transcript may enter Gemma crop-risk analysis.

Normalization must not add crop symptoms, locations, urgency, or recommended
actions. Uncertain segments must remain visible to the farmer.

## Prompt strategy

The transcription prompt may use a bounded agricultural glossary and
farmer-selected crop or location context. Vocabulary hints are not evidence
that a word was spoken, and the model must only use them when audible.

The reusable prompt components live in
`backend/app/prompts/creole_prompts.py`.

The deterministic word-boundary correction lives in
`backend/app/services/language_service.py`. It must not split ambiguous words.

## Turn-by-turn voice conversation

The backend now exposes four language boundaries:

- `POST /api/v1/language/transcribe` accepts an uncompressed PCM WAV request
  body and returns a draft Morisien transcript.
- `POST /api/v1/language/translate` translates farmer-confirmed text between
  `mfe` and `en`.
- `POST /api/v1/language/conversation/turn` accepts a confirmed transcript,
  maintains a short volatile conversation history, and returns a preliminary
  reply in the farmer's language.
- `POST /api/v1/language/speech` returns calibrated Morisien WAV speech.

This provides push-to-talk conversation, not continuous streaming voice. The
frontend displays the draft transcript. The editable composer uses its send
action for confirmation; conversation mode detects the end of speech, submits
the utterance, speaks the reply, and resumes listening. Audio is not retained
in conversation history. The demo store is memory-only and resets whenever the
backend process restarts.

The speech models load only when their endpoints are first called. Hosted
Gemma calls fail with a clear service-unavailable response when
`GEMMA_API_KEY` is missing rather than preventing the whole API from starting.

The frontend must send PCM WAV audio. Browser formats such as `webm` or `m4a`
must be converted client-side or through an approved conversion boundary
before calling the transcription route.

## Model and licence note

The current MMS checkpoint is `facebook/mms-1b-all` with the `mfe` adapter. Its
model card lists the licence as CC BY-NC 4.0. The team must include attribution
and confirm competition and deployment compatibility before final submission.
The `facebook/mms-tts-mfe` checkpoint uses the same CC BY-NC 4.0 licence and
requires the same review.

## Further evaluation

Future checks should use recordings that are not included as prompt examples.
They should cover:

- natural Morisien crop descriptions
- English code-switching within Morisien speech
- multiple speakers and microphone qualities
- different spellings and phrasing for the same meaning
- ambiguous statements requiring follow-up questions
- urgent situations and safe uncertainty handling
- consistency across the supported `mfe` and `en` paths

Do not use private farmer information. Any future fine-tuning dataset must be
kept separate from the validation and final test recordings.
