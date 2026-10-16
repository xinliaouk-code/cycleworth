-- Manual rollback after verified-target check and explicit remote approval.
-- Stop automatic pushes and revoke credentials first. Preserve all rides.
begin;
drop trigger rides_guard_strava_health_overlap on personal_cycleworth.rides;
drop function personal_cycleworth.guard_strava_health_overlap();
drop function personal_cycleworth.health_token_import(text,jsonb,boolean,jsonb);
drop function personal_cycleworth.health_token_context(text);
drop function personal_cycleworth.health_sync_manage(text,text,jsonb);
drop function personal_cycleworth_private.token_health_import(text,jsonb,boolean,jsonb);
drop function personal_cycleworth_private.health_token_context(text);
drop function personal_cycleworth_private.manage_health_sync(text,text,jsonb);
-- Retain credential and status tables as inaccessible audit records. No rides removed.
revoke all on personal_cycleworth.health_sync_credentials from public, anon, authenticated;
revoke all on personal_cycleworth.health_sync_state from public, anon, authenticated;
commit;
