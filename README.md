# CycleWorth V4

Apple Health cycling history, route maps, commute savings and bike maintenance. The V4 app uses Neon Postgres and Neon Managed Better Auth with email/password. Strava login and synchronization have been removed; imported historical rides retain their source and fields.

**Status: validation candidate; real-data migration blocked.** The dedicated legacy Supabase source is paused. No real history has been copied, and production remains unchanged. See [delivery status](docs/CYCLEWORTH_V4_DELIVERY.md), [operations / cutover / rollback](docs/CYCLEWORTH_V4_OPERATIONS.md), and [morning acceptance](docs/CYCLEWORTH_V4_MORNING_ACCEPTANCE.md).

## Local development

Use Node 24 and `npm ci --legacy-peer-deps` (the Neon Auth SDK's peer constraints require this installation mode). Keep these values in an ignored `.env.local`; all are server-only:

```text
DATABASE_URL=<least-privilege pooled runtime connection>
NEON_AUTH_BASE_URL=<validation branch Managed Better Auth URL>
NEON_AUTH_COOKIE_SECRET=<random secret of at least 32 characters>
APPLE_HEALTH_WRITES_ENABLED=false
APPLE_HEALTH_HISTORY_WRITES_ENABLED=false
```

`DATABASE_URL_UNPOOLED`, `NEON_PROJECT_ID`, and `NEON_BRANCH_ID` are local migration/provisioning values only. Never deploy the owner connection. The guarded migration scripts currently permit only the isolated V4 validation branch.

```sh
npm run dev
npm test
npm run lint
npx tsc --noEmit
npm run build
```

## Apple Health

In Settings, generate a dedicated credential and configure Health Auto Export with Workouts / JSON V2 / Include Route Data / Batch Requests. Uploads support up to 100 workouts, 4 MiB and 50,000 GPS points per workout. Start with `X-CycleWorth-Dry-Run: true`. Writes require a server gate, per-credential activation and an explicit false dry-run header. Manual JSON imports use a separate gate and confirmation.

Existing source IDs are idempotent. Similar cross-source activities are held for review, preserving manually classified rides. Accepted GPS routes retain all valid points. Missing speed/elevation is displayed as unavailable. Credentials are shown once, stored only as hashes, and can be rotated or revoked.

## Data and identity

Runtime requests validate a verified Neon session, map it to a stable application UUID and use transaction-local owner scope plus PostgreSQL RLS. Verified registration with the original email can claim migrated history after migration. Old passwords and sessions do not transfer. The browser never receives database credentials.

The read-only source exporter permits only dedicated CycleWorth project `qmegopdnnkfrnhtohvhe`. It creates encrypted backups and manifests. The importer preserves IDs and every exported field, reconciles retries, and aborts conflicts. Historical `supabase/` files and older Apple Health documents are retained as reference, not V4 runtime/deployment instructions.

## Verification boundaries

Tests execute the actual Neon SQL in PGlite and cover isolation, migration, dedupe, metrics and failure state. Hosted synthetic QA checks local HTTP handlers against isolated Neon. Browser checks cover desktop/mobile viewport rendering. None substitutes for real mailbox, iPhone, historical totals or production acceptance. No production promotion is authorized by this README.
