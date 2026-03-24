import { createClient } from '@supabase/supabase-js'
import { verifyToken } from './_token.js'

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

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!supabase) return res.status(500).json({ error: 'Base de données non configurée.' });

  const auth = verifyToken(req.headers.authorization);
  if (!auth) return res.status(401).json({ error: 'Session expirée. Reconnecte-toi.' });

  const { action } = req.body || {};

  try {
    // ── SAVE SESSION (any authenticated user) ──
    if (action === 'save') {
      const { session } = req.body;
      if (!session || typeof session !== 'object') return res.status(400).json({ error: 'Session invalide.' });

      // Limit payload size (msgs, api_hist can be large)
      const data = {
        email: auth.email,
        msgs: Array.isArray(session.msgs) ? session.msgs.slice(-200) : [],
        bi: typeof session.bi === 'number' ? session.bi : 0,
        qi: typeof session.qi === 'number' ? session.qi : 0,
        answers: session.answers || {},
        syntheses: session.syntheses || {},
        validated: session.validated || {},
        api_hist: Array.isArray(session.apiHist) ? session.apiHist.slice(-100) : [],
        blocs: Array.isArray(session.blocs) ? session.blocs : [],
        bloc_label: typeof session.blocLabel === 'string' ? session.blocLabel.slice(0, 100) : null,
        q_title: typeof session.qTitle === 'string' ? session.qTitle.slice(0, 200) : null,
        phase: typeof session.phase === 'string' ? session.phase.slice(0, 20) : 'program',
        total_time: typeof session.totalTime === 'number' ? session.totalTime : 0,
        saved_at: Date.now(),
        completed_at: session.completedAt || null,
      };

      // Upsert: one active session per email
      const { data: existing } = await supabase
        .from('dbr_sessions').select('id').eq('email', auth.email).is('completed_at', null).order('saved_at', { ascending: false }).limit(1).maybeSingle();

      if (existing) {
        await supabase.from('dbr_sessions').update(data).eq('id', existing.id);
      } else {
        await supabase.from('dbr_sessions').insert(data);
      }

      return res.status(200).json({ success: true });
    }

    // ── GET SESSION (admin: any user; participant: own only) ──
    if (action === 'get') {
      const { targetEmail } = req.body;
      const email = targetEmail ? targetEmail.toLowerCase().trim() : auth.email;
      if (email !== auth.email && !await isAdmin(auth.email)) {
        return res.status(403).json({ error: 'Non autorisé.' });
      }

      const { data: sessions } = await supabase
        .from('dbr_sessions').select('*').eq('email', email).order('saved_at', { ascending: false }).limit(10);

      return res.status(200).json({ sessions: sessions || [] });
    }

    // ── STATS (admin only: session stats for all users) ──
    if (action === 'stats') {
      if (!await isAdmin(auth.email)) return res.status(403).json({ error: 'Non autorisé.' });

      const { data: sessions } = await supabase
        .from('dbr_sessions').select('email, phase, saved_at, completed_at, bloc_label, q_title');

      // Aggregate: one entry per user (most recent session)
      const byUser = {};
      for (const s of (sessions || [])) {
        if (!byUser[s.email] || s.saved_at > byUser[s.email].saved_at) {
          byUser[s.email] = s;
        }
      }
      const userStats = Object.values(byUser);
      return res.status(200).json({
        started: userStats.filter(s => s.saved_at).length,
        completed: userStats.filter(s => s.phase === 'conclusion' || s.completed_at).length,
        details: userStats,
      });
    }

    return res.status(400).json({ error: 'Action invalide.' });
  } catch (err) {
    return res.status(500).json({ error: 'Erreur serveur: ' + (err.message || 'inconnue') });
  }
}
