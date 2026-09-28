-- Roles and server-controlled customer settings.
create table if not exists public.profile_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('customer','manager','admin')),
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

create table if not exists public.user_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  preferred_auth_channel text check (preferred_auth_channel in ('telegram','sms','email','telegram_mini_app')),
  marketing_consent boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.profile_roles enable row level security;
alter table public.user_settings enable row level security;

do $$ begin
  create policy profile_roles_self_select on public.profile_roles for select to authenticated using ((select auth.uid()) = user_id);
  create policy user_settings_self_select on public.user_settings for select to authenticated using ((select auth.uid()) = user_id);
  create policy user_settings_self_update on public.user_settings for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
exception when duplicate_object then null;
end $$;

-- Admin authorization is evaluated server-side against this table/app_metadata;
-- clients never receive insert/update access to roles.
revoke insert, update, delete on public.profile_roles from anon, authenticated;
