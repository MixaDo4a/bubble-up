create or replace function public.ensure_customer_bonus_account()
returns trigger language plpgsql security invoker set search_path=public as $$
begin
  insert into public.bonus_accounts(user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;
drop trigger if exists profiles_create_bonus_account on public.profiles;
create trigger profiles_create_bonus_account after insert on public.profiles
for each row execute function public.ensure_customer_bonus_account();
insert into public.bonus_accounts(user_id)
select p.id from public.profiles p
where not exists (select 1 from public.bonus_accounts b where b.user_id=p.id);
