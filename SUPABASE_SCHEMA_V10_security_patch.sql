-- ═══════════════════════════════════════════════════════════
-- DBR CHARITÉ V10 — Security patch (Supabase linter alerts)
-- À exécuter dans Supabase SQL Editor APRÈS V9
-- ═══════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────
-- 1. RLS policies USING(true) — trop permissives
-- ──────────────────────────────────────────────────────────
-- Le service_role contourne le RLS par défaut : aucune policy
-- n'est nécessaire pour lui. Les policies USING(true) pour ALL
-- accordaient un accès non restreint à anon + authenticated,
-- ce qui bypass complètement la sécurité en lecture/écriture.
-- → On les supprime. L'accès API (service_role) continue de fonctionner.

drop policy if exists "moments_verite_service_all" on public.moments_verite;
drop policy if exists "satisfaction_blocs_service_all" on public.satisfaction_blocs;

-- Optionnel : confirmer que RLS est bien actif sur ces tables
-- (déjà activé en V9, mais on s'en assure)
alter table public.moments_verite enable row level security;
alter table public.satisfaction_blocs enable row level security;


-- ──────────────────────────────────────────────────────────
-- 2. Fonctions SECURITY DEFINER accessibles publiquement
-- ──────────────────────────────────────────────────────────
-- handle_new_user() et is_admin() ne doivent pas être appelables
-- via /rest/v1/rpc/ par des utilisateurs non authentifiés ou anonymes.
-- L'app utilise uniquement le service_role côté API Vercel.

revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.handle_new_user() from authenticated;

revoke execute on function public.is_admin() from public;
revoke execute on function public.is_admin() from anon;
revoke execute on function public.is_admin() from authenticated;


-- ──────────────────────────────────────────────────────────
-- 3. Leaked Password Protection (auth_leaked_password_protection)
-- ──────────────────────────────────────────────────────────
-- Cette alerte concerne Supabase Auth (HaveIBeenPwned check).
-- DBR CHARITÉ utilise un auth entièrement custom (PBKDF2 + HMAC
-- via Vercel serverless — api/auth.js, api/_token.js).
-- Supabase Auth n'est pas utilisé pour les connexions participant.
--
-- Action requise : Dashboard Supabase → Authentication →
--   Providers → Email → activer "Leaked password protection"
-- Cela n'affecte pas le flux custom mais fait taire l'alerte.
-- (Pas de SQL possible pour cette option, c'est un setting UI)
