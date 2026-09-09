# Security Audit — Server `ubuntu` (31.70.133.143)

**Audit date:** 2026-09-09 · **Scope:** host, Docker containers, global-proxy, both websites
**Rating summary:** 🟢 Good baseline · 🟡 Hardening recommended · 🔴 Act now

---

## Fix status (updated 2026-09-09, evening)

| # | Finding | Status |
|---|---|---|
| 1 | Leaked GitHub tokens | ✅ Old token revoked (401), new token stored in `secrets/` (600), remotes updated |
| 2 | PermitRootLogin yes | ⏳ Needs sudo — `sudo sed -i 's/^PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config && sudo systemctl reload ssh` |
| 3 | Default vhost served unknown Hosts | ✅ Fixed — `00-hardening.conf` with `default_server` + `return 444` / `ssl_reject_handshake on` |
| 4 | No rate limiting | ✅ Fixed — `limit_req_zone 10r/s` + `burst=20` on all site server blocks |
| 5 | server_tokens exposed version | ✅ Fixed — custom `infrastructure/nginx/nginx.conf` mounted with `server_tokens off` (now: `Server: nginx`) |
| 6 | Containers ran as root | ✅ Fixed for landings — both use `nginxinc/nginx-unprivileged:alpine` (uid 101) + `cap_drop: ALL` + `no-new-privileges`; garden-journal has cap_drop + no-new-privileges (still root uid — follow-up) |
| 7 | fail2ban bantime short | ⏳ Needs sudo — see below |
| 8 | X-XSS-Protection obsolete | ℹ️ Harmless, left as-is |

**Still open for the admin (needs sudo):**
1. `PermitRootLogin no` + reload ssh
2. fail2ban jail.local: `bantime = 1h`, `maxretry = 3` + `systemctl restart fail2ban`
3. 4 pending apt upgrades

---

## 🔴 Critical findings (act now)

### 1. Leaked GitHub token still valid in git history
- Two fine-grained PATs are in the git history of `GitMinIT/daniel-hettich.de`
  (removed from files in commit `09a56cb`, but history is public on GitHub).
- **`github_pat_11A6QNFTQ0H8Qzh...` is still VALID (HTTP 200) and grants write access** to the repo.
- Attack vector: anyone cloning the public repo can read the token in history and push.
- **Fix:** Revoke both tokens at github.com → Settings → Developer settings → Fine-grained tokens, then roll over to a new token (update `secrets/github.token` + remote URLs on the server).
- Long-term: use a credential helper instead of tokens in remote URLs, and consider history rewrite (`git filter-repo`) — but revocation is the essential step.

### 2. `PermitRootLogin yes` on SSH
- Root can log in via SSH (key-only, since password auth is off — but still unnecessary attack surface).
- **Fix (needs sudo):**
  ```
  sudo sed -i 's/^PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
  sudo systemctl reload ssh
  ```
  (daniel's key login keeps working)

---

## 🟡 Recommended hardening

### 3. nginx default vhost serves content for unknown Hosts
- Requests to `https://31.70.133.143` or `Host: evil.example.com` fall into the first server block and serve daniel-hettich.de (HTTP 200). This invites host-header fuzzing and gives scanners a landing page.
- **Fix:** add a catch-all first server block returning `444` (close connection):
  ```nginx
  server {
      listen 80 default_server;
      server_name _;
      return 444;
  }
  server {
      listen 443 ssl default_server;
      server_name _;
      ssl_reject_handshake on;   # nginx >= 1.19.4
  }
  ```

### 4. No rate limiting on the proxy
- No `limit_req` anywhere — brute-force on endpoints (e.g. garden journal) or traffic floods hit the containers directly.
- **Fix (per-server or in a shared snippet):**
  ```nginx
  limit_req_zone $binary_remote_addr zone=general:10m rate=10r/s;
  # in each server/location:
  limit_req zone=general burst=20 nodelay;
  ```

### 5. `server_tokens` expose nginx version (`nginx/1.31.4`)
- **Fix:** `server_tokens off;` in `http` block (proxy + site containers) — minor obscurity win.

### 6. Containers run as root
- All 4 containers run as uid 0 (default for nginx/node images). A container escape would gain root-level daemon privileges on the host network namespace.
- **Fix:** add `user: nginx` (landing pages) or a non-root user in the garden-journal Dockerfile; alternatively `cap_drop: [ALL]` + read_only rootfs where feasible.

### 7. fail2ban default bantime is short (10 min)
- Active and working, but 34.5k failed SSH attempts in the current log show bots are relentless.
- **Fix (needs sudo):** `/etc/fail2ban/jail.local`:
  ```ini
  [sshd]
  bantime = 1h
  findtime = 10m
  maxretry = 3
  ```

### 8. X-XSS-Protection header is obsolete
- Deprecated in all modern browsers; harmless but dead weight. Replace with CSP's `X-XSS-Protection` removal or keep as-is (harmless).

---

## 🟢 What's already good

| Area | State |
|---|---|
| **Firewall (ufw)** | ✅ Default `INPUT DROP`; only 22/80/443 open; Docker traffic correctly chained |
| **SSH** | ✅ PasswordAuthentication **no** (key-only), 1 authorized key |
| **fail2ban** | ✅ Active, sshd jail enabled (nftables banaction) |
| **Auto updates** | ✅ unattended-upgrades active (Update-Package-Lists=1, Unattended-Upgrade=1) |
| **TLS** | ✅ TLSv1.2/1.3 only, strong ciphers, valid wildcard certs, HSTS 1y |
| **Security headers** | ✅ HSTS, X-Frame-Options DENY, nosniff, CSP, Referrer-Policy on all sites |
| **Docker API** | ✅ Not exposed on TCP (unix socket only, 660 root:docker) |
| **No docker socket** | ✅ Not mounted into any container |
| **No privileged containers** | ✅ `privileged=false`, no extra caps anywhere |
| **Sensitive files** | ✅ `/.env`, `/.git/*`, `secrets/*` → 404 on all sites; token files 600 |
| **Secrets in pompui.de repo** | ✅ Clean (no token in history) |
| **Ports 80→443 redirects** | ✅ All HTTP → HTTPS |
| **HTTP methods** | ✅ OPTIONS rejected (405) |
| **Node runtime** | ✅ Current Node 22 |

## Checklist for the admin (needs sudo)

1. 🔴 **Revoke leaked GitHub tokens** (both PATs) + create new one → update `secrets/github.token`, remote URLs
2. 🔴 `PermitRootLogin no`
3. 🟡 Add fail2ban jail.local (longer bantime, maxretry 3)
4. 🟡 Add nginx default catch-all vhost + `server_tokens off` + rate limits
5. 🟡 Run non-root containers (cap_drop)
6. 🟡 4 pending apt upgrades — let unattended-upgrades run / verify

*Audit performed read-only; nothing was changed on the host without approval.*