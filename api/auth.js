import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { createToken, hashPassword, verifyPassword, isLegacyHash } from './_token.js'
import { cors } from './_cors.js'

const supabase = (() => {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  return url && key ? createClient(url, key) : null;
})();

function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length < 200;
}

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!supabase) return res.status(500).json({ error: 'Base de données non configurée. Configure SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY.' });

  const { action, email, password, name, invCode } = req.body || {};
  const em = typeof email === 'string' ? email.toLowerCase().trim() : '';

  // reset-confirm uses token, not email - skip email validation for it
  if (action !== 'reset-confirm') {
    if (!em || !isValidEmail(em)) return res.status(400).json({ error: 'Email invalide.' });
  }

  try {
    // ── LOGIN ──
    if (action === 'login') {
      if (!password) return res.status(400).json({ error: 'Mot de passe requis.' });
      const { data: user, error } = await supabase
        .from('dbr_users').select('*').eq('email', em).single();
      if (error || !user) return res.status(401).json({ error: 'Aucun compte avec cet email.' });
      if (!verifyPassword(password, user.hash)) return res.status(401).json({ error: 'Mot de passe incorrect.' });
      if (isLegacyHash(user.hash)) await supabase.from('dbr_users').update({ hash: hashPassword(password) }).eq('email', em);
      if (!user.approved && !user.is_admin) return res.status(403).json({ error: "Ton compte est en attente d'approbation." });
      return res.status(200).json({
        token: createToken(em, user.is_admin),
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
        hash: hashPassword(password),
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
        token: createToken(em, false),
        user: { email: em, name: name.trim(), isAdmin: false, role: codeObj.role || 'participant' }
      });
    }

    // ── RESET PASSWORD - send email link ──
    if (action === 'reset') {
      // Always return same message to not reveal if account exists
      const successMsg = 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé. Vérifie ta boîte de réception (et tes spams).';
      const { data: user } = await supabase
        .from('dbr_users').select('email, name').eq('email', em).maybeSingle();
      if (!user) return res.status(200).json({ message: successMsg });

      const token = crypto.randomBytes(32).toString('hex');
      const expires = Date.now() + 30 * 60 * 1000; // 30 minutes
      await supabase.from('dbr_users').update({ reset_token: token, reset_token_expires: expires }).eq('email', em);

      const baseUrl = 'https://' + (process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL || 'dbr-charite.vercel.app');
      const resetLink = `${baseUrl}/?reset_token=${token}`;
      const apiKey = process.env.RESEND_API_KEY || process.env.DBR_RESEND;
      if (apiKey) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
          body: JSON.stringify({
            from: 'Réel, Compagnon DBR <onboarding@resend.dev>',
            to: [em],
            subject: 'Réinitialisation de ton mot de passe · DBR Méthode CHARITÉ',
            html: `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px;background:#0D0D0D;color:#F0F0F0;border-radius:12px;">
              <div style="text-align:center;margin-bottom:20px;">
                <span style="font-size:28px;font-weight:900;color:#E8540A;letter-spacing:4px;">DBR</span>
                <div style="font-size:11px;color:#4AB8E8;letter-spacing:3px;margin-top:4px;">MÉTHODE CHARITÉ</div>
              </div>
              <p>Bonjour <strong>${user.name || ''}</strong>,</p>
              <p>Tu as demandé la réinitialisation de ton mot de passe.</p>
              <p style="text-align:center;margin:24px 0;">
                <a href="${resetLink}" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#E8540A,#C4420A);color:#fff;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;">Créer un nouveau mot de passe</a>
              </p>
              <p style="font-size:12px;color:#8A8A8A;">Ce lien expire dans 30 minutes. Si tu n'as pas demandé cette réinitialisation, ignore cet email.</p>
            </div>`
          })
        });
      }
      return res.status(200).json({ message: successMsg });
    }

    // ── RESET CONFIRM - set new password from token ──
    if (action === 'reset-confirm') {
      const { token: resetToken, newPassword } = req.body || {};
      if (!resetToken || typeof resetToken !== 'string') return res.status(400).json({ error: 'Token manquant.' });
      if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) return res.status(400).json({ error: '6 caractères minimum pour le mot de passe.' });
      if (resetToken.length !== 64 || !/^[a-f0-9]+$/.test(resetToken)) return res.status(400).json({ error: 'Token invalide.' });

      const { data: user } = await supabase
        .from('dbr_users').select('*').eq('reset_token', resetToken).maybeSingle();
      if (!user || !user.reset_token_expires || user.reset_token_expires < Date.now()) {
        return res.status(400).json({ error: 'Lien expiré ou invalide. Demande un nouveau lien de réinitialisation.' });
      }

      await supabase.from('dbr_users').update({
        hash: hashPassword(newPassword),
        reset_token: null,
        reset_token_expires: null
      }).eq('email', user.email);

      return res.status(200).json({
        token: createToken(user.email, user.is_admin),
        user: { email: user.email, name: user.name, isAdmin: user.is_admin || false, role: user.role || 'participant' }
      });
    }

    return res.status(400).json({ error: 'Action invalide.' });
  } catch (err) {
    return res.status(500).json({ error: 'Erreur serveur: ' + (err.message || 'inconnue') });
  }
}

export default cors(handler);
