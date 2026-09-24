-- Shared media bucket for campaign, menu and product photos/videos.
insert into storage.buckets (id, name, public)
values ('drinkit-media', 'drinkit-media', true)
on conflict (id) do update set public = true;

do $$ begin
  create policy "drinkit media public read" on storage.objects for select using (bucket_id = 'drinkit-media');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "drinkit media anon upload" on storage.objects for insert with check (bucket_id = 'drinkit-media');
exception when duplicate_object then null; end $$;
