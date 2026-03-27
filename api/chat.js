import { createClient } from '@supabase/supabase-js'
import { cors } from './_cors.js'

const supabase = (() => {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
})();

// Persistent rate limiting via Supabase
const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 30;

async function checkRateLimit(ip) {
  if (!supabase) return true; // If no DB, allow (fallback)
  const now = Date.now();
  try {
    const { data } = await supabase.from('dbr_rate_limits').select('count, window_start').eq('ip', ip).maybeSingle();
    if (!data || now - data.window_start > WINDOW_MS) {
      await supabase.from('dbr_rate_limits').upsert({ ip, count: 1, window_start: now }, { onConflict: 'ip' });
      return true;
    }
    if (data.count >= MAX_REQUESTS) return false;
    await supabase.from('dbr_rate_limits').update({ count: data.count + 1 }).eq('ip', ip);
    return true;
  } catch {
    return true; // On error, allow request
  }
}

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  if (!(await checkRateLimit(ip))) return res.status(429).json({ error: 'Trop de requêtes. Attends une minute.' });

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

export default cors(handler);
