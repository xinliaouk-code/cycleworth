begin;

create schema if not exists personal_cycleworth;
grant usage on schema personal_cycleworth to anon, authenticated;

create table if not exists personal_cycleworth.settings (
  id uuid primary key references auth.users(id) on delete cascade,
  bike_price numeric(12,2),
  tfl_fare_settings jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists personal_cycleworth.strava_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  access_token text not null,
  refresh_token text,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists personal_cycleworth.rides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
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
  user_id uuid not null references auth.users(id) on delete cascade,
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
  user_id uuid not null references auth.users(id) on delete cascade,
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
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists settings_set_updated_at on personal_cycleworth.settings;
create trigger settings_set_updated_at before update on personal_cycleworth.settings for each row execute function personal_cycleworth.set_updated_at();
drop trigger if exists strava_connections_set_updated_at on personal_cycleworth.strava_connections;
create trigger strava_connections_set_updated_at before update on personal_cycleworth.strava_connections for each row execute function personal_cycleworth.set_updated_at();
drop trigger if exists rides_set_updated_at on personal_cycleworth.rides;
create trigger rides_set_updated_at before update on personal_cycleworth.rides for each row execute function personal_cycleworth.set_updated_at();
drop trigger if exists maintenance_tasks_set_updated_at on personal_cycleworth.bike_maintenance_tasks;
create trigger maintenance_tasks_set_updated_at before update on personal_cycleworth.bike_maintenance_tasks for each row execute function personal_cycleworth.set_updated_at();

alter table personal_cycleworth.settings enable row level security;
alter table personal_cycleworth.strava_connections enable row level security;
alter table personal_cycleworth.rides enable row level security;
alter table personal_cycleworth.bike_maintenance_tasks enable row level security;
alter table personal_cycleworth.bike_maintenance_history enable row level security;

create policy settings_owner on personal_cycleworth.settings for all to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy strava_connections_owner on personal_cycleworth.strava_connections for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy rides_owner on personal_cycleworth.rides for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy maintenance_tasks_owner on personal_cycleworth.bike_maintenance_tasks for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy maintenance_history_owner on personal_cycleworth.bike_maintenance_history for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

revoke all on all tables in schema personal_cycleworth from anon;
grant select, insert, update, delete on all tables in schema personal_cycleworth to authenticated;

commit;
