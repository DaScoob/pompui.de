# Contributing to pompui.de

Welcome! This repo hosts the sources for **pompui.de** (landing page + garden journal), deployed as Docker containers on a shared server. Multiple people work on this project, so please follow the guidelines below.

> **Note:** These guidelines are a living document — they are not set in stone. Propose changes via PR if something doesn't work for you or is missing.

## How we work (fork & branch model)

Since several people contribute, please follow this flow:

1. **Fork** the repo on GitHub (or work in a feature branch if you have write access and prefer that).
2. Create a **feature branch** in your fork, named after what it does:
   - `feature/<topic>` — new functionality (e.g. `feature/activity-menu`)
   - `fix/<topic>` — bug fixes (e.g. `fix/ssl-fallback`)
   - `docs/<topic>` — documentation only
   - Keep names short and lowercase, use `-` not spaces.
3. Make your changes on that branch. **One logical change-set per branch/PR** — don't mix unrelated fixes.
4. **Test locally before opening a PR** (see below).
5. Open a **Pull Request** against `main` of `GitMinIT/pompui.de`.
6. Wait for a review/approval from a maintainer before merging. Do not force-push to shared branches.

### Branch & commit etiquette
- `main` is the deployable truth: it should always build and reflect what runs on the server.
- Never commit directly to `main` (except trivial doc typo fixes) — use PRs.
- Write **small, focused commits** with clear messages:
  - Good: `Fix 404 fallback in landing page nginx config`
  - Bad: `changes`, `update`, `wip final FINAL`
- Rebase onto `main` before merging to keep history linear and readable.
- If a PR touches infrastructure (nginx, compose, certs), say so explicitly in the PR description.

## Testing locally

```bash
docker compose up -d --build   # build & start containers
# garden journal tests:
docker run --rm -v $PWD/sites/garden-journal:/app -w /app node:22-alpine npm test
```

- Run tests before committing (`npm test` for garden-journal — they must pass).
- Check your changes through the local containers, not only in the file system.
- Do not commit `node_modules/` (it is git-ignored).

## Server / infrastructure rules (important!)

These exist because this host runs **multiple projects** (see `ENVIRONMENT.md`):

- **Container names** must be globally unique on the host — prefix with `pompui-` (e.g. `pompui-landing`, `pompui-garden-journal`).
- **Ports**: only the shared `global-proxy` may bind host ports 80/443. Never publish additional ports from your service containers.
- **Routing**: server blocks live in `infrastructure/nginx/conf.d/`. They must be mirrored to the proxy's mount directory on the server (`/var/www/daniel-hettich.de/infrastructure/nginx/conf.d/`) after every change — see `AGENTS.md → Deployment`.
- **Secrets**: never commit tokens, keys or `.env` files. `secrets/` and `.env` are git-ignored; keep it that way.
- **SSL**: certs are provider-issued and live outside this repo. Don't reference new cert paths without coordinating with the server admin.

## Docs & hygiene

- Update `AGENTS.md` (infrastructure map) and `ENVIRONMENT.md` when you change architecture, containers or routing.
- Keep `README.md` accurate.
- Don't commit build artifacts, IDE settings or `node_modules/`.
- German is the language of the user-facing content; code, commits and comments are in English (or German where already established).

## Code of conduct

Be decent to each other, review constructively, and remember: someone else may maintain your code after you.