# Rékolt Alert

- Use `experiment/kreol-voice` for Dokter Plant experiments. Windows developers open the lab checkout and run `start-local.cmd`.
- Start with tracked source and the diff. Exclude generated output, dependency trees, source maps, recordings and lockfiles from broad searches. Inspect them directly when the task concerns them.
- Voice UI lives in `app/components/HandsFreeVoiceConversation.tsx` and `app/lib/voice-client.ts`. Backend entry points are in `backend/app/api/language.py`. Prompt builders live in `backend/app/prompts/`.
- Test locally with mocked provider calls first. Backend: `python -m pytest -q`. Frontend: `npm run test:frontend`. Use focused checks while iterating and broader checks for shared behaviour.
- Keep output to relevant matches, failures and test totals. Reuse gathered evidence. Prefer one agent for a single task. Identify live tests that consume my.t wallet credit.
- Assess changes against successful farmer conversations, reply quality and time to first audible word. Keep transcripts, audio and API keys out of usage logs.
