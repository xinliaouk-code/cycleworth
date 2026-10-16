-- Manual, offline rollback ONLY. Never execute against an unverified project.
-- Prefer application rollback: stop writes and keep these additive columns.
-- Structural rollback refuses to run while any Apple Health ride remains.
begin;
do $$ begin
  if exists (select 1 from personal_cycleworth.rides where source = 'apple_health') then
    raise exception 'Preserve/export Apple Health rides before any structural rollback';
  end if;
end $$;
alter table personal_cycleworth.rides
  drop constraint rides_source_identity_unique,
  drop constraint rides_health_id_required,
  drop constraint rides_external_activity_id_valid,
  drop constraint rides_source_known,
  drop column source,
  drop column external_activity_id,
  drop column end_date,
  drop column source_timezone_offset,
  drop column source_metadata;
alter table personal_cycleworth.settings drop column health_commute_settings;
commit;
