# Team responsibilities and primary ownership

Primary ownership identifies the files each person should normally edit. It does not prevent collaboration; cross-owner changes should be coordinated first to avoid merge conflicts.

## Shihad

Responsibilities:

- Creole integration
- Prompts
- AI testing
- Voice and language testing
- AI safety and response quality

Primary ownership:

- `backend/app/prompts/`
- `backend/app/services/language_service.py`
- `tests/test_creole.py`
- `docs/creole-testing.md`

Co-owns Gemma testing and `backend/app/services/gemma_service.py` with Kavish.

## Fahim

Responsibilities:

- Main frontend UI
- Farmer-facing page
- Image upload interface
- Voice input interface
- Main JavaScript interactions

Primary ownership:

- `frontend/index.html`
- `frontend/css/main.css`
- `frontend/js/app.js`
- `frontend/js/api.js`
- `frontend/js/audio.js`

## Zuhayr

Responsibilities:

- Dashboard UI
- Results display and alert cards
- Responsive design
- Frontend support

Primary ownership:

- `frontend/dashboard.html`
- `frontend/css/dashboard.css`
- `frontend/css/responsive.css`
- `frontend/js/dashboard.js`
- frontend support for report-view rendering

Coordinate changes to `frontend/report.html` and `frontend/js/report.js` with Manav, who owns report UX and layout requirements.

## Kavish

Responsibilities:

- Backend and FastAPI
- Gemma connection
- Function calling
- External data tools
- Structured backend responses

Primary ownership:

- `backend/app/main.py`, `config.py`, and `errors.py`
- `backend/app/api/`
- `backend/app/schemas/`
- `backend/app/services/` except the language service and report requirements
- `backend/app/tools/`
- `backend/app/storage/`
- `tests/test_backend.py`

Co-owns the Gemma service with Shihad and should coordinate report-service changes with Manav.

## Manav

Responsibilities:

- UX flow
- Report layout
- Testing and accessibility
- Demo reliability
- Submission checks

Primary ownership:

- `frontend/report.html`
- `frontend/js/report.js`
- report UX requirements for `backend/app/services/report_service.py`
- `tests/test_reports.py`
- `tests/test_frontend_flow.md`
- `docs/testing-checklist.md`
- `docs/demo-plan.md`
- `docs/submission-checklist.md`
- `docs/kaggle-writeup-outline.md`

## Shared agreement files

Changes to `docs/project-scope.md`, `docs/architecture.md`, and `docs/shared-data-contract.md` require team discussion because they affect multiple workstreams.
