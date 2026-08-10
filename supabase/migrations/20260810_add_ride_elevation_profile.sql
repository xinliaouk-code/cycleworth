alter table public.rides
  add column if not exists total_elevation_gain numeric,
  add column if not exists average_speed numeric,
  add column if not exists max_speed numeric,
  add column if not exists elevation_profile jsonb;
