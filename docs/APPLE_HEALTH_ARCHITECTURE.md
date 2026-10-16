# Apple Health integration: V1 checkpoint

Status: design + local migration only. No remote migration or production write authorized.

## Audit (2026-10-16)

Fresh clone of `xinliaouk-code/cycleworth`, main `68fb5b7a42a8f8a082f6c94f69509b5efb6a6f3a`.
No CycleWorth checkout was found under the Mac's Developer/worktrees directories.
MSI Claw unpushed changes cannot be inspected here; no missing business logic is invented.
The repository references `.env.example` in its safety script but does not track that
file. A blank template is restored. `npm run supabase` is also absent; add a safe
verification alias. `docs/shared-supabase.md` is historical and conflicts with the
current README/MIGRATION_NOTES; the dedicated project boundary takes precedence.

Next 16.3 / React 19.2, Supabase publishable-key clients, Vercel. Five owner-RLS
tables in `personal_cycleworth`. Rides use metres, integer seconds, UTC timestamptz,
metres/second, kcal and encoded Google polyline (precision 5). Dashboard, maps,
TfL savings and maintenance all consume this same table. Commute classification
uses Europe/London and local station lookup; dashboard rules currently live in
browser localStorage, so background sync needs an explicit persisted copy.

Strava retains OAuth, callback/exchange, sync, numeric IDs and manual overrides.
Its incremental watermark currently includes every ride and its fallback matches
name/time; both must be restricted to Strava rows when introducing another source.
Existing nearest-station matching has no maximum radius; Apple Health must avoid
classifying rides outside London as a London commute. Missing GPS must never earn
an automatic fare saving. Existing maintenance counts all rides, including indoor
distance; preserve this behavior and identify indoor rides as VirtualRide.

## Source contract

Add `source` and `external_activity_id`; backfill existing non-null Strava IDs as
text without changing the original ID. Unknown legacy rows use `legacy`, without
inventing external IDs. Unique `(user_id, source, external_activity_id)` protects
per-user idempotence. Add end timestamp, original numeric timezone offset, and
minimal provenance metadata. No raw health metrics or complete JSON are retained.
UTC instants drive matching; original offset remains available for review.

Health Auto Export V2 requires id/name/start/end/duration; distance and route are
optional. Accept documented `data.workouts` plus explicit `workouts` envelope.
Require stable IDs; never invent a timestamp-derived ID. Missing distance imports
as zero with warning, unsupported units fail, malformed GPS is discarded with
warning. Duration is active seconds; elapsed time comes from end minus start.
Route points become the same polyline consumed by RideMap.

## Import and authentication boundaries

Preview is read-only and the default. Same-source IDs are existing, never updated,
so manual decisions survive every retry. Close time/distance matches are held as
suspected duplicates and excluded from totals, never auto-linked/deleted/overwritten.
Classification and map utilities are pure and independent of Strava API/OAuth.

V3 will use a random 256-bit dedicated credential, hash-only storage, atomic
rotation/revocation and narrowly scoped database functions. No privileged runtime
key is introduced. Session operations remain owner-RLS; token operations resolve
the owner from the credential inside PostgreSQL. No request-supplied user ID is used.
Every HTTP write requires its own server environment gate; deploy the gates disabled first.
The final V3 integration prepares a separately gated and explicitly confirmed
historical-write flow, while retaining preview-only defaults.

## Sources

- https://help.healthyapps.dev/en/health-auto-export/export-format/workouts/
- https://help.healthyapps.dev/en/health-auto-export/export-format/
- https://help.healthyapps.dev/en/health-auto-export/automations/rest-api/
- https://supabase.com/docs/guides/database/postgres/row-level-security

## Acceptance gates

V1: additive migration + fixture + local RLS/uniqueness checks, independent commit.
V2: parser/route/dry-run/idempotence/overlap/manual-override checks, independent commit.
V3: credentials/API/isolation/limits + local UI/build, independent commit.
Final: READY FOR REAL-DATA REVIEW. Actual iPhone, authenticated production flows,
remote schema, historical import and production deployment remain unverified and
require the user's follow-up approval. Local fixture verification is not device acceptance.

## V1 local validation

Original tests: 7/7 pass. New local PostgreSQL schema/RLS test: pass.
`npm run lint`: 0 errors, 13 existing warnings. `npx tsc --noEmit`: pass.
`npm run build`: pass with placeholder config (not live Supabase validation).
`npm run supabase`: pass. Strict remote target check: correctly fails with no
local CLI link; no link was invented and no remote command was run.
Dependency audit of the existing lockfile reports 10 vulnerabilities (9 high,
1 critical, including Next). Dependency remediation requires separate review
before public deployment; this task does not silently upgrade the framework.
