# V2 history import checkpoint

Open `/settings/health` from Settings → Account → Apple Health.
Choose a Health Auto Export Workout JSON V2 file (max 4 MiB / 100 workouts).
The browser first checks format locally and previews up to three GPS routes.
This step has **not** queried existing rides. Sign in and choose **Database dry
run** to query existing rides through the owner-scoped preview API.

Preview categories: new, exists, suspected_duplicate, failed, skipped. An item can
carry nonfatal warnings, e.g. missing distance or GPS. `batch:N` in a duplicate
candidate refers to the zero-based item index in this batch. GPS routes are sampled
to at most 5000 points for the existing precision-5 map; original full routes are
not retained. Export route data again if a detailed archival route is required.

At the V2 checkpoint, the history HTTP endpoint was preview-only and rejected
`dry_run:false`. The final V3 integration adds a separately gated, explicitly
confirmed write flow (see below). The shared database importer supports local
tests and automatic sync. No historical production import was executed; enabling
the historical-write flow requires separate approval.

Missing distance becomes zero with an explicit warning; unsupported units fail.
Missing GPS, indoor routes and endpoints over 3 km from a known London station
are conservatively classified as leisure. Users can apply the same existing
manual classification controls after an approved import. Good GPS rides reuse
Europe/London commute rules and existing TfL savings. Maintenance uses metres
from the same rides table; there is no separate Health statistics store.

Idempotence uses `(user_id, source, external_activity_id)` and insert-only logic.
A nearby start (within 5 minutes) plus distance tolerance (15% or 500 m) creates a
candidate; absent distance uses elapsed duration tolerance (20% or 120 seconds).
Candidates are withheld, even when both records come from Health with different
IDs. This may hold two genuinely distinct nearby rides; human review is required.
Existing Strava IDs, routes and manual decisions are never rewritten by Health.

Local acceptance: 15 tests pass, including real PostgreSQL execution via PGlite,
RLS ownership, unit/time/route validation, dry run, repeat file/batch, candidate
holding and manual-override preservation. Lint: 0 errors / 13 existing warnings.
TypeScript, production build and isolation scan pass. Real Supabase Auth/Data API
and real iPhone exports are not covered by this local evidence.

## V3 integration extension

The final V3 code prepares a separately gated history-write path. The default
remains preview-only. After explicit historical-import approval, the operator must
enable `APPLE_HEALTH_HISTORY_WRITES_ENABLED=true`; the UI then requires a fresh
database preview, confirmation checkbox and import button. The API also requires
`X-CycleWorth-Confirm-History: import-new-only` and a verified Supabase session.
This gate is independent of the automatic-sync write switch. Only local fixture
data was written by automated tests; no production history was imported.
