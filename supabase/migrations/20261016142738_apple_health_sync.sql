begin;

create table personal_cycleworth.health_sync_credentials (
  user_id uuid primary key references auth.users(id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  rotated_at timestamptz not null default now(),
  revoked_at timestamptz,
  writes_enabled boolean not null default false,
  sync_from timestamptz not null default now()
);
create table personal_cycleworth.health_sync_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_attempt_at timestamptz,
  last_synced_at timestamptz,
  last_result jsonb,
  rate_window_at timestamptz,
  rate_count integer not null default 0
);
alter table personal_cycleworth.health_sync_credentials enable row level security;
alter table personal_cycleworth.health_sync_state enable row level security;
create policy health_credentials_owner on personal_cycleworth.health_sync_credentials
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy health_state_owner on personal_cycleworth.health_sync_state
  for select to authenticated using ((select auth.uid()) = user_id);
-- Credentials (including hashes) and rate counters are only accessible via the
-- narrowly scoped functions below, even for the owner. No broad table grants.
revoke all on personal_cycleworth.health_sync_credentials from public, anon, authenticated;
revoke all on personal_cycleworth.health_sync_state from public, anon, authenticated;
grant usage on schema personal_cycleworth_private to anon;

create function personal_cycleworth_private.manage_health_sync(p_action text, p_token_hash text, p_settings jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare owner_id uuid := auth.uid(); result jsonb;
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
revoke all on function personal_cycleworth_private.manage_health_sync(text,text,jsonb) from public, anon;
grant execute on function personal_cycleworth_private.manage_health_sync(text,text,jsonb) to authenticated;

create function personal_cycleworth.health_sync_manage(p_action text default 'status', p_token_hash text default null, p_settings jsonb default null)
returns jsonb language sql security invoker set search_path = '' as $$
  select personal_cycleworth_private.manage_health_sync(p_action,p_token_hash,p_settings);
$$;
revoke all on function personal_cycleworth.health_sync_manage(text,text,jsonb) from public, anon;
grant execute on function personal_cycleworth.health_sync_manage(text,text,jsonb) to authenticated;

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
revoke all on function personal_cycleworth_private.health_token_context(text) from public, authenticated;
grant execute on function personal_cycleworth_private.health_token_context(text) to anon;
create function personal_cycleworth.health_token_context(p_token_hash text)
returns jsonb language sql security invoker set search_path = '' as $$
  select personal_cycleworth_private.health_token_context(p_token_hash);
$$;
revoke all on function personal_cycleworth.health_token_context(text) from public, authenticated;
grant execute on function personal_cycleworth.health_token_context(text) to anon;

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
revoke all on function personal_cycleworth_private.token_health_import(text,jsonb,boolean,jsonb) from public, authenticated;
grant execute on function personal_cycleworth_private.token_health_import(text,jsonb,boolean,jsonb) to anon;
create function personal_cycleworth.health_token_import(p_token_hash text, p_rides jsonb, p_dry_run boolean default true, p_parse_summary jsonb default '{}'::jsonb)
returns jsonb language sql security invoker set search_path = '' as $$
  select personal_cycleworth_private.token_health_import(p_token_hash,p_rides,p_dry_run,p_parse_summary);
$$;
revoke all on function personal_cycleworth.health_token_import(text,jsonb,boolean,jsonb) from public, authenticated;
grant execute on function personal_cycleworth.health_token_import(text,jsonb,boolean,jsonb) to anon;
-- Strava's batch insert takes the same owner lock as Health imports. If Health
-- commits after the API's preview but before the insert, fail closed; a retry
-- will return candidates instead of adding a second ride to statistics.
create function personal_cycleworth.guard_strava_health_overlap()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.source = 'strava' then
    perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 0));
    if exists (
      select 1 from personal_cycleworth.rides h
      where h.user_id = new.user_id and h.source = 'apple_health'
        and h.start_date between new.start_date - interval '5 minutes' and new.start_date + interval '5 minutes'
        and ((new.distance > 0 and h.distance > 0 and abs(h.distance - new.distance) <= greatest(500, new.distance * 0.15))
          or ((new.distance = 0 or h.distance = 0) and abs(h.elapsed_time - new.elapsed_time) <= greatest(120, new.elapsed_time * 0.2)))
    ) then raise exception 'Apple Health overlap detected; retry Strava sync' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function personal_cycleworth.guard_strava_health_overlap() from public, anon, authenticated;
create trigger rides_guard_strava_health_overlap before insert on personal_cycleworth.rides
  for each row execute function personal_cycleworth.guard_strava_health_overlap();
commit;
