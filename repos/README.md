# repos/ — Hosted Apps

This folder holds the **separate git repositories of every app hosted on
pompui.de** (currently: `punctum`, `garden-journal`). Each app gets its own
GitHub repository and is cloned into this tree; the pompui.de repo only
provides the infrastructure (compose service, nginx routing, carousel entry)
around it.

> The app code is **not** part of this repo — it lives in its own repository.
> The clone is git-ignored (`.git/` and build artifacts), so a fresh clone of
> pompui.de must re-run the `git clone` in step 1 before `docker compose up`.

## Layout

```
repos/
  punctum/        # github.com/GitMinIT/punctum (timer/stopwatch/alarm/pomodoro)
  garden-journal/ # github.com/DaScoob/Garden-Journal (Mein Gemüsegarten, Next.js/vinext, port 3000)
```

## Adding a new app — step by step

Prerequisites: the app has its own GitHub repo and is containerizable
(nginx-unprivileged for static content is the house style).

### 1. Clone the repo

```bash
cd repos/
git clone https://github.com/<org>/<app>.git
```

**Heads-up from real practice:** check the app repo actually contains what the
hosting needs — a `Dockerfile` (or an image to pull), and for pompui.de-hosted
apps the AI-badge wiring (`ai-note`, impressum with KI-Hinweis). If the repo
was extracted from this one, required files may have lived only over here
(see "Publishing a new app repo" below). Missing Dockerfile = `docker compose
build` fails at step 5.

### 2. Docker compose service

Add to `docker-compose.yml` (root):

```yaml
  pompui-<app>:
    build: ./repos/<app>
    container_name: pompui-<app>        # must be globally unique on the host
    cap_drop:
      - ALL
    security_opt:
      - no-new-privileges:true
    networks:
      - pompui-network
      - web-network
    restart: always
```

Rules: container names prefixed `pompui-`, never publish host ports in the
main compose file (the global-proxy owns 80/443 — direct ports are only
allowed via the `homegate-testing.yml` override).

### 3. Carousel entry on the landing page

Two places must stay **in sync** (the JS checks that tile count equals array
length and refuses to run otherwise):

- `sites/landing-page/assets/js/main.js` → add an entry to the `activities`
  array (`id`, `title`, `status`, `description`, `meta`, `accent`,
  `accentRgb`, `href`, `action`).
- `sites/landing-page/html/index.html` → add a matching
  `.activity-tile` button with the same `data-activity-id` and the correct
  `data-index` (0-based, order = array order), and update the
  `data-activity-count`/hero default text if the first tile changed.

### 4. Subdomain + nginx routing

1. Create `infrastructure/nginx/conf.d/pompui-<app>.conf` — copy an existing
   one (e.g. `pompui-punctum.conf`) and change `server_name` to
   `<app>.pompui.de` and `proxy_pass` to `http://pompui-<app>:<container-port>`.
   The wildcard cert `*.pompui.de` already covers the new subdomain.
2. On the **production server**, copy that conf into
   `/var/www/daniel-hettich.de/infrastructure/nginx/conf.d/` — that directory
   is volume-mounted into `global-proxy`. Also make sure the subdomain has a
   DNS record (wildcard `*.pompui.de` at the provider saves this step).
3. Reload/restart the proxy — see `AGENTS.md → Deployment` (full `docker
   restart global-proxy` if any container was recreated, plain reload is only
   OK for conf-text-only changes).

### 5. Test & deploy

```bash
# local testing (HomeGate):
#   add a direct-port block for the new service to
#   infrastructure/compose/homegate-testing.yml first
docker compose -f docker-compose.yml -f infrastructure/compose/homegate-testing.yml up -d --build
curl http://192.168.178.60:<testport>/

# production:
docker compose up -d --build
docker restart global-proxy
curl -I https://<app>.pompui.de
```

### 6. Content duties (don't skip)

- **Datenschutz** (`sites/landing-page/html/datenschutz.html`): document what
  the app processes/stores (localStorage? account? telemetry?).
- **Impressum** (`sites/landing-page/html/impressum.html`): mention the app in
  the Software-Lizenzen section if it has a licence or source offer.
- **AI notice**: every new page needs the AI badge — see `CONTRIBUTING.md`.

## Removing an app

Reverse of the above: remove the compose service, the conf file (both in this
repo and in the DHde proxy mount), the carousel entry (JS array + HTML tile),
and its datenschutz/impressum mentions. Then `git rm -r repos/<app>` and
`docker compose up -d --remove-orphans`.

## Publishing a new app repo (so step 1 works for everyone)

An app repo must be **self-contained for hosting**. Checklist for the app
repo itself (not this repo):

- [ ] `Dockerfile` at the repo root (house style: multi-stage, non-root,
      `EXPOSE` the internal port, `CMD` starts the app). Static sites: base
      `nginxinc/nginx-unprivileged:alpine`, copy `nginx.conf` + content,
      listen on **8080**.
- [ ] `nginx.conf` (static apps) with `try_files … =404` and a proper 404
      page; HTML `no-cache`, assets short-cache.
- [ ] `README.md` with dev/test/build commands.
- [ ] Test suite runnable headless (`npm test` / `docker run … npm test`).
- [ ] For pompui.de-hosted apps: the **AI notice badge** on every page and a
      **KI-Hinweis** section in the impressum (see `CONTRIBUTING.md →
      AI-notice requirement`) and the impressum must carry the current
      provider block (Pompui c/o address).
- [ ] Repo pushed to GitHub **before** anyone runs the add-a-new-app flow —
      a 404 clone is the first thing that breaks.
- [ ] Deploying service (GitMinIT) needs **write access** to the repo (or at
      least to accept a PR) — otherwise hosting-required files can't be added
      upstream and drift back into this repo.

Push the hosting files from wherever they exist first (e.g. recovered from
pompui.de git history), then clone per step 1. Keep this repo free of app
code — fixes to app code go upstream via PR; this repo only carries the
compose/nginx/carousel integration.