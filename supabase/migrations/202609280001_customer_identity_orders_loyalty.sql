-- Unified customer identity, authentication channels, orders and loyalty foundation.
-- Codes are stored only as hashes; delivery is handled by server-side functions.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  phone text unique,
  display_name text not null default '',
  avatar_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login_at timestamptz
);

create table if not exists public.identity_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null check (provider in ('telegram','sms','email','telegram_mini_app')),
  provider_subject text not null,
  provider_username text,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  unique (provider, provider_subject),
  unique (user_id, provider)
);

create table if not exists public.registration_tokens (
  id uuid primary key default gen_random_uuid(),
  token_hash text unique not null,
  provider text not null check (provider in ('telegram','telegram_mini_app')),
  provider_subject text not null,
  provider_username text,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.login_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  phone text not null,
  channel text not null check (channel in ('telegram','sms','email')),
  code_hash text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0 check (attempts >= 0),
  max_attempts integer not null default 5 check (max_attempts between 1 and 10),
  used_at timestamptz,
  delivery_id text,
  request_ip_hash text,
  created_at timestamptz not null default now()
);

create index if not exists login_codes_phone_created_idx on public.login_codes(phone, created_at desc);
create index if not exists login_codes_expires_idx on public.login_codes(expires_at);

create table if not exists public.user_shop_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  shop_id uuid not null references public.coffee_shops(id),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  shop_id uuid references public.coffee_shops(id),
  status text not null default 'draft' check (status in ('draft','pending_payment','paid','completed','cancelled','refunded')),
  total_amount numeric(12,2) not null default 0 check (total_amount >= 0),
  bonus_amount numeric(12,2) not null default 0 check (bonus_amount >= 0),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid','pending','paid','failed','refunded')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id),
  product_name_snapshot text not null,
  price_snapshot numeric(12,2) not null default 0,
  quantity integer not null default 1 check (quantity > 0),
  selected_addons jsonb not null default '[]'::jsonb,
  line_total numeric(12,2) not null default 0 check (line_total >= 0)
);

create table if not exists public.bonus_accounts (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  balance numeric(12,2) not null default 0 check (balance >= 0),
  lifetime_earned numeric(12,2) not null default 0 check (lifetime_earned >= 0),
  lifetime_spent numeric(12,2) not null default 0 check (lifetime_spent >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.bonus_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  order_id uuid references public.orders(id),
  amount numeric(12,2) not null check (amount <> 0),
  type text not null check (type in ('purchase','spend','refund','adjustment','expiration')),
  status text not null default 'posted' check (status in ('pending','posted','reversed')),
  description text not null default '',
  created_at timestamptz not null default now(),
  unique (order_id, type)
);

create index if not exists orders_user_created_idx on public.orders(user_id, created_at desc);
create index if not exists order_items_order_idx on public.order_items(order_id);
create index if not exists bonus_transactions_user_created_idx on public.bonus_transactions(user_id, created_at desc);

-- Keep profile timestamps consistent without trusting the browser.
create or replace function public.touch_profile_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at before update on public.profiles
for each row execute function public.touch_profile_updated_at();

alter table public.profiles enable row level security;
alter table public.identity_links enable row level security;
alter table public.registration_tokens enable row level security;
alter table public.login_codes enable row level security;
alter table public.user_shop_preferences enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.bonus_accounts enable row level security;
alter table public.bonus_transactions enable row level security;

-- User-facing reads and safe self-service updates. Server functions use service role only for auth flows.
do $$ begin
  create policy profiles_self_select on public.profiles for select to authenticated using ((select auth.uid()) = id);
  create policy profiles_self_update on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
  create policy identity_links_self_select on public.identity_links for select to authenticated using ((select auth.uid()) = user_id);
  create policy shop_preferences_self_all on public.user_shop_preferences for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
  create policy orders_self_select on public.orders for select to authenticated using ((select auth.uid()) = user_id);
  create policy order_items_self_select on public.order_items for select to authenticated using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid())));
  create policy bonus_accounts_self_select on public.bonus_accounts for select to authenticated using ((select auth.uid()) = user_id);
  create policy bonus_transactions_self_select on public.bonus_transactions for select to authenticated using ((select auth.uid()) = user_id);
exception when duplicate_object then null;
end $$;

revoke all on public.registration_tokens, public.login_codes from anon, authenticated;
