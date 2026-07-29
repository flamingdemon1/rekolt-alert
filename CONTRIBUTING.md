# Contributing to Rekolt Alert

The project is split by ownership so five team members can work independently and reduce merge conflicts.

## Workflow

1. Do not work directly on `main`.
2. Pull the latest `main` before starting.
3. Create your own focused branch:
   - Shihad: `feature/creole-ai`
   - Fahim: `feature/main-frontend`
   - Zuhayr: `feature/dashboard-ui`
   - Kavish: `feature/gemma-backend`
   - Manav: `feature/ux-reports-testing`
4. Commit small, clearly described changes.
5. Push the branch and open a pull request.
6. Ask for review before merging.
7. Run relevant tests before merging once tests exist.

## Ownership and coordination

Stay within the primary ownership described in `docs/team-responsibilities.md`. If a change requires editing another member's files, communicate first and agree who will make the shared change.

Shared contracts and architecture documents should be discussed before implementation. In particular, the team must agree on `docs/shared-data-contract.md` before frontend and backend code depends on it.

Keep pull requests focused. Avoid drive-by formatting or unrelated changes in files another teammate is actively editing.

## Security

- Never commit API keys, tokens, passwords, private credentials, or a populated `.env` file.
- Never commit private farmer information or sensitive uploaded images.
- Use `.env.example` for expected variable names only.
- If a secret is committed, notify the team immediately and rotate it; deleting it in a later commit is not sufficient.

No `CODEOWNERS` file is included because GitHub usernames have not been provided.
