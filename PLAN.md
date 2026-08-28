# Web UI — Action Plan (issue #6)

Status: approved direction, 2026-08-17. Owner of direction: Matteo. Execution: Lindsey.
Scope: a web UI for cmangos-docker, per issue #6, built into this repo as a new workspace under `web-ui/`, branch `feature/web-ui`.

## Landscape (what exists, what we take from it)

| Project | Stack | License | Use for us |
|---|---|---|---|
| FusionGEN | PHP (CodeIgniter) | AGPL-3.0 | Admin-side feature reference (user mgmt, bans, GM levels, SOAP flows). Read for logic, never copy. |
| WoW-CMS/BlizzCMS | PHP (CodeIgniter 3) | MIT | Secondary CMS reference; last push 2024-12. |
| celguar/cmangos-website | PHP | CC BY-NC-ND 4.0 | Visual/flow reference ONLY. License forbids reuse — do not copy code or assets. |
| celguar/spp-classics web server | closed repack | — | Ambition benchmark (armory, live map, AH, account creation). Not integrable. |
| masterking32/WoWSimpleRegistration | PHP | GPL-3.0 | User-side reference: register, change password, online players. Explicit CMaNGOS support, maintained (2026-04). |
| jimmybrancaccio/cmangos-starter-website | PHP | — | Minimal SRP6 register/login flow. |
| killerwife/cmangos-cms | .NET 8 API + Next.js 14 | — | Structural reference: modern non-PHP stack, registration, account mgmt, 2FA w/ QR, docker-compose. Core-dev endorsed direction. |

## Architecture (decided)

- **Nuxt 4.5.2** (exact pin; includes CVE-2026-71318 fix) in `web-ui/`. One artifact, TS end-to-end.
- **BFF pattern**: all privileged access lives in `server/`. Frontend never talks to MariaDB or mangosd directly. Credentials only in server runtime config (env).
- **No pass-through endpoints.** Every server route validates input, authorizes the session, exposes a minimal explicit surface.
- **Core adapter per expansion**: selected by config (`NUXT_CMANGOS_CORE`). Update 2026-08-24: current CMaNGOS master uses SRP6 (v/s) on ALL THREE cores — wotlk realmd's AuthSocket queries v,s,token and its SRP6.cpp is identical to tbc's. sha_pass_hash only matters for older/legacy deployments; keep the adapter seam, but all three expansions default to SRP6v2. All three expansions targeted from day one; the rest of the code never branches on expansion.
- **DB access**: query builder only (Drizzle or Kysely — decide at scaffold time; lean Drizzle). **No migrations, ever** — schema is owned by CMaNGOS. Dedicated least-privilege DB user for the web service: `SELECT` broadly, `INSERT/UPDATE` only on the auth `account` table.
- **SOAP** (mangosd) is the channel for every mutating admin op (ban, password reset as admin, shutdown with in-game warning). Hard dependency on **issue #27** (build flag, exposed port, env credentials). v1 works without it; admin features land after #27.
- **Auth/session**: the game's own account *is* the identity. Login = recompute verifier from submitted password, compare with stored `v` (adapter-specific). Session: signed httpOnly cookie (Nuxt session utils), no JWT needed v1.
- **Style**: BlizzLike, recreated in modern CSS. No Blizzard assets — typography/textures/icons redrawn or free equivalents. Style cues harvested from existing BlizzLike projects' CSS/templates (readable text), per Matteo's direction.

## Deliberately postponed

Persistence of our own (password-reset tokens, 2FA TOTP secrets). Options: tiny own table (sqlite or a `web` schema) vs admin-mediated reset via SOAP. Decision when we hit the feature — Matteo's call.

## Build order

**Phase 0 — ground (this session)**
1. Comment on issue #6: landscape + foundations + decisions (the public record of this plan).
2. Scaffold `web-ui/` manually (nuxi fails on this box): package.json `@byloth/cmangos-docker-web-ui`, nuxt.config.ts, app.vue shell, `server/api/health.get.ts` → `{ status: "ok" }`, .gitignore. Pin nuxt `4.5.2`. `bun install`, verify dev boot + build.
3. SRP6 spike: `server/utils/srp6.ts` — `generateSalt()`, `generateVerifier(username, password, salt)` in BigInt with CMaNGOS quirks (reversed salt, little-endian export, uppercase username; N=894B…9BB7, g=7). `bun test` against a known vector.

**Phase 1 — user side, read-mostly**
4. Runtime config + env contract (`.env.example` additions): DB host/user/pass, core type, session secret.
5. DB layer: Drizzle schema descriptors for `realmd.account` (and per-expansion db names), least-privilege client.
6. `POST /api/auth/register` — adapter computes salt/verifier (or HEX), INSERT into account. Validation, duplicate-username handling.
7. `POST /api/auth/login`, `POST /api/auth/logout`, session cookie.
8. `GET /api/server/status` — realm online flag + online player count (read-only queries).
9. Frontend: BlizzLike shell (layout, palette, borders/typography), register + login + a server-status landing.

**Phase 2 — user self-service**
10. `POST /api/account/change-password` (recompute verifier, UPDATE).
11. Account info page (email/expansion edits where the schema allows).
12. Delete account (decide: real DELETE vs flag — check what CMaNGOS tolerates; likely admin-confirmed).

**Phase 3 — admin (blocked on #27)**
13. SOAP client util (env credentials, command whitelist).
14. Admin endpoints + role gate (GM level from account): user list, ban/unban, reset user password, realm stats, graceful shutdown with in-game warning.

**Phase 4 — packaging**
15. Dockerfile for web-ui + compose service (own profile, e.g. `web`), least-privilege DB user provisioning in `database/`, docs page in the VitePress suite (after PR #43 merges — coordinate to avoid conflicts).

## Open questions (for Matteo, when relevant)
- Phase 2 delete-account semantics.
- Persistence decision (reset tokens / 2FA) — at that point.
- Whether the web UI ships in the default compose profile or stays opt-in.

## Progress log

### 2026-08-24 — Phase 1, session 1 (findings, no code yet)
- Env: this box has bun 1.3.14 + node 24, NO docker, no mysql client → live-DB integration tests impossible here; unit tests only. Endpoint runtime behavior against real MariaDB will be UNTESTED until homelab — must be stated in PR/report.
- DB names (from Dockerfile): `<expansion>realmd`, `<expansion>mangos`, `<expansion>characters`, `<expansion>logs` (e.g. `tbcrealmd`).
- `account` DDL fetched from cmangos master (classic/tbc/wotlk — byte-identical): id, username(32) UNIQUE, gmlevel, sessionkey longtext, v longtext, s longtext, email text, joindate, lockedIp, failed_logins, locked, last_module, module_day, active_realm_id, expansion, mutetime, locale, os, platform, token, flags. No sha_pass_hash / last_ip / last_login columns.
- SRP6 verifier algorithm cross-checked vs src/shared/Auth/SRP6.cpp (wotlk+tbc identical): x = sha1(LE_bytes(salt) || sha1(USER:PASS)) read as big-endian int; v = g^x mod N. Matches server/utils/srp6.ts on x and v.
- OPEN (next step, blocks register/login): how v is serialized for DB storage. SRP6 stores via BigNumber::AsHexStr (big-endian, unpadded) but srp6.ts currently returns reversed (little-endian) hex — likely wrong. Account creation lives in mangosd (account create console cmd / AccountMgr), NOT realmd: grep cmangos/mangos-tbc src/game for INSERT INTO account + AsHexStr. Fix srp6.ts + tests first.
- Decision: this docs commit stays local until the first code batch joins it (push coherent batches — he wants visibility, not noise).

### 2026-08-24 — Phase 1, session 2 (SRP6 serialization fixed, committed as f025d09)
- RESOLVED the open question from session 1: `AccountMgr::CreateAccount` stores `BN_bn2hex(v)` / `BN_bn2hex(s)` — big-endian, UPPERCASE, unpadded. realmd parses with `BN_hex2bn` (case/padding-insensitive). Session-1 suspicion confirmed: little-endian reversed hex (the Phase 0 spike's form) would have produced accounts no retail client could log into.
- `srp6.ts` rewritten and committed (f025d09): salt emitted as 64-char uppercase hex; verifier as big-endian uppercase unpadded hex (length may be < 64 chars — matches the core). Header comment documents the full verified data flow with source file references.
- x computation confirmed unchanged and correct: `sha1(LE(salt) || LE(sha1(USER:PASS)))` read as big-endian int.
- Known vector: ADMIN/ADMIN, salt AABB…CCDD → `28AE3C33E905D329A887D26E844AFDE10687C9E283940127D3E1A97A3DD157BB`, computed independently with Python hashlib/pow. 7 bun tests pass.
- Cross-check vs WoWSimpleRegistration (server_core 5 = CMaNGOS): its cmangos branch (strrev'd LE output) targets Trinity-era schemas with binary/bytea fields; for CMaNGOS's longtext v/s parsed by BN_hex2bn, big-endian hex is the interoperable form — same conclusion as from the C++ source. Noted in passing, not a dependency.
- WoW registration flows (from WoWSimpleRegistration user.php, user-side reference for the register endpoint): username `[0-9A-Z-_]+`, 2–16 chars; password 4–16; email required + validated; duplicate username/email rejected before insert; INSERT carries username, v, s, email, expansion.
- Branch state: 2 local commits ahead of fork (1f04704 docs, f025d09 srp6 fix). NOT pushed yet — waiting for a coherent batch (runtime config + Drizzle at minimum).
- Next: runtime config + .env.example → Drizzle schema (drizzle-orm + mysql2) → auth adapter seam → register/login/logout/me → server status → BlizzLike shell.

### 2026-08-26 — Phase 1, session 3 (auth adapter + validation, committed as 8a07b33)
- Built auth adapter (`server/utils/auth.ts`): SRP6a-only, createCredentials + verifyCredentials, BN_hex2bn-tolerant comparison (BigInt parse, case/padding agnostic), legacy sha_pass_hash seam documented but NOT supported. Adapter selection is `getAuthAdapter(core)` but currently returns srp6a for all three cores — verified 2026-08-24 that all current CMaNGOS master (classic/tbc/wotlk) use SRP6.
- Built registration validation (`server/utils/validation.ts`): username `[0-9A-Z_-]{2,16}`, password 4–16, email required + simple regex. Uppercases username on validation (CMaNGOS stores uppercase). Returns structured result type, reports all field errors at once, non-string inputs handled safely.
- 13 new tests across auth.test.ts (6) and validation.test.ts (7). All 49 tests pass (4 suites: srp6, config, auth, validation).
- Branch state: 6 local commits ahead of fork. NOT pushed yet — still accumulating a coherent Phase 1 batch.
- Next: POST /api/auth/register endpoint (Drizzle INSERT into realmd.account), then login/logout/me cookie session, then GET /api/server/status, then BlizzLike shell.

### 2026-08-27 — Phase 1, session 4 (auth endpoints + session plumbing, committed as a3c6bc9)
- Built and committed four auth endpoints under `server/api/auth/`:
  - `register.post.ts`: validates input, checks duplicate username via Drizzle SELECT, computes SRP6 credentials, INSERTs into realmd.account, returns 201 + {id, username, email}
  - `login.post.ts`: verifies SRP6 v against submitted password, rejects locked accounts, opens sealed-cookie session via h3 useSession
  - `logout.post.ts`: clears session cookie
  - `me.get.ts`: returns session identity without DB read
- Built `server/utils/session.ts`: thin wrapper over h3 useSession with runtime-config-driven password (min 32 chars), maxAge, httpOnly, SameSite=Lax, secure opt-in. Auto-imported in Nitro handlers.
- Schema fix: joindate documented as DB-owned default, removed `.defaultNow()` drift that could conflict with MariaDB.
- Type safety: added `bun-types` devDependency, `tsconfig.json` files, defensive copy in srp6.ts before `crypto.subtle.digest` (SharedArrayBuffer guard), test type annotations tightened.
- All 49 tests pass. Build completes (3.62 MB, 1.03 MB gzip).
- Branch state: 8 commits ahead of fork. Pushed.
- Remaining Phase 1: GET /api/server/status (realm online flag + player count), BlizzLike shell (layout, palette, borders/typography). These are the last two items before Phase 1 is complete.

### 2026-08-28 — Phase 1, session 5 (GET /api/server/status, committed as 3b8f349)
- Built `server/api/server/status.get.ts`: realm online = NOT(realmflags & 0x2) AND uptime row fresh. Freshness = latest `uptime` row for the realm, age(now − starttime) ≤ UpdateUptimeInterval(10min)×60 + 60s buffer (src/game/World/World.cpp). Online count = count(characters where online=1) in `<core>characters`. Response: `{realm:{name,online,onlineCount,maxPlayers}, details:{flaggedOffline,staleUptime}}`; 404 when realmlist is empty.
- Decisions taken (mine, listed for the report): single-realm assumption — first `realmlist` row (CMaNGOS docker stack runs one realm); staleness threshold fixed at 10min+60s rather than reading UpdateUptimeInterval from config; `details` block exposes the two offline sources separately so the frontend can say WHY it's down.
- Phase 1 backend is now functionally complete: config, Drizzle layer, SRP6 adapter, register/login/logout/me, status. Remaining Phase 1: BlizzLike frontend shell (item 9).
- Known issues, NOT blocking, to fix in the shell session or a cleanup commit: (a) vue-tsc TS2769 in register.post.ts — after removing `.defaultNow()`, Drizzle's insert type demands `joindate`; add `joindate: sql\`NOW()\`` or a typing workaround (build/nitro is green, tests green — type-only); (b) root vue-tsc run can't resolve `bun:test` imports in test files (bun test itself passes — tsconfig types config issue).
- Branch state: 9 commits ahead of fork, pushed this session + PR #44 updated. Live-MariaDB integration remains UNTESTED (no docker/mysql on this box) — stated in the PR.
