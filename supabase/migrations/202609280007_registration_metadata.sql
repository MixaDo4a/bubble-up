alter table public.registration_tokens add column if not exists metadata jsonb not null default '{}'::jsonb;
