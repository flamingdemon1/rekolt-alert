# Rekolt Alert

Rekolt Alert is the working title for a Creole-accessible crop early-warning assistant for Mauritian small farmers, prepared for **Build with Gemma: Blue Mauritius & Beyond**.

The intended experience will let a farmer share crop images, describe a situation in Mauritian Creole or English, answer follow-up questions, and receive an AI-assisted preliminary risk report.

> **Current status:** repository foundation only. No application features, AI integration, API, dashboard, or report generation have been implemented.

## Intended technology stack

- Frontend: HTML, CSS, and vanilla JavaScript
- Backend: Python and FastAPI
- AI: Gemma 4
- Testing: pytest
- Code quality: Ruff

The exact runtime dependencies and official Gemma integration method still need to be confirmed by the team.

## Team responsibilities

- **Shihad:** Creole integration, prompts, Gemma testing, voice and language testing, AI safety, and response quality
- **Fahim:** main farmer-facing frontend, image upload and voice input interfaces, and main JavaScript interactions
- **Zuhayr:** dashboard frontend, results display, alert cards, responsive design, and frontend support
- **Kavish:** backend, FastAPI, Gemma connection, function calling, external data tools, and structured backend responses
- **Manav:** UX flow, report layout, testing, accessibility, demo reliability, and submission checks

See [docs/team-responsibilities.md](docs/team-responsibilities.md) for primary folder and file ownership.

## Repository folders

- `frontend/` — farmer-facing, dashboard, and report-view frontend files
- `backend/` — future FastAPI, Gemma, language, tool, and report modules
- `tests/` — future automated and manual flow tests
- `data/` — safe, non-sensitive demo data only
- `docs/` — scope, architecture, contract, testing, demo, and submission coordination
- `scripts/` — future repository maintenance checks

## Setup

Setup is intentionally incomplete until the backend team confirms and adds runtime dependencies.

When development begins:

1. Create and activate a local Python virtual environment.
2. Install development tooling from `requirements-dev.txt`.
3. Copy `.env.example` to `.env` and add local credentials only when integrations are ready.
4. Follow the ownership and collaboration guidance in `CONTRIBUTING.md`.

No start command is available because the application has not been implemented.

## Branching workflow

Do not work directly on `main`.

1. Pull the latest `main`.
2. Create the branch assigned to your work area.
3. Make small, focused commits.
4. Open a pull request.
5. Ask at least one teammate for review before merging.

Suggested first branches:

- Shihad: `feature/creole-ai`
- Fahim: `feature/main-frontend`
- Zuhayr: `feature/dashboard-ui`
- Kavish: `feature/gemma-backend`
- Manav: `feature/ux-reports-testing`

## Secrets and private data

Never commit API keys, `.env`, private credentials, farmer information, or sensitive crop images. Use `.env.example` only to document variable names. Demo data must be safe to publish.

## Competition deliverables

- Public repository
- Kaggle Writeup
- Public demo
- Five-minute presentation

These deliverables are planned and are not yet complete.
