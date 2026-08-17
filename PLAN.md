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
- **Core adapter per expansion**: `classic`/`tbc` (SRP6v2 with CMaNGOS quirks) vs `wotlk` (sha_pass_hash HEX). Selected by config (`NUXT_CMANGOS_CORE`). All three expansions targeted from day one; the rest of the code never branches on expansion.
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
