create table public.progress_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  taken_on date not null default current_date,
  pose text not null default 'Front',
  storage_path text not null,
  note text,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.progress_photos to authenticated;
grant all on public.progress_photos to service_role;
alter table public.progress_photos enable row level security;
create policy "owner all" on public.progress_photos for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "trainer reads" on public.progress_photos for select to authenticated using (public.is_trainer_of(user_id));

create table public.progress_reports (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null default auth.uid(),
  client_id uuid not null,
  period_days int not null default 30,
  summary jsonb not null default '{}'::jsonb,
  comment text,
  created_at timestamptz not null default now()
);
grant select, insert, delete on public.progress_reports to authenticated;
grant all on public.progress_reports to service_role;
alter table public.progress_reports enable row level security;
create policy "trainer manages" on public.progress_reports for all to authenticated using (trainer_id = auth.uid()) with check (trainer_id = auth.uid() and public.is_trainer_of(client_id));
create policy "client reads" on public.progress_reports for select to authenticated using (client_id = auth.uid());

create policy "photo owner upload" on storage.objects for insert to authenticated with check (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "photo owner delete" on storage.objects for delete to authenticated using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "photo owner or trainer read" on storage.objects for select to authenticated using (bucket_id = 'progress-photos' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_trainer_of(((storage.foldername(name))[1])::uuid)));