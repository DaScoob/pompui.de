# pompui.de

Platform to host open source projects.

Source of the website **pompui.de**, deployed as Docker containers on the same server as `daniel-hettich.de` and routed through the shared global nginx proxy.

## Structure

```
infrastructure/nginx/conf.d/   routing/SSL server blocks (copied into the global-proxy mount)
sites/landing-page/            static landing page (nginx:alpine)
secrets/                       tokens (git-ignored, never commit)
docker-compose.yml             service definitions (external shared `web-network`)
ENVIRONMENT.md                 server & infrastructure documentation
AGENTS.md                      guide for coding agents
```

## Quick start

```bash
docker compose up -d --build
# then install the routing conf into the global-proxy mount and reload nginx
# see AGENTS.md -> Deployment
```

## Git

- Remote: `https://github.com/GitMinIT/pompui.de.git`
- Default branch: `main`
- Never commit secrets (`secrets/` and `.env` are git-ignored).