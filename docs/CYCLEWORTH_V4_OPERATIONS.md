# CycleWorth V4 operations

## Architecture and identity

Next.js route handlers validate a Managed Better Auth session. Only verified emails may resolve an application identity. `app_users.id` remains the old UUID for imported users; `legacy_user_id` records that UUID, and `neon_auth_id` links the verified Neon identity. Two different Neon accounts cannot replace an existing mapping. The browser uses a small allowlisted `/api/data` protocol, never a database credential or client-chosen SQL. Server operations set transaction-local owner scope and use RLS. Maintenance history also has a composite owner/task foreign key.

The runtime login `cycleworth_app` only inherits `cw_runtime`, `cw_user` and `cw_sync`. It cannot directly read identity tables or bypass RLS. The migration owner connection is separate and is never deployed. Sync secrets are random 256-bit values; only SHA-256 hashes are stored. Token functions bind writes to the credential owner and serialize imports per owner. Legacy rides are never deleted. Similar activities are held for review, so they cannot double count.

Neon project: `falling-sound-48715113`, name CycleWorth, Free organization, AWS London, PostgreSQL 17. Validation: `br-royal-waterfall-zanv71f0`, parent main `br-little-smoke-za0kxi8g`. Managed Better Auth enabled on validation; default Google provider removed. No other Neon project is modified.

## Schema and migration

Run `npm run neon:migrate` with the private local environment. The target guard permits only the known validation project/branch/database/direct endpoint. Applied migrations are SHA-256 tracked, transactional and repeatable. `scripts/provision-runtime.mjs` creates the least-privilege validation login once.

The source is currently **BLOCKED / INACTIVE**. No real rows have been exported or copied. When it is available, configure a private `SUPABASE_SOURCE_DATABASE_URL` for exactly `db.qmegopdnnkfrnhtohvhe.supabase.co/postgres`. Set a separate random 32-byte hex `MIGRATION_BACKUP_KEY`, stored securely apart from the backup. Export/import:

```sh
node --env-file=.env.local scripts/migration/run.mjs export /absolute/private/backup.cwv4
node --env-file=.env.local scripts/migration/run.mjs import /absolute/private/backup.cwv4
```

Export is a repeatable-read, read-only transaction. It extracts only verified user identity fields and the six application data/sync tables. It never reads passwords, sessions or Strava connection tokens. Backups use AES-256-GCM, exclusive creation and mode 0600. Retry export with a new filename; never overwrite an earlier backup. Import preserves IDs and fields, records identity mapping, detects unknown columns/owners, and compares every migrated field. Any mismatch aborts the entire transaction. A repeated identical import is safe; changed conflicting source data stops for review instead of overwriting user changes.

Reconcile row/ID/field manifests, GPS polylines, distances/times/elevation, manual classifications, fare settings, maintenance odometers, sync configuration, and all calculated totals. Synthetic evidence proves the mechanism only. Backups must remain outside Git.

## Before production approval

1. Restore source and complete real encrypted export, import and reconciliation. Keep the source untouched.
2. Complete the morning acceptance document, mailbox/password reset, session restoration and iPhone repeats.
3. Review SMTP configuration: shared Neon SMTP is a development facility; follow the current Neon production checklist before cutover.
4. Create a production Neon branch and identity plan from the accepted data. Update target guards explicitly for that reviewed destination; do not point a production app at the synthetic validation database.
5. Register the production trusted origin. Record the old Vercel deployment and environment securely. Keep old Supabase and synchronization credentials valid for rollback.
6. **Request approval.** Only then update Production variables, stage/build the exact reviewed V4 commit, verify login/data ownership, and promote to `cycleworth.vercel.app`.

## Rollback

Before any writes, rolling back means selecting the prior Vercel deployment and restoring its old environment. Leave Neon intact for diagnosis. After new Neon-only rides exist, first export and reconcile them; blindly reverting loses their visibility. Temporarily pause new imports with the V4 write gates, reconcile the delta, then perform the approved rollback. Do not delete either database, rotate live production credentials or force-push main.

## Map-only patch

`codex/cycleworth-map-fix` is based on existing `origin/main`, independent of V4. It replaces unauthenticated CARTO placeholders with standard OpenStreetMap tiles, attribution, resize handling and a failure message. It can be reviewed and released independently; this task does not promote it to production without approval.
