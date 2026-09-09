# SnapOtter — Licence & Compliance

> **AGPL-3.0 notice:** All content, design, images and source code of this website were created with the assistance of artificial intelligence (AI) and curated by Daniel Hettich.

## What this is

This directory documents the deployment of [SnapOtter](https://github.com/snapotter-hq/SnapOtter) at <https://snapotter.pompui.de>.

| | |
|---|---|
| Software | SnapOtter Community Edition (open core) |
| Version | 2.2.0 (upstream revision `6aacb4f3a937839db131eccd30d55fa04bbaf58a`) |
| Image | `snapotter/snapotter@sha256:2e11b4fa9138fa93e0fdfde5da3a2d042eebcfa81dd51286488872a3eb8086c8` |
| Licence | **AGPL-3.0** (see `LICENSE` in this folder) |
| Enterprise code | **Not used.** No `packages/enterprise/` code, no commercial licence key installed — all enterprise features are inactive |
| Deployed | 2026-09-09 |

## How AGPL-3.0 obligations are met

We operate an **unmodified upstream build** of SnapOtter as a network service (AGPL §13 applies). We comply as follows:

1. **Corresponding Source offer (§13)** — Every user of <https://snapotter.pompui.de> can obtain the exact source of the running version, at no charge, from the upstream repository:
   - Source: <https://github.com/snapotter-hq/SnapOtter>
   - Exact source of the running version: upstream revision `6aacb4f3a937839db131eccd30d55fa04bbaf58a` (= release 2.2.0, tag `v2.2.0`: <https://github.com/snapotter-hq/SnapOtter/releases/tag/v2.2.0>)
   - Image digest: `sha256:2e11b4fa9138fa93e0fdfde5da3a2d042eebcfa81dd51286488872a3eb8086c8` (pinned in `docker-compose.yml`)
   - We make **no modifications** to SnapOtter. If we ever modify it, this file must be updated with a link to our modified Corresponding Source, and the app's notice must be updated.
2. **License text preserved** — `LICENSE` and `LICENSING.md` are kept in this folder and referenced from the pompui.de impressum.
3. **Third-party notices** — `THIRD_PARTY_NOTICES.md` (generated dependency inventory incl. AGPL-3.0 components such as `mupdf`) is kept unmodified in this folder.
4. **No enterprise use** — We do not use `packages/enterprise/` (commercially licensed) — it is not deployed, no enterprise features are activated, and no bypass is attempted.

## Runtime notes

- Telemetry/analytics is **disabled** (`SNAPOTTER_ANALYTICS=off`) — nothing leaves the server.
- Access is authenticated (`AUTH_ENABLED=true`); default credentials replaced by a generated password stored in `secrets/snapotter-password` (git-ignored).
- Runs in embedded mode (in-container PostgreSQL 17 + Redis 8) with a 2.5 GB memory cap on the shared host.
- Reverse proxy: `global-proxy` → `pompui-snapotter:1349` (TLS termination, 2 GB upload limit).

## Update procedure (keep this compliant!)

1. `docker pull snapotter/snapotter:latest`
2. Update the image digest in `docker-compose.yml` (pin the new `@sha256:...`)
3. Update the version + revision in **this file** and re-check upstream `LICENSE` / `THIRD_PARTY_NOTICES.md` for changes; update the copies in this folder
4. `docker compose up -d pompui-snapotter` and verify `/api/v1/health` reports the new version