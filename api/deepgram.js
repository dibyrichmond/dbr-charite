import { verifyToken } from './_token.js'
import { cors } from './_cors.js'

// Proxy Deepgram — retourne la clé temporaire au client
async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const auth = verifyToken(req.headers.authorization)
  if (!auth) return res.status(401).json({ error: 'Non autorisé' })

  const apiKey = process.env.DEEPGRAM_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'DEEPGRAM_API_KEY not configured' })

  try {
    // Créer une clé temporaire Deepgram (expire dans 30s)
    const response = await fetch('https://api.deepgram.com/v1/auth/grant', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${apiKey}`,
      },
      body: JSON.stringify({ time_to_live_in_seconds: 30 }),
    })

    if (!response.ok) {
      return res.status(502).json({ error: 'Erreur Deepgram' })
    }

    const data = await response.json()
    return res.status(200).json({ key: data.key, temp: true })
  } catch {
    return res.status(500).json({ error: 'Erreur serveur' })
  }
}

export default cors(handler);
