# Agent Guide for pompui.de

## Environment
- **Project Root**: `/var/www/pompui.de`
- **Domain**: `pompui.de` (+ `www.pompui.de`)
- **Architecture**: Dockerized. Static nginx containers; traffic enters via the **shared global-proxy** (`global-proxy` container, owned by the DHde project) which terminates SSL on ports 80/443 and routes by `server_name`.
- See `ENVIRONMENT.md` for full server details.

## Credentials & Secrets
- **GitHub Repository**: `https://github.com/GitMinIT/pompui.de.git`
- **GitHub Token**: store in `secrets/github.token` (git-ignored) or let git use a credential helper; never commit it.
- **SSL Certificates**: `/etc/letsencrypt` on host → `/etc/nginx/ssl` inside `global-proxy`. Current cert only covers `*.daniel-hettich.de` — a pompui.de cert is still needed.

## Infrastructure Map
- **global-proxy** (external, from DHde compose): nginx:alpine, SSL termination, routes:
  - `pompui.de` / `www.pompui.de` → `pompui-landing:80`
  - `gj.pompui.de` → `pompui-garden-journal:3000`
- **pompui-landing**: static landing page (nginx:alpine).
- **pompui-garden-journal**: Garden Journal app ("Mein Gartenjournal", Next.js/vinext on Node 22, port 3000).

## Deployment
1. `docker compose up -d --build` in this directory (builds `pompui-landing`, joins external `web-network`).
2. Copy `infrastructure/nginx/conf.d/pompui-landing.conf` into `/var/www/daniel-hettich.de/infrastructure/nginx/conf.d/` (this is the directory volume-mounted into `global-proxy`).
3. Reload proxy: `docker exec global-proxy nginx -t && docker exec global-proxy nginx -s reload` (requires docker access).
4. Ensure a valid pompui.de certificate exists in `/etc/letsencrypt` and fix the cert paths in the conf file.

## Scaling & Extensibility
- To add a new site:
  1. Create a new directory under `sites/`.
  2. Add a service definition to `docker-compose.yml` (container name must be globally unique on the host, prefix with `pompui-`).
  3. Add a new `.conf` file in `infrastructure/nginx/conf.d/` and copy it to the DHde proxy mount.
  4. Reload the proxy (see step 3 above).