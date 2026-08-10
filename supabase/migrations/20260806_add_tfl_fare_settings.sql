alter table public.settings
add column if not exists tfl_fare_settings jsonb;
