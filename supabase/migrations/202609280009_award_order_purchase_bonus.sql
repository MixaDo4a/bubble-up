create or replace function public.award_order_purchase_bonus()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare points numeric(12,2);
begin
  if new.status = 'completed' and (old.status is distinct from 'completed') then
    points := floor(new.total_amount * 0.05 * 100) / 100;
    if points > 0 then
      insert into public.bonus_transactions(user_id, order_id, amount, type, status, description)
      values (new.user_id, new.id, points, 'purchase', 'posted', '5% за завершённый заказ')
      on conflict (order_id, type) do nothing;
      if found then
        update public.bonus_accounts
        set balance = balance + points, lifetime_earned = lifetime_earned + points, updated_at = now()
        where user_id = new.user_id;
      end if;
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.award_order_purchase_bonus() from public, anon, authenticated;
drop trigger if exists orders_award_purchase_bonus on public.orders;
create trigger orders_award_purchase_bonus after update of status on public.orders
for each row execute function public.award_order_purchase_bonus();
