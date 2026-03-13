// Proxy Deepgram — retourne la clé temporaire au client
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  
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
      // Fallback : retourner la clé directement (moins sécurisé mais fonctionnel)
      return res.status(200).json({ key: apiKey, temp: false })
    }

    const data = await response.json()
    return res.status(200).json({ key: data.key, temp: true })
  } catch (error) {
    // Fallback sur erreur
    return res.status(200).json({ key: apiKey, temp: false })
  }
}
