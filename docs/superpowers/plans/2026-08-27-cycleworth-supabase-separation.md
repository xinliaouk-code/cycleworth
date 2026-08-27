# CycleWorth Supabase Separation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move CycleWorth from the shared Supabase project to a dedicated project while preserving the `personal_cycleworth` schema, authenticated RLS, Strava ownership checks, and the existing Vercel project.

**Architecture:** CycleWorth remains one independent GitHub repository, one Vercel project, and one dedicated Supabase project. The new Supabase project keeps the application-owned `personal_cycleworth` schema and the five existing tables; browser and user-scoped server clients use the new `sb_publishable_...` key with the user's JWT, so RLS remains the data boundary. No service/secret key is required by the current application because Strava routes already verify the session and use the authenticated user's token.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5, `@supabase/supabase-js`, Supabase CLI/Postgres/RLS, Strava OAuth/Web API, Vercel, Node test runner, ESLint, Webpack production build.

## Global Constraints

- `1 independent app = 1 GitHub repository = 1 Vercel project = 1 dedicated Supabase project`.
- The legacy shared Supabase project `Personal Projects` / ref `rmckneoiqdxgarwitepo` is read-only and must not receive `db push`, reset, destructive SQL, Auth changes, RLS changes, Storage changes, or deletion.
- The new target name, ref, URL, and health status must be independently verified before any database-changing command; never infer the target from a stale local link.
- Use `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for browser-safe and authenticated user-scoped clients; do not request, print, commit, or copy key values.
- Do not add `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY` unless a concrete privileged server operation is introduced and separately reviewed; current Strava writes use verified user access tokens plus RLS.
- Keep the existing Vercel project and stable URL `https://cycleworth.vercel.app`; do not remove old environment variables until the dedicated project passes Auth, CRUD, RLS, Strava, and production acceptance.
- Preserve the historical migrations byte-for-byte under `supabase/legacy-migrations/`; the active migration directory must contain only a safe dedicated-project baseline.
- Keep `supabase/.temp/` untracked and never stage it; it may point to the legacy project until a verified new target is available.

---

### Task 1: Audit and migrate the repository to the publishable-key model

**Files:**
- Modify: `src/lib/supabase.ts`
- Modify: `src/lib/auth.ts`
- Test: `src/lib/auth.test.mjs`
- Modify: `.env.example`
- Modify: `package.json`
- Create: `scripts/verify-supabase-isolation.mjs`
- Modify: `README.md`
- Create: `MIGRATION_NOTES.md`

**Interfaces:**
- Consumes: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, the `personal_cycleworth` schema, and the current user access token.
- Produces: browser and user-scoped server clients with no legacy anonymous/service-role key dependency, plus an executable isolation scan.

- [x] **Step 1: Add a failing key-name assertion.** Extend `src/lib/auth.test.mjs` so the injected client factory receives the publishable key while preserving the schema and `Authorization: Bearer <accessToken>` header; add a test that the removed anonymous-key name alone is not used.
- [x] **Step 2: Run the focused test and verify the expected failure.** Use the repository's Node test command with TypeScript stripping; the failure must show that `src/lib/auth.ts` still reads `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- [x] **Step 3: Rename runtime references.** Update `src/lib/supabase.ts` and both clients in `src/lib/auth.ts` to read `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; retain the placeholder fallback only for safe unconfigured builds and keep the authenticated access-token header unchanged.
- [x] **Step 4: Update the environment contract and docs.** Replace old names in `.env.example`, document the dedicated target as an explicit user input, state that `SUPABASE_SECRET_KEY` is not currently required, and describe the legacy project as read-only.
- [x] **Step 5: Add the static isolation scan.** Scan active SQL for destructive table/schema/data operations and scan `src` for legacy key names, service-role references, and obsolete public-table queries; require publishable-key references in both Supabase client modules and verify `personal_cycleworth` remains configured.
- [x] **Step 6: Run focused tests and the isolation scan.** Confirm the new client contract, schema boundary, and source scan pass before touching any Supabase remote.

### Task 2: Replace historical active migrations with a safe dedicated baseline

**Files:**
- Archive: `supabase/legacy-migrations/202608230001_personal_cycleworth.sql`
- Archive: `supabase/legacy-migrations/202608240001_drop_legacy_public_cycleworth.sql`
- Create: `supabase/migrations/202608270001_cycleworth_isolated_baseline.sql`
- Create: `supabase/tests/validation.sql`
- Modify: `supabase/config.toml`
- Modify: `MIGRATION_NOTES.md`

**Interfaces:**
- Consumes: the existing five-table `personal_cycleworth` schema and its owner-only RLS contract.
- Produces: one active additive baseline for a clean dedicated project, with the legacy public-table cleanup retained only as audit history.

- [x] **Step 1: Preserve the old migration files byte-for-byte.** Move both existing migration files into `supabase/legacy-migrations/` and verify their content matches the last committed blobs; do not run the legacy cleanup SQL.
- [x] **Step 2: Create the active baseline.** Reproduce only the application schema, five tables, indexes, timestamp trigger function, owner policies, authenticated grants, and RLS from the existing schema migration; omit all `public.*` drops and unrelated objects.
- [x] **Step 3: Add read-only validation assertions.** Check schema/table existence, primary and foreign keys to `auth.users`, indexes and uniqueness, timestamp trigger, RLS and owner policies, authenticated grants, and absence of legacy CycleWorth tables in `public`.
- [x] **Step 4: Add migration-safety coverage.** Ensure the isolation script recognizes the baseline as non-destructive and rejects reintroducing `drop table`, `truncate`, `delete from`, or unrelated public-table operations.
- [x] **Step 5: Verify repository migration state without a remote push.** Run the isolation scan, SQL/text checks, and legacy-file comparison; leave `.temp` linked to the legacy project and unmodified remotely.

### Task 3: Verify and initialize the exact dedicated Supabase project

**Files:**
- Verify only: `supabase/.temp/project-ref`
- Verify only: `supabase/.temp/linked-project.json`
- Apply only after identity verification: `supabase/migrations/202608270001_cycleworth_isolated_baseline.sql`
- Validate: `supabase/tests/validation.sql`
- Modify: `MIGRATION_NOTES.md`

**Interfaces:**
- Consumes: an explicit user-created dedicated project identity: name, exact ref, canonical URL, and healthy status.
- Produces: local link metadata pointing only to that target, one applied baseline, matching local/remote migration history, and read-only schema evidence.

- [x] **Step 1: Stop at the missing target identity.** Do not run `supabase link`, `db push`, or `db query` against the current legacy ref; require the exact new project identity before proceeding.
- [x] **Step 2: Independently verify the new project.** Use non-secret project metadata to match its name, ref, URL, and `ACTIVE_HEALTHY` status; reject any mismatch or ambiguity.
- [x] **Step 3: Link only the verified ref and dry-run the baseline.** Confirm `.temp/project-ref` and `linked-project.json` match before a push; ensure the dry run lists only `202608270001_cycleworth_isolated_baseline.sql`.
- [x] **Step 4: Apply only the active baseline.** Run `supabase db push --linked` with the explicit new ref; never run reset, legacy migrations, or a full shared-project dump.
- [x] **Step 5: Validate the new project read-only.** Run `supabase/tests/validation.sql` and migration-list checks against the explicit new ref, recording only object/status assertions and no user data or credentials.

### Task 4: Configure isolated Auth, Strava, and Vercel behavior

**Files:**
- Inspect: `src/app/login/page.tsx`
- Inspect: `src/app/dashboard/page.tsx`
- Inspect: `src/app/api/strava/callback/route.ts`
- Inspect: `src/app/api/strava/exchange/route.ts`
- Inspect: `src/app/api/strava/sync/route.ts`
- Inspect: `.vercel/project.json` and Vercel variable names only
- Modify: `README.md`
- Modify: `MIGRATION_NOTES.md`

**Interfaces:**
- Consumes: the dedicated Supabase URL/publishable key, the current `personal_cycleworth` schema, the existing Strava callback origin, and user-controlled Auth/Strava accounts.
- Produces: verified email/password behavior, owner-scoped CRUD/RLS, Strava exchange/sync ownership, and a Vercel production deployment only after required environment values are securely configured.

- [x] **Step 1: Confirm Auth callback behavior.** Determine whether the current Auth UI uses the default site URL/implicit callback or needs an explicit callback route; document the exact dedicated-project Site URL and redirect allowlist without changing the legacy project.
- [x] **Step 2: Audit the Vercel project identity and variable names.** Confirm project `cycleworth` and stable URL `https://cycleworth.vercel.app`; inspect names only, never values.
- [ ] **Step 3: Configure user-controlled variables.** Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for required Vercel environments; retain existing legacy variables during acceptance; keep Strava secrets server-only and do not add a Supabase secret key.
- [ ] **Step 4: Test dedicated Auth and data paths.** With a fresh user-controlled account, test login/session/logout, settings and rides CRUD, two-user RLS isolation, export behavior, and unauthenticated blocking; never record passwords or tokens.
- [ ] **Step 5: Test Strava only with user-controlled login.** Exercise OAuth exchange, connection persistence, preview/import/sync, disconnect preservation, and private-library/error behavior; mark the work pending if the user must complete an interactive login.
- [ ] **Step 6: Deploy only the verified commit.** Push `main` after repository checks and required environment values are confirmed; wait for the GameLog-independent CycleWorth Vercel deployment and verify the stable URL without claiming authenticated success from public HTTP alone.

### Task 5: Complete security, mobile, and delivery gates

**Files:**
- Inspect: all `src`, `supabase`, config, and generated output
- Test: the repository's configured Node test command
- Verify: `npm run typecheck` if added, `npm run lint`, and `npm run build`
- Modify: `MIGRATION_NOTES.md`

**Interfaces:**
- Consumes: the publishable-key client migration, safe baseline, verified dedicated project, and user-controlled acceptance sessions.
- Produces: evidence-backed status for secrets, schema/RLS, Auth, Strava, 393 × 852 UI, production deployment, commit, and push.

- [x] **Step 1: Scan for old refs and key names.** Allow legacy references only in archived migration notes/history; require zero old key or service-role references in runtime source and zero secret-shaped values.
- [x] **Step 2: Confirm no privileged key reaches browser or output.** Inspect source/build metadata without displaying environment values; document that the secret key is unnecessary unless architecture changes.
- [x] **Step 3: Run all repository checks serially.** Run tests, production build, typecheck after build generation, lint, and isolation scan; record exact counts and exit statuses.
- [ ] **Step 4: Run live Auth/RLS/CRUD/Strava checks only after target and environment gates pass.** Keep real-account actions user-controlled and do not expose personal data.
- [ ] **Step 5: Inspect mobile screens at 393 × 852.** Check login, dashboard, settings, maintenance, sync/error states, safe areas, overflow, clipping, long titles, and navigation collisions; record screenshots only without credentials.
- [ ] **Step 6: Fetch latest `origin/main`, commit reviewed changes directly to `main`, push only after acceptance, and verify the remote commit and production deployment.** Never use force push or modify the legacy project.

## Spec Coverage Review

- Dedicated app/project separation and legacy boundary: Global Constraints and Tasks 2–3.
- New publishable/secret key model: Task 1 and Task 4.
- Existing `personal_cycleworth` schema, RLS, and Strava ownership: Task 2 and Task 4.
- Auth, Vercel, live CRUD/RLS, Strava, mobile, and deployment gates: Tasks 4–5.
- No credential exposure and no legacy destructive action: every task and `MIGRATION_NOTES.md`.
