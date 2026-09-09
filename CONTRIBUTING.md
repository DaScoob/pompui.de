# Contributing to pompui.de

## Workflow
1. Create a feature branch from `main`.
2. Make changes; keep sites self-contained under `sites/<name>/`.
3. Test locally: `docker compose up -d --build` and check via the proxy config.
4. Open a PR / merge to `main`.

## Rules
- Container names must be globally unique on the host (prefix `pompui-`).
- Only ports 80/443 via the shared `global-proxy` — never publish other host ports.
- Never commit secrets: `secrets/`, `.env`, tokens.
- Routing lives in `infrastructure/nginx/conf.d/` and must be mirrored into the DHde proxy mount after changes (see AGENTS.md → Deployment).