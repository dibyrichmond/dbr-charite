import { createClient } from '@supabase/supabase-js'

const supabase = (() => {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  return url && key ? createClient(url, key) : null;
})();

function hashPwd(p) {
  let h = 5381;
  for (let i = 0; i < p.length; i++) h = ((h << 5) + h) ^ p.charCodeAt(i);
  return (h >>> 0).toString(36);
}

function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length < 200;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!supabase) return res.status(500).json({ error: 'Base de données non configurée. Configure SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY.' });

  const { action, email, password, name, invCode } = req.body || {};
  const em = typeof email === 'string' ? email.toLowerCase().trim() : '';
  if (!em || !isValidEmail(em)) return res.status(400).json({ error: 'Email invalide.' });

  try {
    // ── LOGIN ──
    if (action === 'login') {
      if (!password) return res.status(400).json({ error: 'Mot de passe requis.' });
      const { data: user, error } = await supabase
        .from('dbr_users').select('*').eq('email', em).single();
      if (error || !user) return res.status(401).json({ error: 'Aucun compte avec cet email.' });
      if (user.hash !== hashPwd(password)) return res.status(401).json({ error: 'Mot de passe incorrect.' });
      if (!user.approved && !user.is_admin) return res.status(403).json({ error: "Ton compte est en attente d'approbation." });
      return res.status(200).json({
        user: { email: user.email, name: user.name, isAdmin: user.is_admin || false, role: user.role || 'participant' }
      });
    }

    // ── REGISTER ──
    if (action === 'register') {
      if (!password || !name || !invCode) return res.status(400).json({ error: "Remplis tous les champs, y compris le code d'invitation." });
      if (typeof password !== 'string' || password.length < 6) return res.status(400).json({ error: '6 caractères minimum.' });
      if (typeof name !== 'string' || name.trim().length < 1) return res.status(400).json({ error: 'Prénom requis.' });

      const { data: existing } = await supabase
        .from('dbr_users').select('email').eq('email', em).maybeSingle();
      if (existing) return res.status(400).json({ error: 'Email déjà utilisé.' });

      const code = typeof invCode === 'string' ? invCode.trim().toUpperCase() : '';
      const { data: codeObj, error: codeErr } = await supabase
        .from('dbr_codes').select('*').eq('code', code).is('used_by', null).maybeSingle();
      if (codeErr || !codeObj) return res.status(400).json({ error: "Code d'invitation invalide ou déjà utilisé." });
      if (codeObj.expires_at && Date.now() > codeObj.expires_at) return res.status(400).json({ error: 'Ce code a expiré. Demande un nouveau code.' });
      if (codeObj.for_email && codeObj.for_email !== em) return res.status(400).json({ error: 'Ce code est réservé à une autre adresse email.' });

      const { error: insertErr } = await supabase.from('dbr_users').insert({
        email: em,
        name: name.trim(),
        hash: hashPwd(password),
        is_admin: false,
        role: codeObj.role || 'participant',
        created_at: Date.now(),
        approved: true,
        invited_by: codeObj.created_by,
      });
      if (insertErr) return res.status(500).json({ error: 'Erreur création compte: ' + insertErr.message });

      await supabase.from('dbr_codes').update({
        used_by: em,
        used_at: Date.now(),
      }).eq('id', codeObj.id);

      return res.status(200).json({
        user: { email: em, name: name.trim(), isAdmin: false, role: codeObj.role || 'participant' }
      });
    }

    // ── RESET PASSWORD ──
    if (action === 'reset') {
      const { data: user } = await supabase
        .from('dbr_users').select('email').eq('email', em).maybeSingle();
      if (!user) return res.status(400).json({ error: 'Aucun compte trouvé.' });
      const tmp = Math.random().toString(36).slice(2, 8).toUpperCase();
      await supabase.from('dbr_users').update({ hash: hashPwd(tmp) }).eq('email', em);
      return res.status(200).json({ tempPassword: tmp });
    }

    return res.status(400).json({ error: 'Action invalide.' });
  } catch (err) {
    return res.status(500).json({ error: 'Erreur serveur: ' + (err.message || 'inconnue') });
  }
}
