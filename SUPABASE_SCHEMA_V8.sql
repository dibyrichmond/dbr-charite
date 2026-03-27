-- ═══════════════════════════════════════════════════════════
-- DBR CHARITÉ V9 — Schéma de production
-- Tables utilisées par les API routes Vercel
-- ═══════════════════════════════════════════════════════════

-- 1. TABLE UTILISATEURS
create table if not exists public.dbr_users (
  id bigint generated always as identity primary key,
  email text unique not null,
  name text not null,
  password_hash text not null,
  role text not null default 'participant',
  is_admin boolean default false,
  created_at bigint default (extract(epoch from now()) * 1000)::bigint,
  reset_token text,
  reset_token_expires bigint
);

-- 2. TABLE CODES D'INVITATION
create table if not exists public.dbr_codes (
  id bigint generated always as identity primary key,
  code text unique not null,
  role text not null default 'participant',
  for_email text,
  used_by text,
  created_by text,
  expires_at bigint,
  created_at bigint default (extract(epoch from now()) * 1000)::bigint
);

-- 3. TABLE SESSIONS
create table if not exists public.dbr_sessions (
  id bigint generated always as identity primary key,
  email text not null references public.dbr_users(email) on delete cascade,
  msgs jsonb default '[]' not null,
  blocs jsonb default '[]' not null,
  bi integer default 0,
  qi integer default 0,
  answers jsonb default '{}' not null,
  syntheses jsonb default '{}' not null,
  validated jsonb default '{}' not null,
  api_hist jsonb default '[]' not null,
  bloc_label text,
  q_title text,
  phase text default 'program',
  total_time integer default 0,
  saved_at bigint,
  completed_at bigint
);

-- 4. TABLE PROFILS PARTICIPANTS (BLUEPRINT)
create table if not exists public.dbr_participant_profiles (
  id bigint generated always as identity primary key,
  email text unique not null references public.dbr_users(email) on delete cascade,
  participant_name text,
  dream_root text,
  discipline_minutes text,
  meeting_time text,
  fallback_time text,
  start_date_j1 text,
  parcours_dbr text,
  accompagnement_mode text,
  copilot_name text,
  copilot_contact text,
  status text default 'SPRINT',
  return_rule text,
  sprint_notes jsonb default '{}',
  updated_at bigint,
  admin_comments jsonb default '[]',
  admin_validated boolean default false,
  admin_validated_at bigint,
  admin_validated_by text,
  program_90_started boolean default false
);

-- 5. TABLE RATE LIMITING
create table if not exists public.dbr_rate_limits (
  ip text primary key,
  count integer not null default 0,
  window_start bigint not null
);

-- 6. INDICES POUR PERFORMANCE
create index if not exists idx_dbr_users_email on public.dbr_users(email);
create index if not exists idx_dbr_sessions_email on public.dbr_sessions(email);
create index if not exists idx_dbr_sessions_phase on public.dbr_sessions(phase);
create index if not exists idx_dbr_sessions_completed on public.dbr_sessions(completed_at);
create index if not exists idx_dbr_codes_code on public.dbr_codes(code);
create index if not exists idx_dbr_profiles_email on public.dbr_participant_profiles(email);
create index if not exists idx_dbr_rate_limits_window on public.dbr_rate_limits(window_start);

-- NOTE : L'application utilise le service_role key côté API (Vercel serverless).
-- RLS n'est pas activé sur ces tables car l'accès est contrôlé par les API routes.
-- Si vous activez RLS, ajoutez les politiques appropriées.
