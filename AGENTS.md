# Agent Guide for pompui.de

## Environment
- **Project Root**: `/var/www/pompui.de`
- **Testing Host**: `/home/daniel/Projects/pompui.de` (HomeGate home server — implement, test and debug only; nothing is published from here, HTTP-only workflow)
- **Domain**: `pompui.de` (+ `www.pompui.de`)
- **Architecture**: Dockerized. Static nginx containers; production traffic enters via the **shared global-proxy** (`global-proxy` container, owned by the daniel-hettich.de project) which terminates SSL on ports 80/443 and routes by `server_name`.
- See `ENVIRONMENT.md` for full server details.

## Testing Host (HomeGate)
- The stack runs via a compose override: `docker compose -f docker-compose.yml -f infrastructure/compose/homegate-testing.yml up -d --build`
- Containers are exposed **directly** (HTTP, no proxy, no TLS), one port per site:
  - `pompui.de` (landing) → **6010**
  - `punctum.pompui.de` → **6012** (6011 is taken by open-webui on this host)
  - `gj.pompui.de` → **6013**
  - `snapotter.pompui.de` → **6014** (embedded PostgreSQL/Redis; first boot takes a while; needs `secrets/snapotter-password`)
- The external `web-network` join is overridden away — the daniel-hettich.de stack does not need to be running for testing this repo.
- daniel-hettich.de testing runs directly on **6009** from the daniel-hettich.de repo (see its AGENTS.md).
- Verify: `curl http://192.168.178.60:6010/` (or `http://<LAN-IP>:<port>` from any device).

## Credentials & Secrets
- **GitHub Repository**: `https://github.com/GitMinIT/pompui.de.git`
- **GitHub Token**: store in `secrets/github.token` (git-ignored) or let git use a credential helper; never commit it.
- **SSL Certificates**: `/etc/letsencrypt` on host → `/etc/nginx/ssl` inside `global-proxy`. Current cert only covers `*.daniel-hettich.de` — a pompui.de cert is still needed.

## Repo Layout
- `sites/landing-page` — the landing page (this repo's core product).
- `sites/landing-page/html/sites/snapotter/` — served AGPL licence-compliance docs for SnapOtter (image lives upstream).
- `repos/` — **hosted apps as separate git repositories**, cloned into this tree; each is built and routed like any other container. See `repos/README.md` for the full how-to (add an app: clone repo, compose service, carousel entry, subdomain, proxy conf).
- Garden Journal lives in its own repo (`https://github.com/DaScoob/Garden-Journal.git`); Punctum in `https://github.com/GitMinIT/Punctum`; SnapOtter upstream is `https://github.com/snapotter-hq/SnapOtter` (AGPL — clone pinned at the running tag into `repos/snapotter`, image digest-pinned in compose).

## Infrastructure Map
- **global-proxy** (external, from the daniel-hettich.de compose): nginx:alpine, SSL termination, routes:
  - `pompui.de` / `www.pompui.de` → `pompui-landing:8080`
  - `punctum.pompui.de` → `pompui-punctum:8080`
  - `snapotter.pompui.de` → `pompui-snapotter:1349`
- **pompui-landing**: static landing page (nginx-unprivileged:alpine, non-root, port 8080).
- **pompui-punctum**: Punctum app (separate repo in `repos/punctum`, static nginx, port 8080).
- **pompui-snapotter**: SnapOtter 2.2.0 file-processing suite (AGPL-3.0, embedded PostgreSQL/Redis, port 1349). **Licence compliance is mandatory** — see `sites/landing-page/html/sites/snapotter/COMPLIANCE.md` before updating it: pin image digest, update source offer, keep `repos/snapotter` checkout at the running tag. Auth enabled, telemetry off, password in `secrets/snapotter-password`.

## Deployment
1. `docker compose up -d --build` in this directory (builds `pompui-landing`, joins external `web-network`).
2. Copy `infrastructure/nginx/conf.d/pompui-landing.conf` into `/var/www/daniel-hettich.de/infrastructure/nginx/conf.d/` (this is the directory volume-mounted into `global-proxy`).
3. **Restart** the proxy whenever containers were **recreated** (new IPs): `docker restart global-proxy`.
   - ⚠️ Gotcha: `nginx -s reload` alone does NOT re-resolve upstream container names — recreated containers get new IPs and the proxy keeps connecting to stale ones (502s with `Connection refused` to wrong IPs). A full restart re-resolves.
   - `nginx -s reload` is fine after conf *text* changes when no container was recreated.
4. Ensure a valid pompui.de certificate exists in `/etc/letsencrypt` and fix the cert paths in the conf file.
5. ⚠️ Gotcha: the proxy-wide `X-Frame-Options: DENY` also applies to **non-HTML responses**. Anything a page embeds as `<object>`/`<iframe>` (e.g. `<object data="*.svg">`) is a nested navigation and gets blocked by Chrome with `net::ERR_BLOCKED_BY_RESPONSE` — the element renders empty with no obvious error on the page. The pompui-landing conf therefore carries a `location ~* \.svg$` block that re-declares the headers without XFO (nginx `add_header` does not inherit into nested locations) and adds CSP `frame-ancestors 'self'` instead. If you embed other subresources as documents (PDFs, XML…), extend that pattern to their extensions.

## Scaling & Extensibility
- To add a new hosted app, follow `repos/README.md` (clone repo → compose service → carousel entry → nginx conf → proxy mount).