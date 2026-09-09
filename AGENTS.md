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
  - `pompui.de` / `www.pompui.de` → `pompui-landing:8080`
  - `gj.pompui.de` → `pompui-garden-journal:3000`
  - `snapotter.pompui.de` → `pompui-snapotter:1349`
- **pompui-landing**: static landing page (nginx-unprivileged:alpine, non-root, port 8080).
- **pompui-garden-journal**: Garden Journal app ("Mein Gartenjournal", Next.js/vinext on Node 22, port 3000).
- **pompui-snapotter**: SnapOtter 2.2.0 file-processing suite (AGPL-3.0, embedded PostgreSQL/Redis, port 1349). **Licence compliance is mandatory** — see `sites/snapotter/LICENSE-COMPLIANCE.md` before updating it: pin image digest, update source offer. Auth enabled, telemetry off, password in `secrets/snapotter-password`.

## Deployment
1. `docker compose up -d --build` in this directory (builds `pompui-landing`, joins external `web-network`).
2. Copy `infrastructure/nginx/conf.d/pompui-landing.conf` into `/var/www/daniel-hettich.de/infrastructure/nginx/conf.d/` (this is the directory volume-mounted into `global-proxy`).
3. **Restart** the proxy whenever containers were **recreated** (new IPs): `docker restart global-proxy`.
   - ⚠️ Gotcha: `nginx -s reload` alone does NOT re-resolve upstream container names — recreated containers get new IPs and the proxy keeps connecting to stale ones (502s with `Connection refused` to wrong IPs). A full restart re-resolves.
   - `nginx -s reload` is fine after conf *text* changes when no container was recreated.
4. Ensure a valid pompui.de certificate exists in `/etc/letsencrypt` and fix the cert paths in the conf file.

## Scaling & Extensibility
- To add a new site:
  1. Create a new directory under `sites/`.
  2. Add a service definition to `docker-compose.yml` (container name must be globally unique on the host, prefix with `pompui-`).
  3. Add a new `.conf` file in `infrastructure/nginx/conf.d/` and copy it to the DHde proxy mount.
  4. Reload the proxy (see step 3 above).