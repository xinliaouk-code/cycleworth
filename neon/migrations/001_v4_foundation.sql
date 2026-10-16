begin;
create role cw_user nologin;
create role cw_sync nologin;
create schema personal_cycleworth;
revoke all on schema personal_cycleworth from public;
create table personal_cycleworth.app_users (
 id uuid primary key default gen_random_uuid(),
 neon_auth_id text unique,
 email text not null unique check (email = lower(email)),
 legacy_user_id uuid unique,
 created_at timestamptz not null default now()
);
revoke all on personal_cycleworth.app_users from public;
create function personal_cycleworth.current_user_id() returns uuid language sql stable as
$$ select nullif(current_setting('cycleworth.user_id', true), '')::uuid $$;


-- Dedicated-project baseline for CycleWorth. The application owns this schema;
-- no legacy public tables or unrelated application objects belong here.
create schema if not exists personal_cycleworth;
grant usage on schema personal_cycleworth to cw_sync, cw_user;

create table if not exists personal_cycleworth.settings (
  id uuid primary key references personal_cycleworth.app_users(id) on delete cascade,
  bike_price numeric(12,2),
  tfl_fare_settings jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


create table if not exists personal_cycleworth.rides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references personal_cycleworth.app_users(id) on delete cascade,
  strava_activity_id bigint,
  name text,
  distance numeric not null default 0,
  moving_time integer not null default 0,
  elapsed_time integer not null default 0,
  type text,
  start_date timestamptz not null,
  start_station text,
  end_station text,
  summary_polyline text,
  is_commute boolean not null default false,
  category text,
  is_manual_override boolean not null default false,
  calories numeric,
  total_elevation_gain numeric,
  average_speed numeric,
  max_speed numeric,
  elevation_profile jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, strava_activity_id)
);

create table if not exists personal_cycleworth.bike_maintenance_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references personal_cycleworth.app_users(id) on delete cascade,
  task_type text not null,
  display_name text not null,
  distance_interval_km numeric,
  time_interval_days integer,
  last_completed_at timestamptz not null default now(),
  last_completed_odometer_km numeric not null default 0,
  estimated_cost numeric,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, task_type)
);

create table if not exists personal_cycleworth.bike_maintenance_history (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references personal_cycleworth.bike_maintenance_tasks(id) on delete cascade,
  user_id uuid not null references personal_cycleworth.app_users(id) on delete cascade,
  completed_at timestamptz not null default now(),
  odometer_km numeric not null,
  cost numeric,
  notes text
);

create index if not exists rides_user_start_date_idx on personal_cycleworth.rides (user_id, start_date desc);
create index if not exists rides_user_strava_idx on personal_cycleworth.rides (user_id, strava_activity_id);
create index if not exists maintenance_tasks_user_idx on personal_cycleworth.bike_maintenance_tasks (user_id, active);
create index if not exists maintenance_history_user_idx on personal_cycleworth.bike_maintenance_history (user_id, completed_at desc);

create or replace function personal_cycleworth.set_updated_at()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger settings_set_updated_at
before update on personal_cycleworth.settings
for each row execute function personal_cycleworth.set_updated_at();


create trigger rides_set_updated_at
before update on personal_cycleworth.rides
for each row execute function personal_cycleworth.set_updated_at();

create trigger maintenance_tasks_set_updated_at
before update on personal_cycleworth.bike_maintenance_tasks
for each row execute function personal_cycleworth.set_updated_at();

alter table personal_cycleworth.settings enable row level security;
alter table personal_cycleworth.rides enable row level security;
alter table personal_cycleworth.bike_maintenance_tasks enable row level security;
alter table personal_cycleworth.bike_maintenance_history enable row level security;

create policy settings_owner
on personal_cycleworth.settings
for all to cw_user
using ((select personal_cycleworth.current_user_id()) = id)
with check ((select personal_cycleworth.current_user_id()) = id);


create policy rides_owner
on personal_cycleworth.rides
for all to cw_user
using ((select personal_cycleworth.current_user_id()) = user_id)
with check ((select personal_cycleworth.current_user_id()) = user_id);

create policy maintenance_tasks_owner
on personal_cycleworth.bike_maintenance_tasks
for all to cw_user
using ((select personal_cycleworth.current_user_id()) = user_id)
with check ((select personal_cycleworth.current_user_id()) = user_id);

create policy maintenance_history_owner
on personal_cycleworth.bike_maintenance_history
for all to cw_user
using ((select personal_cycleworth.current_user_id()) = user_id)
with check ((select personal_cycleworth.current_user_id()) = user_id);

revoke all on all tables in schema personal_cycleworth from cw_sync;
grant select, insert, update, delete on all tables in schema personal_cycleworth to cw_user;

commit;

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

begin;

-- Privileged implementation functions are deliberately outside the exposed API schema.
create schema personal_cycleworth_private;
revoke all on schema personal_cycleworth_private from public;
grant usage on schema personal_cycleworth_private to cw_user;

create function personal_cycleworth_private.apply_health_import(p_owner uuid, p_rides jsonb, p_dry_run boolean)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  entry jsonb; r jsonb; results jsonb := '[]'::jsonb; candidates jsonb;
  proposed jsonb := '[]'::jsonb; batch_candidates jsonb;
  ride_id uuid; existing_id uuid; external_id text; starts timestamptz; ends timestamptz;
  metres numeric; seconds integer; elapsed integer;
begin
  if p_owner is null then raise exception 'Unauthorized' using errcode = '28000'; end if;
  if p_dry_run is null or jsonb_typeof(p_rides) is distinct from 'array'
    or jsonb_array_length(p_rides) > 100 then
    raise exception 'Invalid batch' using errcode = '22023';
  end if;
  -- Serialize all Health import batches for one owner, including concurrent retries.
  perform pg_advisory_xact_lock(hashtextextended(p_owner::text, 0));
  for entry in select value from jsonb_array_elements(p_rides) loop
    r := entry->'ride';
    external_id := r->>'external_activity_id';
    begin
      if r->>'source' is distinct from 'apple_health' or external_id is null
        or external_id !~ '^[A-Za-z0-9._:-]{1,200}$' then
        raise exception 'Invalid source identity';
      end if;
      select id into existing_id from personal_cycleworth.rides
        where user_id = p_owner and source = 'apple_health' and external_activity_id = external_id;
      if existing_id is not null then
        results := results || jsonb_build_array(jsonb_build_object('index', entry->'index', 'status', 'exists', 'external_activity_id', external_id));
        continue;
      end if;
      starts := (r->>'start_date')::timestamptz;
      ends := (r->>'end_date')::timestamptz;
      metres := (r->>'distance')::numeric;
      seconds := (r->>'moving_time')::integer;
      elapsed := (r->>'elapsed_time')::integer;
      if starts is null or ends is null or ends <= starts or ends > starts + interval '7 days'
        or metres is null or metres < 0 or metres > 5000000 or metres::text in ('NaN', 'Infinity', '-Infinity')
        or seconds is null or seconds <= 0 or seconds > extract(epoch from ends - starts) + 2
        or elapsed is null or abs(elapsed - extract(epoch from ends - starts)) > 1
        or r->>'type' is null or r->>'type' not in ('Ride', 'VirtualRide') then
        raise exception 'Invalid normalized ride';
      end if;
      select coalesce(jsonb_agg(id order by start_date, id), '[]'::jsonb) into candidates
        from personal_cycleworth.rides
        where user_id = p_owner
          and start_date between starts - interval '5 minutes' and starts + interval '5 minutes'
          and (
            (metres > 0 and distance > 0 and abs(distance - metres) <= greatest(500, metres * 0.15))
            or ((metres = 0 or distance = 0) and abs(elapsed_time - elapsed) <= greatest(120, elapsed * 0.2))
          );
      -- Preview must also detect overlaps among proposed rows in this batch.
      if p_dry_run then
        select coalesce(jsonb_agg('batch:' || (value->>'index')), '[]'::jsonb) into batch_candidates
          from jsonb_array_elements(proposed)
          where (value->'ride'->>'start_date')::timestamptz between starts - interval '5 minutes' and starts + interval '5 minutes'
            and (
              (metres > 0 and (value->'ride'->>'distance')::numeric > 0 and abs((value->'ride'->>'distance')::numeric - metres) <= greatest(500, metres * 0.15))
              or ((metres = 0 or (value->'ride'->>'distance')::numeric = 0) and abs((value->'ride'->>'elapsed_time')::integer - elapsed) <= greatest(120, elapsed * 0.2))
            );
        candidates := candidates || batch_candidates;
      end if;
      if jsonb_array_length(candidates) > 0 then
        results := results || jsonb_build_array(jsonb_build_object('index', entry->'index', 'status', 'suspected_duplicate', 'external_activity_id', external_id, 'candidate_ids', candidates));
        continue;
      end if;
      if not p_dry_run then
        insert into personal_cycleworth.rides
          (user_id, source, external_activity_id, name, start_date, end_date, source_timezone_offset,
           distance, moving_time, elapsed_time, type, summary_polyline, start_station, end_station,
           is_commute, category, is_manual_override, source_metadata)
        values
          (p_owner, 'apple_health', external_id, left(r->>'name', 200), starts, ends, r->>'source_timezone_offset',
           metres, seconds, elapsed, r->>'type', r->>'summary_polyline', r->>'start_station', r->>'end_station',
           coalesce((r->>'is_commute')::boolean, false), r->>'category', false, coalesce(r->'source_metadata', '{}'::jsonb))
        on conflict (user_id, source, external_activity_id) do nothing
        returning id into ride_id;
        if ride_id is null then
          results := results || jsonb_build_array(jsonb_build_object('index', entry->'index', 'status', 'exists', 'external_activity_id', external_id));
          continue;
        end if;
      end if;
      proposed := proposed || jsonb_build_array(entry);
      results := results || jsonb_build_array(jsonb_build_object('index', entry->'index', 'status', 'new', 'external_activity_id', external_id));
    exception when invalid_text_representation or numeric_value_out_of_range or check_violation or not_null_violation or raise_exception or invalid_datetime_format or datetime_field_overflow then
      -- Never expose SQL text, routes, credentials or user data in an error.
      results := results || jsonb_build_array(jsonb_build_object('index', entry->'index', 'status', 'failed', 'external_activity_id', external_id, 'message', 'Invalid normalized ride'));
    end;
  end loop;
  return results;
end;
$$;
revoke all on function personal_cycleworth_private.apply_health_import(uuid,jsonb,boolean) from public, cw_sync, cw_user;

create function personal_cycleworth_private.session_health_import(p_rides jsonb, p_dry_run boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare owner_id uuid := personal_cycleworth.current_user_id();
begin
  if owner_id is null then raise exception 'Unauthorized' using errcode = '28000'; end if;
  return personal_cycleworth_private.apply_health_import(owner_id, p_rides, p_dry_run);
end;
$$;
revoke all on function personal_cycleworth_private.session_health_import(jsonb,boolean) from public, cw_sync;
grant execute on function personal_cycleworth_private.session_health_import(jsonb,boolean) to cw_user;

create function personal_cycleworth.health_import(p_rides jsonb, p_dry_run boolean default true)
returns jsonb language sql security invoker set search_path = '' as $$
  select personal_cycleworth_private.session_health_import(p_rides, p_dry_run);
$$;
revoke all on function personal_cycleworth.health_import(jsonb,boolean) from public, cw_sync;
grant execute on function personal_cycleworth.health_import(jsonb,boolean) to cw_user;
commit;

begin;

create table personal_cycleworth.health_sync_credentials (
  user_id uuid primary key references personal_cycleworth.app_users(id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  rotated_at timestamptz not null default now(),
  revoked_at timestamptz,
  writes_enabled boolean not null default false,
  sync_from timestamptz not null default now()
);
create table personal_cycleworth.health_sync_state (
  user_id uuid primary key references personal_cycleworth.app_users(id) on delete cascade,
  last_attempt_at timestamptz,
  last_synced_at timestamptz,
  last_result jsonb,
  rate_window_at timestamptz,
  rate_count integer not null default 0
);
alter table personal_cycleworth.health_sync_credentials enable row level security;
alter table personal_cycleworth.health_sync_state enable row level security;
create policy health_credentials_owner on personal_cycleworth.health_sync_credentials
  for all to cw_user using ((select personal_cycleworth.current_user_id()) = user_id) with check ((select personal_cycleworth.current_user_id()) = user_id);
create policy health_state_owner on personal_cycleworth.health_sync_state
  for select to cw_user using ((select personal_cycleworth.current_user_id()) = user_id);
-- Credentials (including hashes) and rate counters are only accessible via the
-- narrowly scoped functions below, even for the owner. No broad table grants.
revoke all on personal_cycleworth.health_sync_credentials from public, cw_sync, cw_user;
revoke all on personal_cycleworth.health_sync_state from public, cw_sync, cw_user;
grant usage on schema personal_cycleworth_private to cw_sync;

create function personal_cycleworth_private.manage_health_sync(p_action text, p_token_hash text, p_settings jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare owner_id uuid := personal_cycleworth.current_user_id(); result jsonb;
begin
  if owner_id is null then raise exception 'Unauthorized' using errcode = '28000'; end if;
  if p_action = 'rotate' then
    if p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$' then raise exception 'Invalid credential hash' using errcode = '22023'; end if;
    insert into personal_cycleworth.health_sync_credentials (user_id, token_hash)
      values (owner_id, p_token_hash)
      on conflict (user_id) do update set token_hash = excluded.token_hash, rotated_at = now(), revoked_at = null, writes_enabled = false;
  elsif p_action = 'revoke' then
    update personal_cycleworth.health_sync_credentials set revoked_at = now(), writes_enabled = false where user_id = owner_id;
  elsif p_action in ('enable_writes', 'disable_writes') then
    update personal_cycleworth.health_sync_credentials set writes_enabled = (p_action = 'enable_writes')
      where user_id = owner_id and revoked_at is null;
  elsif p_action not in ('status', 'save_settings') then
    raise exception 'Invalid action' using errcode = '22023';
  end if;
  if p_settings is not null then
    if jsonb_typeof(p_settings) is distinct from 'object' or octet_length(p_settings::text) > 2048 then
      raise exception 'Invalid commute settings' using errcode = '22023';
    end if;
    insert into personal_cycleworth.settings (id, health_commute_settings) values (owner_id, p_settings)
      on conflict (id) do update set health_commute_settings = excluded.health_commute_settings;
  end if;
  select jsonb_build_object(
    'enabled', coalesce(c.token_hash is not null and c.revoked_at is null, false),
    'writes_authorized', coalesce(c.writes_enabled, false),
    'created_at', c.created_at, 'rotated_at', c.rotated_at, 'revoked_at', c.revoked_at, 'sync_from', c.sync_from,
    'last_attempt_at', s.last_attempt_at, 'last_synced_at', s.last_synced_at, 'last_result', s.last_result,
    'commute_settings', cfg.health_commute_settings
  ) into result
  from (select owner_id as user_id) u
  left join personal_cycleworth.health_sync_credentials c on c.user_id = u.user_id
  left join personal_cycleworth.health_sync_state s on s.user_id = u.user_id
  left join personal_cycleworth.settings cfg on cfg.id = u.user_id;
  return result;
end;
$$;
revoke all on function personal_cycleworth_private.manage_health_sync(text,text,jsonb) from public, cw_sync;
grant execute on function personal_cycleworth_private.manage_health_sync(text,text,jsonb) to cw_user;

create function personal_cycleworth.health_sync_manage(p_action text default 'status', p_token_hash text default null, p_settings jsonb default null)
returns jsonb language sql security invoker set search_path = '' as $$
  select personal_cycleworth_private.manage_health_sync(p_action,p_token_hash,p_settings);
$$;
revoke all on function personal_cycleworth.health_sync_manage(text,text,jsonb) from public, cw_sync;
grant execute on function personal_cycleworth.health_sync_manage(text,text,jsonb) to cw_user;

create function personal_cycleworth_private.health_token_context(p_token_hash text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare owner_id uuid; earliest timestamptz; request_count integer;
begin
  select user_id, sync_from into owner_id, earliest
    from personal_cycleworth.health_sync_credentials where token_hash = p_token_hash and revoked_at is null;
  if owner_id is null then raise exception 'Invalid sync credential' using errcode = '28000'; end if;
  -- A persistent per-user quota works across serverless instances and rotations.
  insert into personal_cycleworth.health_sync_state (user_id, rate_window_at, rate_count, last_attempt_at)
    values (owner_id, now(), 1, now())
    on conflict (user_id) do update set
      rate_count = case when health_sync_state.rate_window_at > now() - interval '1 minute' then health_sync_state.rate_count + 1 else 1 end,
      rate_window_at = case when health_sync_state.rate_window_at > now() - interval '1 minute' then health_sync_state.rate_window_at else now() end,
      last_attempt_at = now()
    returning rate_count into request_count;
  if request_count > 30 then return jsonb_build_object('rate_limited', true); end if;
  return jsonb_build_object('sync_from', earliest, 'commute_settings',
    (select health_commute_settings from personal_cycleworth.settings where id = owner_id));
end;
$$;
revoke all on function personal_cycleworth_private.health_token_context(text) from public, cw_user;
grant execute on function personal_cycleworth_private.health_token_context(text) to cw_sync;
create function personal_cycleworth.health_token_context(p_token_hash text)
returns jsonb language sql security invoker set search_path = '' as $$
  select personal_cycleworth_private.health_token_context(p_token_hash);
$$;
revoke all on function personal_cycleworth.health_token_context(text) from public, cw_user;
grant execute on function personal_cycleworth.health_token_context(text) to cw_sync;

create function personal_cycleworth_private.token_health_import(p_token_hash text, p_rides jsonb, p_dry_run boolean, p_parse_summary jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid; earliest timestamptz; can_write boolean; entry jsonb; allowed jsonb := '[]'::jsonb;
  result jsonb := '[]'::jsonb; applied jsonb; totals jsonb; rate_ok boolean;
  n_new integer; n_exists integer; n_held integer; n_failed integer; n_skipped integer;
begin
  -- Lock the credential so revocation/rotation cannot race a write transaction.
  select user_id, sync_from, writes_enabled into owner_id, earliest, can_write from personal_cycleworth.health_sync_credentials
    where token_hash = p_token_hash and revoked_at is null for share;
  if owner_id is null then raise exception 'Invalid sync credential' using errcode = '28000'; end if;
  if not p_dry_run and not can_write then raise exception 'New-ride writes not authorized' using errcode = '42501'; end if;
  if p_dry_run is null or jsonb_typeof(p_rides) is distinct from 'array' or jsonb_array_length(p_rides) > 100 then
    raise exception 'Invalid batch' using errcode = '22023';
  end if;
  select rate_count between 1 and 30 and rate_window_at > now() - interval '1 minute' into rate_ok
    from personal_cycleworth.health_sync_state where user_id = owner_id;
  if not coalesce(rate_ok, false) then raise exception 'Sync context required or rate limited' using errcode = '54000'; end if;
  for entry in select value from jsonb_array_elements(p_rides) loop
    if not p_dry_run and (entry->'ride'->>'start_date')::timestamptz < earliest
      and not exists (select 1 from personal_cycleworth.rides where user_id = owner_id
        and source = 'apple_health' and external_activity_id = entry->'ride'->>'external_activity_id') then
      result := result || jsonb_build_array(jsonb_build_object('index', entry->'index',
        'external_activity_id', entry->'ride'->>'external_activity_id', 'status', 'failed',
        'message', 'Historical ride held: explicit historical import approval required'));
    else allowed := allowed || jsonb_build_array(entry);
    end if;
  end loop;
  applied := personal_cycleworth_private.apply_health_import(owner_id, allowed, p_dry_run);
  result := result || applied;
  select count(*) filter (where value->>'status' = 'new'),
    count(*) filter (where value->>'status' = 'exists'),
    count(*) filter (where value->>'status' = 'suspected_duplicate'),
    count(*) filter (where value->>'status' = 'failed')
    into n_new, n_exists, n_held, n_failed from jsonb_array_elements(result);
  n_failed := n_failed + least(100, greatest(0, coalesce((p_parse_summary->>'failed')::integer, 0)));
  n_exists := n_exists + least(100, greatest(0, coalesce((p_parse_summary->>'exists')::integer, 0)));
  n_skipped := least(100, greatest(0, coalesce((p_parse_summary->>'skipped')::integer, 0)));
  totals := jsonb_build_object('new', n_new, 'exists', n_exists, 'suspected_duplicate', n_held, 'failed', n_failed, 'skipped', n_skipped);
  update personal_cycleworth.health_sync_state set last_attempt_at = now(),
    last_synced_at = case when not p_dry_run and (n_failed = 0 or n_new + n_exists > 0) then now() else last_synced_at end,
    last_result = jsonb_build_object('dry_run', p_dry_run, 'summary', totals,
      'status', case when n_failed > 0 then 'partial_failure' when n_held > 0 then 'review_required' else 'success' end)
    where user_id = owner_id;
  return result;
end;
$$;
revoke all on function personal_cycleworth_private.token_health_import(text,jsonb,boolean,jsonb) from public, cw_user;
grant execute on function personal_cycleworth_private.token_health_import(text,jsonb,boolean,jsonb) to cw_sync;
create function personal_cycleworth.health_token_import(p_token_hash text, p_rides jsonb, p_dry_run boolean default true, p_parse_summary jsonb default '{}'::jsonb)
returns jsonb language sql security invoker set search_path = '' as $$
  select personal_cycleworth_private.token_health_import(p_token_hash,p_rides,p_dry_run,p_parse_summary);
$$;
revoke all on function personal_cycleworth.health_token_import(text,jsonb,boolean,jsonb) from public, cw_user;
grant execute on function personal_cycleworth.health_token_import(text,jsonb,boolean,jsonb) to cw_sync;
commit;

revoke insert, delete on personal_cycleworth.rides from cw_user;
revoke all on personal_cycleworth.app_users from cw_user, cw_sync;
alter table personal_cycleworth.app_users enable row level security;
-- Enforce maintenance ownership even for malformed task IDs from a client.
alter table personal_cycleworth.bike_maintenance_tasks add constraint maintenance_owner_unique unique(id,user_id);
alter table personal_cycleworth.bike_maintenance_history add constraint maintenance_history_owner_fk
 foreign key(task_id,user_id) references personal_cycleworth.bike_maintenance_tasks(id,user_id);

create role cw_runtime nologin;
grant cw_user,cw_sync to cw_runtime;
grant usage on schema personal_cycleworth to cw_runtime;
create function personal_cycleworth.resolve_identity(p_auth_id text,p_email text)
returns table(id uuid,email text) language plpgsql security definer set search_path='' as $$
#variable_conflict use_column
begin
 return query insert into personal_cycleworth.app_users(neon_auth_id,email) values(p_auth_id,lower(p_email))
 on conflict(email) do update set neon_auth_id=excluded.neon_auth_id
 where app_users.neon_auth_id is null or app_users.neon_auth_id=excluded.neon_auth_id
 returning app_users.id,app_users.email;
end;
$$;
revoke all on function personal_cycleworth.resolve_identity(text,text) from public,cw_user,cw_sync;
grant execute on function personal_cycleworth.resolve_identity(text,text) to cw_runtime;
