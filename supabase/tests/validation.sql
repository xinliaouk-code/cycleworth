-- Run this read-only validation after the baseline is pushed to the dedicated
-- CycleWorth Supabase project. Never run it against the legacy shared project.
begin;

do $$
declare
  table_name text;
  expected_policy text;
  expected_tables constant text[] := array[
    'settings',
    'strava_connections',
    'rides',
    'bike_maintenance_tasks',
    'bike_maintenance_history'
  ];
begin
  if to_regnamespace('personal_cycleworth') is null then
    raise exception 'personal_cycleworth schema is missing';
  end if;

  foreach table_name in array expected_tables loop
    if to_regclass(format('personal_cycleworth.%I', table_name)) is null then
      raise exception 'required table personal_cycleworth.% is missing', table_name;
    end if;

    if not exists (
      select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'personal_cycleworth'
        and c.relname = table_name
        and c.relrowsecurity
    ) then
      raise exception 'RLS is not enabled on personal_cycleworth.%', table_name;
    end if;

    if not exists (
      select 1
      from pg_constraint pk
      join pg_class c on c.oid = pk.conrelid
      join pg_namespace n on n.oid = c.relnamespace
      where pk.contype = 'p'
        and n.nspname = 'personal_cycleworth'
        and c.relname = table_name
    ) then
      raise exception 'primary key is missing on personal_cycleworth.%', table_name;
    end if;
  end loop;

  if not exists (
    select 1
    from pg_constraint fk
    join pg_class c on c.oid = fk.conrelid
    join pg_namespace n on n.oid = c.relnamespace
    join pg_class referenced_table on referenced_table.oid = fk.confrelid
    join pg_namespace referenced_schema on referenced_schema.oid = referenced_table.relnamespace
    where fk.contype = 'f'
      and n.nspname = 'personal_cycleworth'
      and referenced_schema.nspname = 'auth'
      and referenced_table.relname = 'users'
      and c.relname = 'settings'
  ) then
    raise exception 'settings must reference auth.users';
  end if;

  foreach table_name in array array['strava_connections', 'rides', 'bike_maintenance_tasks', 'bike_maintenance_history'] loop
    if not exists (
      select 1
      from pg_constraint fk
      join pg_class c on c.oid = fk.conrelid
      join pg_namespace n on n.oid = c.relnamespace
      join pg_class referenced_table on referenced_table.oid = fk.confrelid
      join pg_namespace referenced_schema on referenced_schema.oid = referenced_table.relnamespace
      where fk.contype = 'f'
        and n.nspname = 'personal_cycleworth'
        and c.relname = table_name
        and referenced_schema.nspname = 'auth'
        and referenced_table.relname = 'users'
    ) then
      raise exception 'personal_cycleworth.% must reference auth.users', table_name;
    end if;
  end loop;

  if not exists (
    select 1
    from pg_constraint fk
    join pg_class c on c.oid = fk.conrelid
    join pg_namespace n on n.oid = c.relnamespace
    join pg_class referenced_table on referenced_table.oid = fk.confrelid
    join pg_namespace referenced_schema on referenced_schema.oid = referenced_table.relnamespace
    where fk.contype = 'f'
      and n.nspname = 'personal_cycleworth'
      and c.relname = 'bike_maintenance_history'
      and referenced_schema.nspname = 'personal_cycleworth'
      and referenced_table.relname = 'bike_maintenance_tasks'
  ) then
    raise exception 'bike_maintenance_history must reference bike_maintenance_tasks';
  end if;

  foreach table_name in array expected_tables loop
    expected_policy := case table_name
      when 'settings' then 'settings_owner'
      when 'strava_connections' then 'strava_connections_owner'
      when 'rides' then 'rides_owner'
      when 'bike_maintenance_tasks' then 'maintenance_tasks_owner'
      when 'bike_maintenance_history' then 'maintenance_history_owner'
    end;

    if not exists (
      select 1
      from pg_policy p
      join pg_class c on c.oid = p.polrelid
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'personal_cycleworth'
        and c.relname = table_name
        and p.polname = expected_policy
    ) then
      raise exception 'owner policy % is missing on personal_cycleworth.%', expected_policy, table_name;
    end if;
  end loop;

  if to_regprocedure('personal_cycleworth.set_updated_at()') is null then
    raise exception 'personal_cycleworth.set_updated_at() is missing';
  end if;

  foreach table_name in array array['settings_set_updated_at', 'strava_connections_set_updated_at', 'rides_set_updated_at', 'maintenance_tasks_set_updated_at'] loop
    if not exists (
      select 1
      from pg_trigger t
      join pg_class c on c.oid = t.tgrelid
      join pg_namespace n on n.oid = c.relnamespace
      where not t.tgisinternal
        and n.nspname = 'personal_cycleworth'
        and t.tgname = table_name
    ) then
      raise exception 'updated_at trigger % is missing', table_name;
    end if;
  end loop;

  foreach table_name in array array['rides_user_start_date_idx', 'rides_user_strava_idx', 'maintenance_tasks_user_idx', 'maintenance_history_user_idx'] loop
    if to_regclass(format('personal_cycleworth.%I', table_name)) is null then
      raise exception 'expected index personal_cycleworth.% is missing', table_name;
    end if;
  end loop;

  if to_regclass('public.settings') is not null
    or to_regclass('public.strava_connections') is not null
    or to_regclass('public.rides') is not null
    or to_regclass('public.bike_maintenance_tasks') is not null
    or to_regclass('public.bike_maintenance_history') is not null then
    raise exception 'legacy public CycleWorth tables must not exist in the dedicated project';
  end if;

  if not has_schema_privilege('authenticated', 'personal_cycleworth', 'USAGE') then
    raise exception 'authenticated role is missing schema usage';
  end if;

  foreach table_name in array expected_tables loop
    if not has_table_privilege('authenticated', format('personal_cycleworth.%I', table_name), 'SELECT') then
      raise exception 'authenticated role is missing SELECT on personal_cycleworth.%', table_name;
    end if;
    if has_table_privilege('anon', format('personal_cycleworth.%I', table_name), 'SELECT') then
      raise exception 'anon role must not have SELECT on personal_cycleworth.%', table_name;
    end if;
  end loop;
end;
$$;

rollback;
