import { verifyToken } from './_token.js'
import { cors } from './_cors.js'

// Validation email basique
function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length < 200;
}

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const cronSecret = process.env.CRON_SECRET;
  const isInternal = cronSecret && req.headers['x-cron-secret'] === cronSecret;
  if (!isInternal && !verifyToken(req.headers.authorization)) return res.status(401).json({ error: 'Non autorisé' });

  const { to, subject, html } = req.body;
  if (!to || !subject || !html) return res.status(400).json({ error: 'Missing fields' });
  if (!isValidEmail(typeof to === 'string' ? to : to[0])) return res.status(400).json({ error: 'Email invalide' });
  if (typeof subject !== 'string' || subject.length > 200) return res.status(400).json({ error: 'Sujet invalide' });
  if (typeof html !== 'string' || html.length > 50000) return res.status(400).json({ error: 'Contenu trop long' });

  const apiKey = process.env.RESEND_API_KEY || process.env.DBR_RESEND;
  if (!apiKey) return res.status(500).json({ error: 'RESEND_API_KEY not configured' });

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || 'Réel — Compagnon DBR <onboarding@resend.dev>',
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
      }),
    });
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json(data);
    return res.status(200).json({ success: true, id: data.id });
  } catch {
    return res.status(500).json({ error: 'Erreur envoi email' });
  }
}

export default cors(handler);
