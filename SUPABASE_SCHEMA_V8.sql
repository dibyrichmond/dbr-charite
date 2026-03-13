-- ═══════════════════════════════════════════════════════════
-- DBR CHARITÉ V8 — Schéma amélioré
-- ═══════════════════════════════════════════════════════════

-- 1. TABLE PROFILS
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  name text not null,
  role text not null default 'participant' check (role in ('admin', 'participant', 'moderator')),
  avatar_url text,
  invited_by uuid references public.profiles(id) on delete set null,
  is_active boolean default true,
  last_login_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. TABLE INVITATIONS
create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  code text unique not null,
  invited_by uuid not null references public.profiles(id) on delete cascade,
  used boolean default false,
  used_by uuid references public.profiles(id) on delete set null,
  used_at timestamptz,
  expires_at timestamptz default now() + interval '30 days',
  created_at timestamptz default now()
);

-- 3. TABLE SESSIONS
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  msgs jsonb default '[]' not null,
  blocs jsonb default '[]' not null,
  bi integer default 0 check (bi >= 0),
  qi integer default 0 check (qi >= 0),
  answers jsonb default '{}' not null,
  syntheses jsonb default '{}' not null,
  validated jsonb default '{}' not null,
  api_hist jsonb default '[]' not null,
  bloc_label text,
  q_title text,
  phase text default 'program' check (phase in ('program', 'diagnosis', 'analysis', 'conclusion')),
  path_type text default 'CHA' check (path_type in ('CHA', 'BRA', 'EXP')),
  total_time integer default 0 check (total_time >= 0),
  completed_at timestamptz,
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

-- 4. TABLE BILANS
create table if not exists public.bilans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  session_id uuid not null references public.sessions(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed', 'archived')),
  due_date timestamptz not null default now() + interval '7 days',
  completed_at timestamptz,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, session_id)
);

-- 5. TABLE LOGS ADMIN
create table if not exists public.admin_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles(id) on delete set null,
  action text not null,
  resource_type text not null,
  target_id uuid,
  changes jsonb default '{}' not null,
  created_at timestamptz default now()
);

-- 6. INDICES POUR PERFORMANCE
create index if not exists idx_profiles_email on public.profiles(email);
create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_sessions_user_id on public.sessions(user_id);
create index if not exists idx_sessions_phase on public.sessions(phase);
create index if not exists idx_bilans_user_id on public.bilans(user_id);
create index if not exists idx_bilans_status on public.bilans(status);
create index if not exists idx_invitations_code on public.invitations(code);

-- 7. ACTIVER RLS
alter table public.profiles enable row level security;
alter table public.invitations enable row level security;
alter table public.sessions enable row level security;
alter table public.bilans enable row level security;
alter table public.admin_logs enable row level security;

-- 8. POLITIQUES (PERMISSIONS)
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_select_admin" on public.profiles;
create policy "profiles_select_admin" on public.profiles
  for select using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "sessions_select_own" on public.sessions;
create policy "sessions_select_own" on public.sessions
  for select using (auth.uid() = user_id);

drop policy if exists "sessions_select_admin" on public.sessions;
create policy "sessions_select_admin" on public.sessions
  for select using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

drop policy if exists "sessions_insert_own" on public.sessions;
create policy "sessions_insert_own" on public.sessions
  for insert with check (auth.uid() = user_id);

drop policy if exists "bilans_select_own" on public.bilans;
create policy "bilans_select_own" on public.bilans
  for select using (auth.uid() = user_id);

drop policy if exists "bilans_select_admin" on public.bilans;
create policy "bilans_select_admin" on public.bilans
  for select using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

drop policy if exists "logs_select_admin" on public.admin_logs;
create policy "logs_select_admin" on public.admin_logs
  for select using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- 9. TRIGGER - Créer profil automatiquement
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name, role, created_at, updated_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'participant'),
    now(),
    now()
  )
  on conflict (id) do update set updated_at = now();
  
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
