begin;
alter table personal_cycleworth.health_sync_state add column last_failure_at timestamptz, add column last_failure_reason text;
alter table personal_cycleworth.health_sync_credentials alter column sync_from set default '1970-01-01T00:00:00Z';
create or replace function personal_cycleworth_private.apply_health_import(p_owner uuid, p_rides jsonb, p_dry_run boolean)
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
           is_commute, category, is_manual_override, source_metadata, average_speed, max_speed, total_elevation_gain, calories, elevation_profile)
        values
          (p_owner, 'apple_health', external_id, left(r->>'name', 200), starts, ends, r->>'source_timezone_offset',
           metres, seconds, elapsed, r->>'type', r->>'summary_polyline', r->>'start_station', r->>'end_station',
           coalesce((r->>'is_commute')::boolean, false), r->>'category', false, coalesce(r->'source_metadata', '{}'::jsonb), (r->>'average_speed')::numeric, (r->>'max_speed')::numeric, (r->>'total_elevation_gain')::numeric, (r->>'calories')::numeric, r->'elevation_profile')
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
create function personal_cycleworth_private.record_health_result(p_owner uuid,p_result jsonb,p_dry_run boolean,p_validation jsonb)
returns void language plpgsql security invoker set search_path='' as $$
declare n_new integer; n_exists integer; n_held integer; n_failed integer; n_skipped integer; totals jsonb; reason text;
begin
 select count(*) filter(where value->>'status'='new'),count(*) filter(where value->>'status'='exists'),count(*) filter(where value->>'status'='suspected_duplicate'),count(*) filter(where value->>'status'='failed')
 into n_new,n_exists,n_held,n_failed from jsonb_array_elements(p_result);
 n_failed:=n_failed+least(100,greatest(0,coalesce((p_validation->>'failed')::integer,0)));
 n_exists:=n_exists+least(100,greatest(0,coalesce((p_validation->>'exists')::integer,0)));
 n_skipped:=least(100,greatest(0,coalesce((p_validation->>'skipped')::integer,0)));
 totals:=jsonb_build_object('new',n_new,'exists',n_exists,'suspected_duplicate',n_held,'failed',n_failed,'skipped',n_skipped);
 reason:=case p_validation->>'error_code' when 'invalid_json' then 'Invalid JSON' when 'payload_too_large' then 'Payload exceeds 4 MiB' when 'writes_disabled' then 'Writes are disabled' when 'invalid_payload' then 'Invalid Workout V2 payload' else 'One or more workouts could not be imported' end;
 insert into personal_cycleworth.health_sync_state(user_id,last_attempt_at,last_synced_at,last_result,last_failure_at,last_failure_reason)
 values(p_owner,now(),case when not p_dry_run and n_failed=0 and n_held=0 then now() end,
 jsonb_build_object('dry_run',p_dry_run,'summary',totals,'status',case when n_failed>0 then 'partial_failure' when n_held>0 then 'review_required' else 'success' end),
 case when n_failed>0 then now() end,case when n_failed>0 then reason end)
 on conflict(user_id) do update set last_attempt_at=now(),last_synced_at=coalesce(excluded.last_synced_at,health_sync_state.last_synced_at),last_result=excluded.last_result,
 last_failure_at=coalesce(excluded.last_failure_at,health_sync_state.last_failure_at),last_failure_reason=coalesce(excluded.last_failure_reason,health_sync_state.last_failure_reason);
end;
$$;
revoke all on function personal_cycleworth_private.record_health_result(uuid,jsonb,boolean,jsonb) from public,cw_user,cw_sync;

create function personal_cycleworth.health_history_import(p_rides jsonb,p_dry_run boolean,p_parse_summary jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare owner_id uuid:=personal_cycleworth.current_user_id(); result jsonb;
begin
 if owner_id is null then raise exception 'Unauthorized' using errcode='28000';end if;
 result:=personal_cycleworth_private.apply_health_import(owner_id,p_rides,p_dry_run);
 perform personal_cycleworth_private.record_health_result(owner_id,result,p_dry_run,p_parse_summary);
 return result;
end;
$$;
revoke all on function personal_cycleworth.health_history_import(jsonb,boolean,jsonb) from public,cw_sync;
grant execute on function personal_cycleworth.health_history_import(jsonb,boolean,jsonb) to cw_user;

create or replace function personal_cycleworth_private.token_health_import(p_token_hash text,p_rides jsonb,p_dry_run boolean,p_parse_summary jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare owner_id uuid; can_write boolean; rate_ok boolean; result jsonb;
begin
 select user_id,writes_enabled into owner_id,can_write from personal_cycleworth.health_sync_credentials where token_hash=p_token_hash and revoked_at is null for share;
 if owner_id is null then raise exception 'Invalid sync credential' using errcode='28000';end if;
 if not p_dry_run and not can_write then raise exception 'Writes not authorized' using errcode='42501';end if;
 select rate_count between 1 and 30 and rate_window_at>now()-interval '1 minute' into rate_ok from personal_cycleworth.health_sync_state where user_id=owner_id;
 if not coalesce(rate_ok,false) then raise exception 'Rate limited' using errcode='54000';end if;
 result:=personal_cycleworth_private.apply_health_import(owner_id,p_rides,p_dry_run);
 perform personal_cycleworth_private.record_health_result(owner_id,result,p_dry_run,p_parse_summary);
 return result;
end;
$$;
create or replace function personal_cycleworth_private.manage_health_sync(p_action text, p_token_hash text, p_settings jsonb)
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
    'commute_settings', cfg.health_commute_settings, 'total_imported', (select count(*) from personal_cycleworth.rides where user_id=owner_id and source='apple_health'), 'last_failure_at', s.last_failure_at, 'last_failure_reason', s.last_failure_reason
  ) into result
  from (select owner_id as user_id) u
  left join personal_cycleworth.health_sync_credentials c on c.user_id = u.user_id
  left join personal_cycleworth.health_sync_state s on s.user_id = u.user_id
  left join personal_cycleworth.settings cfg on cfg.id = u.user_id;
  return result;
end;
$$;

commit;
