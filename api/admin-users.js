import { createClient } from '@supabase/supabase-js'
import { verifyToken } from './_token.js'
import { cors } from './_cors.js'

const SUPER_ADMIN = process.env.SUPER_ADMIN_EMAIL || 'dibyrichmond@gmail.com';

const supabase = (() => {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  return url && key ? createClient(url, key) : null;
})();

async function isAdmin(email) {
  if (!email || !supabase) return false;
  const { data } = await supabase.from('dbr_users').select('is_admin').eq('email', email.toLowerCase().trim()).maybeSingle();
  return data?.is_admin === true;
}

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!supabase) return res.status(500).json({ error: 'Base de données non configurée.' });

  const auth = verifyToken(req.headers.authorization);
  if (!auth) return res.status(401).json({ error: 'Session expirée. Reconnecte-toi.' });
  const adminEmail = auth.email;
  const { action } = req.body || {};
  if (!await isAdmin(adminEmail)) return res.status(403).json({ error: 'Non autorisé.' });

  try {
    // ── LIST USERS ──
    if (action === 'list') {
      const { data, error } = await supabase
        .from('dbr_users').select('*').order('created_at', { ascending: false });
      if (error) return res.status(500).json({ error: 'Erreur lecture utilisateurs.' });
      return res.status(200).json({ users: data || [] });
    }

    // ── TOGGLE ADMIN ──
    if (action === 'toggle-admin') {
      const { targetEmail } = req.body;
      if (!targetEmail || targetEmail === SUPER_ADMIN) return res.status(403).json({ error: 'Impossible de modifier le super admin.' });
      const { data: user } = await supabase
        .from('dbr_users').select('is_admin').eq('email', targetEmail).maybeSingle();
      if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé.' });
      const newIsAdmin = !user.is_admin;
      const { error } = await supabase.from('dbr_users').update({
        is_admin: newIsAdmin,
        role: newIsAdmin ? 'admin' : 'participant',
      }).eq('email', targetEmail);
      if (error) return res.status(500).json({ error: 'Erreur mise à jour.' });
      return res.status(200).json({ success: true });
    }

    // ── REMOVE USER ──
    if (action === 'remove') {
      const { targetEmail } = req.body;
      if (!targetEmail || targetEmail === SUPER_ADMIN || targetEmail === adminEmail)
        return res.status(403).json({ error: 'Suppression non autorisée.' });
      const { error } = await supabase.from('dbr_users').delete().eq('email', targetEmail);
      if (error) return res.status(500).json({ error: 'Erreur suppression.' });
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: 'Action invalide.' });
  } catch {
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
}

export default cors(handler);
