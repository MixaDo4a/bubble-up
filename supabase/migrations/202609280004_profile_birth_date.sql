alter table public.profiles
  add column if not exists birth_date date,
  add column if not exists birth_date_verified_at timestamptz,
  add column if not exists age_confirmed boolean not null default false;
alter table public.user_settings
  add column if not exists birthday_marketing_consent boolean not null default false;
create index if not exists profiles_birth_date_idx on public.profiles(birth_date) where birth_date is not null;
