-- ═══════════════════════════════════════════════════════════
-- DBR CHARITÉ V9 — Patch additionnel (nouvelles tables P1)
-- À exécuter dans Supabase SQL Editor APRÈS V8
-- ═══════════════════════════════════════════════════════════

-- 1. TABLE MOMENTS DE VÉRITÉ
-- Stocke les moments extraits par Claude après chaque bloc synthèse
create table if not exists public.moments_verite (
  id bigint generated always as identity primary key,
  session_id text not null,
  user_id text not null,              -- email du participant
  bloc_label text not null,
  contenu_texte text,
  type_moment text,
  timestamp bigint default (extract(epoch from now()) * 1000)::bigint
);

create index if not exists moments_verite_session_user_idx
  on public.moments_verite (session_id, user_id);

-- RLS
alter table public.moments_verite enable row level security;

-- Access controlled at API layer (service_role key used); RLS keeps table secure by default.
-- To allow participant reads via JWT: uncomment and adapt the policy below.
-- create policy "moments_verite_own_read" on public.moments_verite
--   for select using (user_id = current_user_email());
create policy "moments_verite_service_all" on public.moments_verite
  for all using (true);  -- service_role key bypasses this; anon key blocked by default


-- 2. TABLE SATISFACTION PAR BLOC
-- Stocke les scores de satisfaction 0-10 donnés après chaque bloc
create table if not exists public.satisfaction_blocs (
  id bigint generated always as identity primary key,
  session_id text not null,
  user_id text not null,              -- email du participant
  bloc_label text not null,
  score integer check (score >= 0 and score <= 10),
  parcours_type text default 'CHA',
  timestamp bigint default (extract(epoch from now()) * 1000)::bigint
);

create index if not exists satisfaction_blocs_session_user_idx
  on public.satisfaction_blocs (session_id, user_id);

-- RLS
alter table public.satisfaction_blocs enable row level security;

-- Access controlled at API layer (service_role key used)
create policy "satisfaction_blocs_service_all" on public.satisfaction_blocs
  for all using (true);


-- 3. COLONNES ADDITIONNELLES sur dbr_participant_profiles (si pas déjà présentes)
alter table public.dbr_participant_profiles
  add column if not exists singularity_phrase text,
  add column if not exists engagements_proches text,
  add column if not exists ritual_trigger text,
  add column if not exists ritual_duration text,
  add column if not exists ritual_output text;
