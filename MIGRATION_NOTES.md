# CycleWorth Supabase separation notes

Status as of 2026-08-27: repository preparation is in progress. The dedicated CycleWorth Supabase project has not yet been created or identified, so no remote migration, Auth setting, or production environment change has been made.

## Safety boundary

- Legacy shared project: `Personal Projects`, ref `rmckneoiqdxgarwitepo`. It is out of scope and must remain unchanged.
- The current local CLI metadata still points at that legacy ref. This is intentionally treated as a stop condition for remote commands.
- Do not stage `supabase/.temp/`; it is local link state and currently identifies the legacy project.
- The exact dedicated project name, ref, URL, and healthy status must be verified before `supabase link` or `supabase db push`.

## Repository state

- Active baseline: `supabase/migrations/202608270001_cycleworth_isolated_baseline.sql`.
- Preserved historical migrations: `supabase/legacy-migrations/202608230001_personal_cycleworth.sql` and `supabase/legacy-migrations/202608240001_drop_legacy_public_cycleworth.sql`.
- Application schema: `personal_cycleworth`.
- Tables: `settings`, `strava_connections`, `rides`, `bike_maintenance_tasks`, and `bike_maintenance_history`.
- All application tables have owner-scoped RLS policies; anonymous table access is revoked. The baseline contains no legacy `public.*` table operations and no destructive statements.

## Key and deployment model

Runtime code now uses `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. No Supabase secret/service-role key is required for the current routes: the server verifies the user token and creates a user-scoped client with the publishable key and `personal_cycleworth` schema. The existing Vercel project is `cycleworth` at `https://cycleworth.vercel.app`; its environment values have not been changed as part of this repository preparation.

After the dedicated project is verified, update Vercel Production with its URL and publishable key, redeploy, and retain the old deployment until login, RLS ownership, and Strava reconnect/sync are accepted. Configure Supabase Site URL and Redirect URLs for the exact production URL and localhost callback used by the app; those Dashboard actions are manual and must be performed only on the dedicated project.

## Validation and rollback

Run `npm run supabase:verify -- --require-dedicated-target` before any remote command, then push the active baseline to the verified dedicated project and run `supabase/tests/validation.sql` there. Authenticated login and Strava tests require a user-controlled browser session and must not use credentials or tokens supplied in chat. If acceptance fails, leave the old deployment and old environment available, correct the dedicated project/configuration, and repeat validation; do not modify or delete anything in the legacy project.
