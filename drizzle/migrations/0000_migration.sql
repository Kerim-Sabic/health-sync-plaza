create type public.app_role as enum ('solo','client','trainer');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  goal text,
  trainer_code text unique default upper(substr(md5(random()::text),1,6)),
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id)
);
grant select, insert on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "own role read" on public.user_roles for select to authenticated using (user_id = auth.uid());
create policy "own role pick once" on public.user_roles for insert to authenticated with check (user_id = auth.uid());

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create table public.trainer_clients (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null,
  client_id uuid not null,
  created_at timestamptz not null default now(),
  unique (trainer_id, client_id)
);
grant select, insert, delete on public.trainer_clients to authenticated;
grant all on public.trainer_clients to service_role;
alter table public.trainer_clients enable row level security;
create policy "parties read" on public.trainer_clients for select to authenticated using (trainer_id = auth.uid() or client_id = auth.uid());
create policy "client joins" on public.trainer_clients for insert to authenticated with check (client_id = auth.uid() and public.has_role(trainer_id,'trainer'));
create policy "parties leave" on public.trainer_clients for delete to authenticated using (trainer_id = auth.uid() or client_id = auth.uid());

create or replace function public.is_trainer_of(_client uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.trainer_clients where trainer_id = auth.uid() and client_id = _client)
$$;

create or replace function public.find_trainer_by_code(_code text)
returns table(id uuid, display_name text) language sql stable security definer set search_path = public as $$
  select p.id, p.display_name from public.profiles p
  where p.trainer_code = upper(_code) and public.has_role(p.id,'trainer')
$$;
grant execute on function public.find_trainer_by_code(text) to authenticated;

create policy "own profile" on public.profiles for select to authenticated using (id = auth.uid() or public.is_trainer_of(id) or exists (select 1 from public.trainer_clients t where t.client_id = auth.uid() and t.trainer_id = profiles.id));
create policy "own profile insert" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid());

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)));
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- log tables
create table public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  title text not null,
  performed_at timestamptz not null default now(),
  duration_min int,
  rpe int,
  notes text,
  sets jsonb not null default '[]'::jsonb
);
create table public.sleep_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  log_date date not null default current_date,
  hours numeric not null,
  quality int not null default 3
);
create table public.nutrition_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  log_date date not null default current_date,
  meal text not null default 'Meal',
  name text not null,
  calories int not null default 0,
  protein int not null default 0,
  carbs int not null default 0,
  fat int not null default 0
);
create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  mood int not null default 3,
  energy int not null default 3,
  body text
);
create table public.body_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  log_date date not null default current_date,
  weight numeric,
  body_fat numeric
);

do $$ declare t text; begin
  foreach t in array array['workouts','sleep_logs','nutrition_logs','journal_entries','body_metrics'] loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "owner all" on public.%I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
    execute format('create policy "trainer reads" on public.%I for select to authenticated using (public.is_trainer_of(user_id))', t);
  end loop;
end $$;

create table public.programs (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null default auth.uid(),
  name text not null,
  description text,
  weeks int not null default 4,
  days jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create table public.program_assignments (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  trainer_id uuid not null default auth.uid(),
  client_id uuid not null,
  start_date date not null default current_date,
  created_at timestamptz not null default now()
);
create table public.trainer_notes (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null default auth.uid(),
  client_id uuid not null,
  body text not null,
  shared boolean not null default true,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.programs, public.program_assignments, public.trainer_notes to authenticated;
grant all on public.programs, public.program_assignments, public.trainer_notes to service_role;
alter table public.programs enable row level security;
alter table public.program_assignments enable row level security;
alter table public.trainer_notes enable row level security;

create policy "trainer owns" on public.programs for all to authenticated using (trainer_id = auth.uid()) with check (trainer_id = auth.uid() and public.has_role(auth.uid(),'trainer'));
create policy "assigned client reads" on public.programs for select to authenticated using (exists (select 1 from public.program_assignments a where a.program_id = programs.id and a.client_id = auth.uid()));
create policy "trainer manages" on public.program_assignments for all to authenticated using (trainer_id = auth.uid()) with check (trainer_id = auth.uid() and public.is_trainer_of(client_id));
create policy "client reads" on public.program_assignments for select to authenticated using (client_id = auth.uid());
create policy "trainer notes" on public.trainer_notes for all to authenticated using (trainer_id = auth.uid()) with check (trainer_id = auth.uid() and public.is_trainer_of(client_id));
create policy "client reads shared" on public.trainer_notes for select to authenticated using (client_id = auth.uid() and shared);