# CycleWorth V4 delivery — 2026-10-17

**PARTIAL / REAL DATA MIGRATION BLOCKED. Production has not been changed.**

## Delivered candidate

Local branch `codex/cycleworth-v4` in the managed `cycleworth-v4` worktree. Phase commits: `5f216bf` baseline; `7503694` Neon auth/data; `87d06ac` encrypted migration; `349164a` Strava removal; `408866c` Health metrics/status; `85ea7b5` sync controls; `dc1dd4a` hosted QA, GPS preservation, OSM maps and Next.js upgrade. Documentation follows these commits.

The app uses server-only Neon connections, verified-email identity mapping, owner-scoped RLS, email/password auth, guarded Health import and hashed revocable credentials. It retains old source IDs and manually classified legacy rides. No real legacy data has been copied yet. UI behavior uses real optional metrics instead of fabricated maximum speed/elevation profiles.

Neon Free project `falling-sound-48715113` (CycleWorth), AWS London `aws-eu-west-2`, PostgreSQL 17. Isolated validation branch `br-royal-waterfall-zanv71f0`; main `br-little-smoke-za0kxi8g` untouched by acceptance fixtures. Managed Better Auth enabled on validation, Google provider removed. `001_v4_foundation.sql` and `002_v4_sync_results.sql` applied with checksums. The least-privilege `cycleworth_app` runtime login is distinct from the local migration owner.

Vercel `cycleworth` received encrypted variables scoped exclusively to Preview / `codex/cycleworth-v4`. No Production variables changed. CLI Git push lacks a configured GitHub credential; a branch was created through the connected GitHub API. Preview source deployment and final remote commit details will be recorded below.

## Validation evidence

- 22/22 local tests passed using actual schema migrations in PGlite: owner isolation, encrypted/retryable migration, field preservation, dedupe, manual override, route/metric parsing, invalid payloads, rate limits, credential rotation/revocation and failure status.
- 20 hosted synthetic HTTP checks passed against the isolated Neon branch, including two users, verified identity mapping, login/logout, owner isolation, import/retry/GPS/metrics and credential revocation. Fixture verification was set only for synthetic `@example.test` users; this does not prove verification email delivery.
- Reset-request API returned 200. Real mailbox delivery and completion of the reset link remain unverified.
- Browser: synthetic login restored on Settings; sync state showed one persisted ride. Desktop map loaded 6/6 visible OSM tiles; 390×844 mobile map loaded 4/4. Mobile Settings and route dialog had no horizontal overflow.
- TypeScript passed; Next.js 16.4.2 production build passed. ESLint has 0 errors / 14 warnings (details in `evidence/v4/lint.log`).
- `npm audit --omit=dev` has 0 advisories. Five high advisories remain in the development-only ESLint/fast-glob/micromatch/braces chain, without a compatible upstream fix; no forced major downgrade was applied.
- Evidence lives in `evidence/v4/`. Build and synthetic tests are not real-user or production acceptance.

## Blockers and remaining acceptance

1. Dedicated Supabase source `qmegopdnnkfrnhtohvhe` is INACTIVE. It was not restored or modified. The read-only schema attempt timed out. Real row counts, encrypted backup, migration, ownership mapping and lifetime financial/health totals cannot yet be reconciled. The forbidden shared project was not accessed.
2. Real mailbox verification/reset and real iPhone/Watch Health Auto Export batches need user acceptance. Preview protection prevents unauthenticated automation; the connector could not obtain a bypass (403). Browser access redirects to Vercel login. Do not disable protection or claim the Preview sync endpoint is device-ready.
3. Production cutover remains gated on real migration, acceptance and explicit approval. No source data deletion or live-token invalidation occurred.

## Independent map repair

The production screenshot contains CARTO's API-key-required placeholder, while the route overlay still renders. `codex/cycleworth-map-fix` is based on existing `origin/main` and changes only `src/components/RideMap.tsx` to OSM tiles, visible attribution, resize handling and an explicit tile-error state. It is independent of the V4 data/auth migration.

Map commit: `a1f0753754f8f4e7f7f52b9076c4abed4b778b88`.
Preview: https://cycleworth-c831a7u71-x-ce13.vercel.app/dashboard?demo=true — READY, protected by Vercel login.
Deployment: `dpl_2LE6RikR9p3qoiDE2ia6pq8AK3BM`.
The identical map component was visually verified locally on desktop/mobile. Production release requires the requested separate approval.

## User handoff

Follow [Morning Acceptance](CYCLEWORTH_V4_MORNING_ACCEPTANCE.md) for email, iPhone settings and expected repeats. [Operations](CYCLEWORTH_V4_OPERATIONS.md) documents encrypted export/import, target guards, cutover and rollback. Keep all passwords, backup keys, owner connections, sync tokens and protection-bypass secrets outside Git and chat.
