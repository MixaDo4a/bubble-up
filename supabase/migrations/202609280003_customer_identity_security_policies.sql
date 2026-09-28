do $$ begin
  create policy login_codes_no_client_access on public.login_codes for all to anon, authenticated using (false) with check (false);
  create policy registration_tokens_no_client_access on public.registration_tokens for all to anon, authenticated using (false) with check (false);
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy coffee_shops_public_select on public.coffee_shops for select to anon, authenticated using (active = true);
exception when duplicate_object then null;
end $$;
