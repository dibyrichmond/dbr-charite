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
    return_rule: cleanText(p.return_rule, 1000),
    sprint_notes: (() => {
      const SPRINT_KEYS = new Set(['J1', 'J2-J3', 'J4', 'J5-J6', 'J7']);
      const raw = typeof p.sprint_notes === 'object' && p.sprint_notes ? p.sprint_notes : {};
      const clean = {};
      for (const k of SPRINT_KEYS) { if (typeof raw[k] === 'string') clean[k] = raw[k].trim().slice(0, 500); else clean[k] = ''; }
      return clean;
    })(),
    singularity_phrase: cleanText(p.singularity_phrase, 2000),
    engagements_proches: cleanText(p.engagements_proches, 3000),
    ritual_trigger: cleanText(p.ritual_trigger, 500),
    ritual_duration: cleanText(p.ritual_duration, 200),
    ritual_output: cleanText(p.ritual_output, 500),
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

      if (error) return res.status(500).json({ error: 'Erreur sauvegarde profil : ' + (error.message || error.code || 'erreur inconnue') });
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

    // Admin: add a comment on a participant's blueprint
    if (action === 'admin-comment') {
      if (!await isAdmin(auth.email)) return res.status(403).json({ error: 'Non autorise.' });
      const targetEmail = typeof req.body?.targetEmail === 'string' ? req.body.targetEmail.toLowerCase().trim() : '';
      const comment = typeof req.body?.comment === 'string' ? req.body.comment.trim().slice(0, 2000) : '';
      if (!targetEmail || !comment) return res.status(400).json({ error: 'Email et commentaire requis.' });

      // Get admin name
      const { data: adminUser } = await supabase
        .from('dbr_users')
        .select('name')
        .eq('email', auth.email)
        .maybeSingle();

      // Get current profile to append comment
      const { data: profile } = await supabase
        .from('dbr_participant_profiles')
        .select('admin_comments')
        .eq('email', targetEmail)
        .maybeSingle();

      const existing = Array.isArray(profile?.admin_comments) ? profile.admin_comments : [];
      const newComment = { id: Date.now(), author: auth.email, author_name: adminUser?.name || auth.email, role: 'admin', text: comment, created_at: Date.now() };
      const updated = [...existing, newComment];

      const { error } = await supabase
        .from('dbr_participant_profiles')
        .update({ admin_comments: updated, updated_at: Date.now() })
        .eq('email', targetEmail);

      if (error) return res.status(500).json({ error: 'Erreur ajout commentaire.' });
      return res.status(200).json({ success: true, comments: updated });
    }

    // Participant: add a reply/comment on their own blueprint
    if (action === 'participant-comment') {
      const comment = typeof req.body?.comment === 'string' ? req.body.comment.trim().slice(0, 2000) : '';
      if (!comment) return res.status(400).json({ error: 'Commentaire requis.' });

      // Get participant name
      const { data: pUser } = await supabase
        .from('dbr_users')
        .select('name')
        .eq('email', auth.email)
        .maybeSingle();

      const { data: profile } = await supabase
        .from('dbr_participant_profiles')
        .select('admin_comments')
        .eq('email', auth.email)
        .maybeSingle();

      if (!profile) return res.status(404).json({ error: 'Profil introuvable. Sauvegardez d\'abord votre Blueprint.' });

      const existing = Array.isArray(profile.admin_comments) ? profile.admin_comments : [];
      const newComment = { id: Date.now(), author: auth.email, author_name: pUser?.name || auth.email, role: 'participant', text: comment, created_at: Date.now() };
      const updated = [...existing, newComment];

      const { error } = await supabase
        .from('dbr_participant_profiles')
        .update({ admin_comments: updated, updated_at: Date.now() })
        .eq('email', auth.email);

      if (error) return res.status(500).json({ error: 'Erreur ajout commentaire.' });
      return res.status(200).json({ success: true, comments: updated });
    }

    // Admin: delete a comment
    if (action === 'admin-delete-comment') {
      if (!await isAdmin(auth.email)) return res.status(403).json({ error: 'Non autorise.' });
      const targetEmail = typeof req.body?.targetEmail === 'string' ? req.body.targetEmail.toLowerCase().trim() : '';
      const commentId = req.body?.commentId;
      if (!targetEmail || !commentId) return res.status(400).json({ error: 'Parametres manquants.' });

      const { data: profile } = await supabase
        .from('dbr_participant_profiles')
        .select('admin_comments')
        .eq('email', targetEmail)
        .maybeSingle();

      const existing = Array.isArray(profile?.admin_comments) ? profile.admin_comments : [];
      const updated = existing.filter(c => c.id !== commentId);

      const { error } = await supabase
        .from('dbr_participant_profiles')
        .update({ admin_comments: updated, updated_at: Date.now() })
        .eq('email', targetEmail);

      if (error) return res.status(500).json({ error: 'Erreur suppression commentaire.' });
      return res.status(200).json({ success: true, comments: updated });
    }

    // Admin: validate a blueprint and launch 90-day program
    if (action === 'admin-validate') {
      if (!await isAdmin(auth.email)) return res.status(403).json({ error: 'Non autorise.' });
      const targetEmail = typeof req.body?.targetEmail === 'string' ? req.body.targetEmail.toLowerCase().trim() : '';
      const validated = req.body?.validated === true;
      if (!targetEmail) return res.status(400).json({ error: 'Email requis.' });

      const updateData = {
        admin_validated: validated,
        admin_validated_at: validated ? Date.now() : null,
        admin_validated_by: validated ? auth.email : null,
        program_90_started: validated,
        updated_at: Date.now(),
      };

      const { error } = await supabase
        .from('dbr_participant_profiles')
        .update(updateData)
        .eq('email', targetEmail);

      if (error) return res.status(500).json({ error: 'Erreur validation blueprint.' });
      return res.status(200).json({ success: true });
    }

    // Admin: update a specific field on a participant's blueprint
    if (action === 'admin-update') {
      if (!await isAdmin(auth.email)) return res.status(403).json({ error: 'Non autorise.' });
      const targetEmail = typeof req.body?.targetEmail === 'string' ? req.body.targetEmail.toLowerCase().trim() : '';
      if (!targetEmail) return res.status(400).json({ error: 'Email requis.' });

      const raw = req.body?.updates || {};
      const updates = {};
      if (raw.status !== undefined) {
        const v = cleanChoice(String(raw.status || ''), STATUT_VALUES);
        if (!v) return res.status(400).json({ error: 'Valeur de statut invalide.' });
        updates.status = v;
      }
      if (raw.start_date_j1 !== undefined) {
        const v = cleanDate(String(raw.start_date_j1 || ''));
        if (raw.start_date_j1 && !v) return res.status(400).json({ error: 'Date invalide (YYYY-MM-DD attendu).' });
        updates.start_date_j1 = v;
      }
      if (raw.accompagnement_mode !== undefined) {
        const v = cleanChoice(String(raw.accompagnement_mode || ''), MODE_VALUES);
        if (!v) return res.status(400).json({ error: 'Mode accompagnement invalide.' });
        updates.accompagnement_mode = v;
      }
      if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'Aucune mise a jour fournie.' });
      updates.updated_at = Date.now();

      const { error } = await supabase
        .from('dbr_participant_profiles')
        .update(updates)
        .eq('email', targetEmail);

      if (error) return res.status(500).json({ error: 'Erreur mise a jour.' });
      return res.status(200).json({ success: true });
    }

    // Store moments de vérité (extracted after each bloc validation) — table moments_verite required
    if (action === 'store-moments') {
      const session_id = typeof req.body?.session_id === 'string' ? req.body.session_id.trim().slice(0, 100) : null;
      const bloc_label = typeof req.body?.bloc_label === 'string' ? req.body.bloc_label.trim().slice(0, 50) : null;
      const moments = Array.isArray(req.body?.moments) ? req.body.moments : [];
      if (!session_id || !bloc_label) return res.status(400).json({ error: 'session_id et bloc_label requis.' });
      const rows = moments.map(m => ({
        session_id,
        user_id: auth.email,
        bloc_label,
        contenu_texte: String(m.texte || '').slice(0, 1000),
        type_moment: String(m.type || '').slice(0, 50),
        timestamp: Date.now()
      }));
      if (rows.length > 0) {
        const { error } = await supabase.from('moments_verite').insert(rows);
        // code 42P01 = table doesn't exist yet — silent fail
        if (error && error.code !== '42P01') return res.status(500).json({ error: 'Erreur stockage moments.' });
      }
      return res.status(200).json({ success: true });
    }

    // Get moments de vérité for a session (injected at conclusion)
    if (action === 'get-moments') {
      const session_id = typeof req.body?.session_id === 'string' ? req.body.session_id.trim().slice(0, 100) : null;
      if (!session_id) return res.status(400).json({ error: 'session_id requis.' });
      const { data, error } = await supabase
        .from('moments_verite')
        .select('bloc_label, contenu_texte, type_moment, timestamp')
        .eq('session_id', session_id)
        .eq('user_id', auth.email)
        .order('timestamp', { ascending: true });
      if (error && error.code === '42P01') return res.status(200).json({ moments: [] });
      if (error) return res.status(500).json({ error: 'Erreur lecture moments.' });
      return res.status(200).json({ moments: data || [] });
    }

    // Store satisfaction score for a bloc — table satisfaction_blocs required
    if (action === 'store-satisfaction') {
      const session_id = typeof req.body?.session_id === 'string' ? req.body.session_id.trim().slice(0, 100) : null;
      const bloc_label = typeof req.body?.bloc_label === 'string' ? req.body.bloc_label.trim().slice(0, 50) : null;
      const rawScore = req.body?.score;
      const score = (rawScore !== null && rawScore !== undefined) ? parseInt(rawScore) : null;
      const parcours_type = typeof req.body?.parcours_type === 'string' ? req.body.parcours_type.trim().slice(0, 10) : 'CHA';
      if (!session_id || !bloc_label) return res.status(400).json({ error: 'session_id et bloc_label requis.' });
      const row = {
        session_id,
        user_id: auth.email,
        bloc_label,
        score: score !== null && !isNaN(score) && score >= 0 && score <= 10 ? score : null,
        parcours_type,
        timestamp: Date.now()
      };
      const { error } = await supabase.from('satisfaction_blocs').insert(row);
      if (error && error.code !== '42P01') return res.status(500).json({ error: 'Erreur stockage satisfaction.' });
      return res.status(200).json({ success: true });
    }

    // Admin: get satisfaction scores for a given user — requires admin role
    if (action === 'admin-get-satisfaction') {
      const adminOk = await isAdmin(auth.email);
      if (!adminOk) return res.status(403).json({ error: 'Accès refusé.' });
      const targetEmail = typeof req.body?.targetEmail === 'string' ? req.body.targetEmail.trim().toLowerCase().slice(0, 200) : null;
      if (!targetEmail) return res.status(400).json({ error: 'targetEmail requis.' });
      const { data, error } = await supabase
        .from('satisfaction_blocs')
        .select('session_id, bloc_label, score, timestamp')
        .eq('user_id', targetEmail)
        .order('timestamp', { ascending: true });
      if (error && error.code === '42P01') return res.status(200).json({ scores: [] });
      if (error) return res.status(500).json({ error: 'Erreur lecture satisfaction.' });
      return res.status(200).json({ scores: data || [] });
    }

    return res.status(400).json({ error: 'Action invalide.' });
  } catch (err) {
    return res.status(500).json({ error: 'Erreur serveur: ' + (err.message || 'inconnue') });
  }
}

export default cors(handler);
