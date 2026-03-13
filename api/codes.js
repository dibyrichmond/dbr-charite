import { createClient } from '@supabase/supabase-js'

const supabase = (() => {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  return url && key ? createClient(url, key) : null;
})();

function genCode() { return Math.random().toString(36).slice(2, 8).toUpperCase(); }

async function isAdmin(email) {
  if (!email || !supabase) return false;
  const { data } = await supabase.from('dbr_users').select('is_admin').eq('email', email.toLowerCase().trim()).maybeSingle();
  return data?.is_admin === true;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!supabase) return res.status(500).json({ error: 'Base de données non configurée.' });

  const { action, adminEmail } = req.body || {};
  if (!await isAdmin(adminEmail)) return res.status(403).json({ error: 'Non autorisé.' });

  try {
    // ── LIST CODES ──
    if (action === 'list') {
      const { data, error } = await supabase
        .from('dbr_codes').select('*').order('created_at', { ascending: false });
      if (error) return res.status(500).json({ error: 'Erreur lecture codes.' });
      return res.status(200).json({ codes: data || [] });
    }

    // ── CREATE CODES ──
    if (action === 'create') {
      const { role, forEmail, count } = req.body;
      const email = typeof forEmail === 'string' ? forEmail.trim().toLowerCase() : '';
      const cnt = email ? 1 : Math.max(1, Math.min(10, parseInt(count) || 1));
      const WEEK = 7 * 24 * 3600 * 1000;
      const newCodes = Array.from({ length: cnt }, () => ({
        code: genCode(),
        created_by: adminEmail,
        created_at: Date.now(),
        role: role || 'participant',
        ...(email ? { for_email: email, expires_at: Date.now() + WEEK } : {}),
      }));
      const { error } = await supabase.from('dbr_codes').insert(newCodes);
      if (error) return res.status(500).json({ error: 'Erreur création codes: ' + error.message });
      return res.status(200).json({ created: newCodes.length, codes: newCodes });
    }

    // ── DELETE CODE ──
    if (action === 'delete') {
      const { codeId } = req.body;
      if (!codeId) return res.status(400).json({ error: 'ID requis.' });
      const { error } = await supabase.from('dbr_codes').delete().eq('id', codeId);
      if (error) return res.status(500).json({ error: 'Erreur suppression.' });
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: 'Action invalide.' });
  } catch (err) {
    return res.status(500).json({ error: 'Erreur serveur: ' + (err.message || 'inconnue') });
  }
}
