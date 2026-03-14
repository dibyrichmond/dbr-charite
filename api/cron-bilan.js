import { createClient } from '@supabase/supabase-js'
import { escapeHtml } from './_token.js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE

const supabase = SUPABASE_URL && SUPABASE_SERVICE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  : null

export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  if (!supabase) {
    return res.status(500).json({
      error: 'Supabase server configuration is missing (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).',
    })
  }
  try {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const window = new Date(thirtyDaysAgo.getTime() - 86400000)

    const { data: sessions } = await supabase
      .from('sessions')
      .select('*, profiles(*)')
      .eq('phase', 'conclusion')
      .gte('completed_at', window.toISOString())
      .lte('completed_at', thirtyDaysAgo.toISOString())

    if (!sessions?.length) return res.status(200).json({ message: 'No sessions due' })

    const { data: admins } = await supabase
      .from('profiles').select('email, name').eq('role', 'admin')

    const appUrl = process.env.VITE_APP_URL || 'https://dbr-charite.vercel.app'

    for (const session of sessions) {
      const participant = session.profiles
      if (!participant) continue

      await supabase.from('bilans').insert({
        user_id: participant.id,
        session_id: session.id,
        status: 'pending',
        due_date: new Date().toISOString(),
      })

      const safeName = escapeHtml(participant.name || '')
      const safeEngage = escapeHtml((session.answers?.R_R1 || '').slice(0, 150))
      const html = `<!DOCTYPE html><html><body style="background:#0D0D0D;font-family:system-ui;padding:40px 24px;"><div style="max-width:560px;margin:0 auto;"><div style="text-align:center;margin-bottom:24px;"><div style="font-size:22px;font-weight:900;letter-spacing:6px;color:#E8540A;">DBR</div></div><div style="background:#1A1A1A;border:1px solid rgba(232,84,10,0.3);border-radius:16px;padding:32px;"><div style="font-size:18px;font-weight:700;color:#F0F0F0;margin-bottom:16px;">Ton bilan du mois, ${safeName} 🎯</div>${lastEngage ? `<div style="font-size:13px;color:#8A8A8A;margin-bottom:16px;padding:12px;background:rgba(74,184,232,0.08);border-left:3px solid #4AB8E8;border-radius:4px;">Il y a 30 jours tu t'étais engagé à : <strong style="color:#F0F0F0;">${safeEngage}</strong></div>` : ''}<div style="font-size:14px;color:#AAAAAA;line-height:1.8;margin-bottom:24px;">15 minutes avec toi-même. Réel t'attend là où tu t'es arrêté.</div><a href="${appUrl}" style="display:block;text-align:center;padding:14px;background:linear-gradient(135deg,#E8540A,#C4420A);border-radius:10px;color:#fff;font-weight:700;font-size:15px;text-decoration:none;">Faire mon bilan →</a></div></div></body></html>`

      await fetch(`${appUrl}/api/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Cron-Secret': process.env.CRON_SECRET || '' },
        body: JSON.stringify({ to: participant.email, subject: `${safeName}, ton bilan du mois est prêt`, html }),
      })

      for (const admin of admins || []) {
        await fetch(`${appUrl}/api/email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Cron-Secret': process.env.CRON_SECRET || '' },
          body: JSON.stringify({ to: admin.email, subject: `Bilan disponible — ${safeName}`, html: `<!DOCTYPE html><html><body style="background:#0D0D0D;font-family:system-ui;padding:40px 24px;"><div style="max-width:560px;margin:0 auto;background:#1A1A1A;border:1px solid rgba(74,184,232,0.3);border-radius:16px;padding:32px;"><div style="font-size:10px;letter-spacing:3px;color:#4AB8E8;margin-bottom:12px;">NOTIFICATION ADMIN</div><div style="font-size:16px;font-weight:700;color:#F0F0F0;margin-bottom:12px;">Bilan disponible — ${safeName}</div><a href="${appUrl}" style="display:inline-block;margin-top:16px;padding:10px 20px;background:rgba(74,184,232,0.15);border:1px solid rgba(74,184,232,0.4);border-radius:8px;color:#4AB8E8;font-size:13px;text-decoration:none;">Ouvrir la console →</a></div></body></html>` }),
        })
      }
    }
    return res.status(200).json({ processed: sessions.length })
  } catch {
    return res.status(500).json({ error: 'Erreur serveur' })
  }
}
