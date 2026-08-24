create table if not exists public.bike_maintenance_tasks (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  task_type text not null, display_name text not null, distance_interval_km numeric, time_interval_days integer,
  last_completed_at timestamptz not null default now(), last_completed_odometer_km numeric not null default 0,
  estimated_cost numeric, notes text, active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (user_id, task_type)
);
create table if not exists public.bike_maintenance_history (
  id uuid primary key default gen_random_uuid(), task_id uuid not null references public.bike_maintenance_tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, completed_at timestamptz not null default now(), odometer_km numeric not null, cost numeric, notes text
);
alter table public.bike_maintenance_tasks enable row level security;
alter table public.bike_maintenance_history enable row level security;
create policy "maintenance task owner" on public.bike_maintenance_tasks for all to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "maintenance history owner" on public.bike_maintenance_history for all to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);
