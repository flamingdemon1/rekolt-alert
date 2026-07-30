# Rekolt Alert

Rekolt Alert is a bilingual crop early-warning assistant for Mauritian small
farmers, built for **Build with Gemma: Blue Mauritius & Beyond**. A farmer can
describe a crop problem in Mauritian Creole (Morisien) or English, add crop
images, and receive cautious first-step guidance and relevant products from the
project catalogue.

This is a hackathon decision-support prototype, not a diagnostic or emergency
service.

## Problem

Crop guidance is often difficult to access quickly, particularly when a farmer
is more comfortable speaking Morisien than writing technical English. Visual
symptoms can also have several causes, so an assistant must preserve uncertainty
instead of presenting a weak inference as a confirmed diagnosis.

## Solution

Rekolt Alert combines:

- a mobile-friendly bilingual web experience;
- Morisien and English voice input;
- hosted Gemma conversation and image understanding;
- location-aware weather context;
- structured, preliminary crop-care guidance;
- a real 46-item project shop catalogue; and
- district-level agricultural information for Mauritius.

## Features

- Typed, spoken, and image-assisted conversations in Morisien or English
- Morisien automatic speech recognition and text-to-speech
- Same-language assistant replies based on the active language
- Preliminary multimodal crop observations and follow-up questions
- Weather from user-approved device coordinates or clearly labelled
  approximate IP coordinates
- Filtered shop recommendations that preserve real catalogue product IDs
- Interactive district data, shop, About Us, and How It Works pages
- Salted PBKDF2 password storage and hashed shop session tokens

Report persistence and a downloadable diagnostic report are not implemented.

## Architecture

```text
Browser (React / Vinext)
  |-- page and shop-auth routes ------------> Vinext worker + Cloudflare D1
  |-- weather request ----------------------> Open-Meteo + BigDataCloud
  `-- voice / conversation / image request -> FastAPI
                                                |-- Meta MMS ASR/TTS
                                                `-- Google Gen AI -> Gemma
```

The browser never receives `GEMMA_API_KEY`. It calls the FastAPI service through
the single configurable `NEXT_PUBLIC_REKOLT_API_URL`.

## Gemma integration

The FastAPI backend uses the official `google-genai` SDK. The primary and
fallback Gemma model names are configured through environment variables.
Provider calls are time-bounded, retry temporary failures, reject empty or
malformed output, and surface feature-level errors rather than fake success.

Gemma is used for:

- cautious agricultural conversation;
- Morisien/English meaning transfer;
- structured multimodal image observations; and
- context-aware product guidance from filtered real catalogue records.

## Multimodal and voice features

Uploaded JPEG, PNG, or WebP files are validated before being sent to Gemma.
Image results are preliminary observations, possible risks, missing information,
recommended actions, urgency, and warnings.

Meta MMS adapters provide Morisien transcription and speech synthesis. Their
model weights are downloaded lazily and are large; the first voice request can
therefore be slower than later requests. The frontend requires HTTPS or
`localhost` for microphone access.

## Agent workflow

1. The farmer supplies confirmed text and, optionally, crop images.
2. The backend determines the requested interface language.
3. The current case and bounded conversation history are assembled.
4. Relevant catalogue products are filtered before prompting Gemma.
5. Optional weather context is labelled as context, not evidence of a diagnosis.
6. Gemma returns structured preliminary guidance.
7. The backend validates product IDs and language before returning the result.

The assistant cannot invent a shop product or stock state: only validated
catalogue records are returned.

## Local-language support

The UI supports Morisien (`mfe`) and English (`en`). Morisien transcription
normalisation applies only reviewed word-boundary and spelling corrections and
keeps farmer confirmation in the workflow. English and Morisien conversation
responses are tested independently.

## Shop and database contextualisation

The product catalogue is stored in
`app/data/mauritius-agro-products.json`. Product filtering occurs before Gemma
receives context, and the backend validates returned IDs against the catalogue.
Catalogue stock is reported as `unknown` unless a real stock value is present;
the application does not fabricate availability.

Shop accounts and sessions use Cloudflare D1. The schema is defined in
`db/schema.ts`, the reproducible migration is in `drizzle/`, and auth routes
ensure the required tables exist. Runtime databases and user data are not
committed.

## Prerequisites

- Node.js 22.13 or newer
- Python 3.11–3.13 (Python 3.12 is recommended for current ML packages)
- Git
- A Google AI Studio API key with access to the configured Gemma model

## Setup

Clone the repository, then run these commands from its root.

### 1. Backend

PowerShell:

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt -r requirements-dev.txt
Copy-Item .env.example .env
```

macOS/Linux:

```bash
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt -r requirements-dev.txt
cp .env.example .env
```

Open `.env`, add `GEMMA_API_KEY`, and keep the file local. Then start FastAPI:

```bash
python -m uvicorn backend.app.main:app --reload --port 8000
```

Verify the backend at `http://127.0.0.1:8000/api/v1/health`.

### 2. Frontend

In a second terminal:

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`. The local D1 shop-auth tables are created on first
use. No separate seed command is required because the public catalogue is
versioned JSON rather than private runtime data.

## Environment variables

| Name | Required | Purpose | Safe/default value | Where to obtain it / effect if missing |
| --- | --- | --- | --- | --- |
| `APP_ENV` | No | Enables local-only development helpers | `development` | Set to `production` outside local development |
| `GEMMA_API_KEY` | Yes for AI features | Authenticates server-side Google Gen AI calls | None | Create in Google AI Studio; health and non-AI pages still work if missing |
| `GEMMA_MODEL_NAME` | No | Primary hosted Gemma model | `gemma-4-26b-a4b-it` | Use a model available to the Google AI Studio project |
| `GEMMA_FALLBACK_MODEL_NAME` | No | Alternate hosted Gemma model | `gemma-4-31b-it` | Used when the primary model is unavailable |
| `MAX_UPLOAD_MB` | No | Caps one audio upload or the total encoded image payload | `10` | Reduce for stricter deployments; oversized requests are rejected before AI calls |
| `CORS_ORIGINS` | Yes for browser-to-FastAPI calls | Comma-separated allowed frontend origins | Local origins in `.env.example` | Replace with the real HTTPS frontend origin in production |
| `NEXT_PUBLIC_REKOLT_API_URL` | Yes | Public HTTPS base URL of the FastAPI service | `http://127.0.0.1:8000` for local development | Set in the frontend deployment; voice/AI calls fail clearly if absent |

Weather and reverse geocoding use public, keyless providers. There is no
`WEATHER_API_KEY` in the runtime configuration.

## Database initialisation

- Local development: start the frontend and use register/login once; auth routes
  create the D1 tables idempotently.
- Schema source: `db/schema.ts`
- Deployment migration: `drizzle/0000_living_saracen.sql`
- Generate a new migration after an intentional schema change:

```bash
npm run db:generate
```

Do not commit local runtime database files or user records.

## Tests

Run the complete automated suite:

```bash
python -m pytest -q
python -m ruff check backend tests scripts
npm test
npm run lint
npx tsc --noEmit
python scripts/check_secrets.py
```

`npm test` performs a production frontend build followed by the TypeScript
weather and microphone state tests.

## Kaggle usage

The web application is not hosted inside a Kaggle notebook. Kaggle is used for
the competition submission/write-up and may be used to reproduce model
experiments. Store `GEMMA_API_KEY` as a Kaggle Secret and expose it only as an
environment variable; never paste it into a notebook cell or output.

After all final source files are committed, create the source archive with:

```bash
git archive --format=zip --output=rekolt-alert-kaggle.zip HEAD
```

Inspect that archive before uploading. It must include source, tests,
requirements, `.env.example`, migrations, public assets, and safe demo data, and
must exclude `.env`, caches, virtual environments, uploads, and runtime data.

## Deployment

The frontend has an OpenAI Sites project configuration and a Cloudflare D1
binding named `DB`. Before saving a production version:

1. commit and push the exact source state;
2. deploy the FastAPI backend to a public HTTPS service;
3. set backend `APP_ENV=production`, `GEMMA_API_KEY`, and `CORS_ORIGINS`;
4. set frontend `NEXT_PUBLIC_REKOLT_API_URL` to that backend URL;
5. apply/verify the D1 migration; and
6. run the health, conversation, image, weather, and shop-auth smoke tests.

Do not deploy a frontend that points to `127.0.0.1`.

## Team roles

- **Shihad:** Morisien integration, prompts, Gemma and voice testing, AI safety
- **Fahim:** farmer-facing frontend, upload/voice interfaces, interactions
- **Zuhayr:** district/dashboard UI, result displays, responsive frontend
- **Kavish:** FastAPI, Gemma connection, tools, structured backend responses
- **Manav:** UX, shop, reports/testing, accessibility, demo and submission checks

See `docs/team-responsibilities.md` for primary file ownership.

## Limitations

- Results are preliminary and depend on the farmer’s description and image
  quality.
- Voice models require a substantial first download and compatible local ML
  runtime.
- Conversation state is in memory and is lost when FastAPI restarts.
- Shop catalogue values are demo project data; live inventory is not connected.
- Report persistence/download is not implemented.
- IP-based location is approximate, and device location requires permission.
- Public deployment, final clean-clone verification, and the competition archive
  must be repeated after the final files are committed.

## Responsible-AI notice

Rekolt Alert does not confirm a plant diagnosis, replace an agronomist, or
authorise pesticide use. It separates observations from possible causes, asks
follow-up questions, prioritises safe non-chemical steps, preserves uncertainty,
and advises label compliance and qualified review when risk or uncertainty is
high. Farmers should not upload faces, names, or other unnecessary personal
information.

## Licence

No standalone open-source licence has been selected yet. Copyright remains with
the contributors until the team deliberately adds a licence before publication.
Third-party models, datasets, logos, and libraries remain subject to their own
terms.

## Competition deliverables

- Public GitHub repository
- Kaggle write-up
- Public demo
- Five-minute presentation

Never commit `.env`, API keys, private credentials, farmer information, or
sensitive crop images.
