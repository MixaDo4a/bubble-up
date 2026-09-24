alter table public.campaigns
  add column if not exists image_url text,
  add column if not exists video_url text;

alter table public.menus
  add column if not exists image_url text,
  add column if not exists video_url text;

create table if not exists public.coffee_shops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text not null default '',
  address text not null default '',
  hours text not null default '',
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.coffee_shops enable row level security;
create policy if not exists "coffee shops are publicly readable" on public.coffee_shops for select to anon, authenticated using (active = true);
