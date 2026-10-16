begin;

alter table personal_cycleworth.rides
  add column source text not null default 'legacy',
  add column external_activity_id text,
  add column end_date timestamptz,
  add column source_timezone_offset text,
  add column source_metadata jsonb not null default '{}'::jsonb;

update personal_cycleworth.rides
set source = 'strava', external_activity_id = strava_activity_id::text
where strava_activity_id is not null;

alter table personal_cycleworth.rides
  add constraint rides_source_known check (source in ('legacy', 'strava', 'apple_health')),
  add constraint rides_external_activity_id_valid check (
    external_activity_id is null or length(external_activity_id) between 1 and 200),
  add constraint rides_health_id_required check (
    source <> 'apple_health' or (external_activity_id is not null and strava_activity_id is null)),
  add constraint rides_source_identity_unique unique (user_id, source, external_activity_id);

alter table personal_cycleworth.settings
  add column health_commute_settings jsonb;

-- Existing rides policies and grants are unchanged. New columns inherit owner RLS.
-- Do not discard the original strava_activity_id or change manual classifications.
commit;
