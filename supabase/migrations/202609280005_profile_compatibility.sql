alter table public.profiles
  add column if not exists phone text,
  add column if not exists display_name text not null default '',
  add column if not exists avatar_url text,
  add column if not exists is_active boolean not null default true;
update public.profiles set display_name = coalesce(nullif(display_name,''), full_name, '') where display_name = '';
create unique index if not exists profiles_phone_unique_idx on public.profiles(phone) where phone is not null;
alter table public.identity_links drop constraint if exists identity_links_user_id_fkey;
alter table public.identity_links add constraint identity_links_user_id_fkey foreign key (user_id) references public.profiles(id) on delete cascade;
