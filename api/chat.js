// Rate limiting simple par IP
const rateLimitMap = new Map();
function checkRateLimit(ip) {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxRequests = 30;
  const entry = rateLimitMap.get(ip) || { count: 0, start: now };
  if (now - entry.start > windowMs) { rateLimitMap.set(ip, { count: 1, start: now }); return true; }
  if (entry.count >= maxRequests) return false;
  entry.count++; rateLimitMap.set(ip, entry); return true;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  if (!checkRateLimit(ip)) return res.status(429).json({ error: 'Trop de requêtes. Attends une minute.' });

  const { max_tokens, messages, system, model } = req.body;
  if (!messages || !Array.isArray(messages) || messages.length === 0)
    return res.status(400).json({ error: 'Messages invalides' });
  if (messages.length > 100) return res.status(400).json({ error: 'Historique trop long' });

  // Whitelist modèles autorisés
  const ALLOWED_MODELS = ['claude-sonnet-4-20250514','claude-haiku-4-5-20251001'];
  const safeModel = ALLOWED_MODELS.includes(model) ? model : 'claude-sonnet-4-20250514';

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Configuration serveur manquante' });

  const safeMessages = messages
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map(m => ({ role: m.role, content: m.content.slice(0, 8000) }));

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: safeModel,
        max_tokens: Math.min(max_tokens || 1024, 2048),
        system: typeof system === 'string' ? system.slice(0, 10000) : '',
        messages: safeMessages,
      }),
    });
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data.error?.message || 'Erreur API' });
    return res.status(200).json(data);
  } catch {
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}
