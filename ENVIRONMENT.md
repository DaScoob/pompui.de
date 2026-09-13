# Environment — pompui.de

Server and infrastructure documentation for the **pompui.de** project. This project lives on the same server as (and follows the architecture of) the existing project at `/var/www/daniel-hettich.de`.

## Server

| Item | Value |
|---|---|
| Hostname | `ubuntu` |
| OS | Ubuntu 26.04.1 LTS (kernel 7.0.0-30-generic, x86_64) |
| CPU / RAM / Disk | 4 vCPU / 3.8 GiB / 116 GB (24 GB used) |
| User | `daniel` (uid 1000, groups: sudo, users) |
| Working directory | `/var/www/pompui.de` |
| Git version | 2.53.0 |
| Docker Compose | v5.5.1 (plugin) |

## Docker

- Docker daemon runs as root (`dockerd -H fd://` with containerd).
- The docker socket (`/var/run/docker.sock`) is owned by `root:docker`. The `daniel` user is **not** in the `docker` group, so plain `docker` commands fail with *permission denied*. Add the user to the `docker` group to fix: `sudo usermod -aG docker daniel` (re-login required).
- Currently running containers (from the daniel-hettich.de project, observed via process list):
  - `global-proxy` — nginx:alpine, publishes host ports **80** and **443** (single entry point for all sites).
  - `landing-page` — static nginx site for daniel-hettich.de.

## Architecture

Global reverse-proxy pattern (same as the daniel-hettich.de project):

```
Internet ──> :80/:443 global-proxy (nginx, SSL termination)
                 ├── pompui.de / www.pompui.de ──> pompui-landing:8080
                 ├── punctum.pompui.de ──> pompui-punctum:8080
                 ├── gj.pompui.de ──> pompui-garden-journal:3000
                 ├── snapotter.pompui.de ──> pompui-snapotter:1349
                 └── (daniel-hettich.de route)
```

- `global-proxy` reads its server blocks from the **daniel-hettich.de** project's `infrastructure/nginx/conf.d/` volume mount (`/var/www/daniel-hettich.de/infrastructure/nginx/conf.d` → `/etc/nginx/conf.d:ro`).
- Therefore: **pompui.de routing must be added as a `.conf` file in that daniel-hettich.de directory** (or the proxy mount must be extended — see "Integration options").
- `restart: always` on all containers.

## SSL / Certificates

- Let's Encrypt certs at `/etc/letsencrypt` on the host, mounted read-only into the proxy as `/etc/nginx/ssl`.
- Provider (IONOS/Sectigo) wildcard certificate for **`*.pompui.de`** is mounted into the proxy as `/etc/nginx/ssl/fullchain-pompui.pem` + `privkey-pompui.pem` (see the conf files in `infrastructure/nginx/conf.d/`).
- Intermediate certs are stored in `/var/www/daniel-hettich.de/secrets/`.

## Secrets & Credentials

- `secrets/` directories are **git-ignored** in both projects — never commit tokens.
- GitHub tokens live in each project's `secrets/github.token` (chmod 600, git-ignored) or in the remote URLs on the production host. The daniel-hettich.de PAT historically had **no access to `GitMinIT/pompui.de`** — keep tokens per-project with only the needed scopes.

## GitHub

| Item | Value |
|---|---|
| Org/User | `GitMinIT` |
| This repo | `https://github.com/GitMinIT/pompui.de.git` |
| Sibling repo | `https://github.com/GitMinIT/daniel-hettich.de.git` |

## Ports

| Port | Bound by | Purpose |
|---|---|---|
| 80 | `global-proxy` | HTTP → redirect to HTTPS |
| 443 | `global-proxy` | HTTPS (SSL termination) |
| 3000 | `pompui-garden-journal` (internal) | Node app (cloned from DaScoob/Garden-Journal), only reachable inside the docker network |
| 8080 | `pompui-landing` / `pompui-punctum` (internal) | static nginx containers |
| 1349 | `pompui-snapotter` (internal) | SnapOtter app (digest-pinned upstream image) |

**Only ports 80/443 are free to be used by this project — and only via the global-proxy.** Do not publish additional host ports.

## Conventions (copied from the daniel-hettich.de project)

- App source code in `sites/<name>/` (landing page) or cloned into `repos/<name>/` (hosted apps — see `repos/README.md`), each with its own `Dockerfile` (+ `nginx.conf` for static sites).
- Routing/SSL config in `infrastructure/nginx/conf.d/<site>.conf`.
- Service definitions in `docker-compose.yml`, container names globally unique (e.g. `pompui-landing`, NOT `landing-page` — names collide across projects on the same docker host).
- Security headers (HSTS, X-Frame-Options, nosniff, CSP) are set in the proxy server block.