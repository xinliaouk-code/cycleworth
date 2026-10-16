alter table personal_cycleworth.settings
add column if not exists navigation_tabs jsonb not null default '["overview","rides","bike","trends"]'::jsonb
check (jsonb_typeof(navigation_tabs) = 'array' and jsonb_array_length(navigation_tabs) = 4);
