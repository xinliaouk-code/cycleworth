begin;

-- Privileged implementation functions are deliberately outside the exposed API schema.
create schema personal_cycleworth_private;
revoke all on schema personal_cycleworth_private from public;
grant usage on schema personal_cycleworth_private to authenticated;

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
revoke all on function personal_cycleworth_private.apply_health_import(uuid,jsonb,boolean) from public, anon, authenticated;

create function personal_cycleworth_private.session_health_import(p_rides jsonb, p_dry_run boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare owner_id uuid := auth.uid();
begin
  if owner_id is null then raise exception 'Unauthorized' using errcode = '28000'; end if;
  return personal_cycleworth_private.apply_health_import(owner_id, p_rides, p_dry_run);
end;
$$;
revoke all on function personal_cycleworth_private.session_health_import(jsonb,boolean) from public, anon;
grant execute on function personal_cycleworth_private.session_health_import(jsonb,boolean) to authenticated;

create function personal_cycleworth.health_import(p_rides jsonb, p_dry_run boolean default true)
returns jsonb language sql security invoker set search_path = '' as $$
  select personal_cycleworth_private.session_health_import(p_rides, p_dry_run);
$$;
revoke all on function personal_cycleworth.health_import(jsonb,boolean) from public, anon;
grant execute on function personal_cycleworth.health_import(jsonb,boolean) to authenticated;
commit;
