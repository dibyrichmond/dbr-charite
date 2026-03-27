import { createClient } from '@supabase/supabase-js'
import { verifyToken } from './_token.js'
import { cors } from './_cors.js'

const supabase = (() => {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  return url && key ? createClient(url, key) : null;
})();

async function isAdmin(email) {
  if (!email || !supabase) return false;
  const { data } = await supabase
    .from('dbr_users')
    .select('is_admin')
    .eq('email', email.toLowerCase().trim())
    .maybeSingle();
  return data?.is_admin === true;
}

const DISCIPLINE_VALUES = new Set(['30', '45', '60']);
const PARCOURS_VALUES = new Set(['CHA', 'RITE']);
const MODE_VALUES = new Set(['REEL', 'B2B', 'DUO']);
const STATUT_VALUES = new Set(['SPRINT', 'ACTIF', 'PAUSE', 'TERMINE']);

function cleanText(v, max = 5000) {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  if (!t) return null;
  return t.slice(0, max);
}

function cleanChoice(v, allowed) {
  if (typeof v !== 'string') return null;
  const c = v.trim().toUpperCase();
  return allowed.has(c) ? c : null;
}

function cleanTime(v) {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(t) ? t : null;
}

function cleanDate(v) {
  if (typeof v !== 'string') return null;
  const d = v.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
}

function cleanPhone(v) {
  if (typeof v !== 'string') return null;
  const p = v.trim();
  return p ? p.slice(0, 80) : null;
}

function sanitizePayload(payload) {
  const p = payload || {};
  return {
    dream_root: cleanText(p.dream_root, 3000),
    discipline_minutes: cleanChoice(String(p.discipline_minutes || ''), DISCIPLINE_VALUES),
    meeting_time: cleanTime(p.meeting_time),
    fallback_time: cleanTime(p.fallback_time),
    start_date_j1: cleanDate(p.start_date_j1),
    parcours_dbr: cleanChoice(String(p.parcours_dbr || ''), PARCOURS_VALUES),
    accompagnement_mode: cleanChoice(String(p.accompagnement_mode || ''), MODE_VALUES),
    copilot_name: cleanText(p.copilot_name, 300),
    copilot_contact: cleanPhone(p.copilot_contact),
    status: cleanChoice(String(p.status || ''), STATUT_VALUES),
    micro_action_1: cleanText(p.micro_action_1, 500),
    micro_action_2: cleanText(p.micro_action_2, 500),
    micro_action_3: cleanText(p.micro_action_3, 500),
    return_rule: cleanText(p.return_rule, 1000),
    sprint_notes: typeof p.sprint_notes === 'object' && p.sprint_notes ? p.sprint_notes : {},
    updated_at: Date.now(),
  };
}

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!supabase) return res.status(500).json({ error: 'Base de donnees non configuree.' });

  const auth = verifyToken(req.headers.authorization);
  if (!auth) return res.status(401).json({ error: 'Session expiree. Reconnecte-toi.' });

  const { action } = req.body || {};

  try {
    if (action === 'get') {
      const target = typeof req.body?.targetEmail === 'string' ? req.body.targetEmail.toLowerCase().trim() : auth.email;
      if (target !== auth.email && !await isAdmin(auth.email)) return res.status(403).json({ error: 'Non autorise.' });

      const { data, error } = await supabase
        .from('dbr_participant_profiles')
        .select('*')
        .eq('email', target)
        .maybeSingle();

      if (error) return res.status(500).json({ error: 'Erreur lecture profil.' });
      return res.status(200).json({ profile: data || null });
    }

    if (action === 'upsert') {
      const payload = sanitizePayload(req.body?.profile);
      const row = { email: auth.email, ...payload };

      const { error } = await supabase
        .from('dbr_participant_profiles')
        .upsert(row, { onConflict: 'email' });

      if (error) return res.status(500).json({ error: 'Erreur sauvegarde profil.' });
      return res.status(200).json({ success: true });
    }

    if (action === 'list') {
      if (!await isAdmin(auth.email)) return res.status(403).json({ error: 'Non autorise.' });
      const { data, error } = await supabase
        .from('dbr_participant_profiles')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) return res.status(500).json({ error: 'Erreur lecture profils.' });
      return res.status(200).json({ profiles: data || [] });
    }

    return res.status(400).json({ error: 'Action invalide.' });
  } catch (err) {
    return res.status(500).json({ error: 'Erreur serveur: ' + (err.message || 'inconnue') });
  }
}

export default cors(handler);
