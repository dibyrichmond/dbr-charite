import { createClient } from '@supabase/supabase-js'
import { cors } from './_cors.js'
import { verifyToken } from './_token.js'

const supabase = (() => {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
})();

// Persistent rate limiting via Supabase
const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 30;

async function checkRateLimit(email) {
  if (!supabase) return null;
  const now = Date.now();
  const key = `user:${email.toLowerCase().trim()}`;

  try {
    const { data, error } = await supabase
      .from('dbr_rate_limits')
      .select('count, window_start')
      .eq('ip', key)
      .maybeSingle();

    if (error) throw error;

    if (!data || now - data.window_start > WINDOW_MS) {
      const { error: upsertError } = await supabase
        .from('dbr_rate_limits')
        .upsert({ ip: key, count: 1, window_start: now }, { onConflict: 'ip' });

      if (upsertError) throw upsertError;
      return true;
    }

    if (data.count >= MAX_REQUESTS) return false;

    const { error: updateError } = await supabase
      .from('dbr_rate_limits')
      .update({ count: data.count + 1 })
      .eq('ip', key);

    if (updateError) throw updateError;
    return true;
  } catch {
    return null;
  }
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = verifyToken(req.headers.authorization);
  if (!auth) {
    return res.status(401).json({ error: 'Session expirée. Reconnecte-toi.' });
  }

  const rateLimit = await checkRateLimit(auth.email);
  if (rateLimit === null) {
    return res.status(503).json({ error: 'Service temporairement indisponible.' });
  }
  if (!rateLimit) {
    return res.status(429).json({ error: 'Trop de requêtes. Attends une minute.' });
  }

  const { max_tokens, messages, system } = req.body || {};

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Messages invalides' });
  }

  if (messages.length > 100) {
    return res.status(400).json({ error: 'Historique trop long' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const workspaceId = process.env.ANTHROPIC_WORKSPACE_ID;

  if (!apiKey) {
    return res.status(500).json({ error: 'Configuration serveur manquante' });
  }

  const safeMessages = messages
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map(m => ({ role: m.role, content: m.content.slice(0, 8000) }));

  if (safeMessages.length === 0) {
    return res.status(400).json({ error: 'Messages invalides' });
  }

  const requestedMaxTokens = Number(max_tokens);
  const safeMaxTokens = Number.isFinite(requestedMaxTokens)
    ? Math.max(1, Math.min(Math.floor(requestedMaxTokens), 2048))
    : 1024;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        ...(workspaceId ? { 'anthropic-workspace-id': workspaceId } : {}),
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-latest',
        max_tokens: safeMaxTokens,
        system: typeof system === 'string' ? system.slice(0, 10000) : '',
        messages: safeMessages,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error?.message || 'Erreur API'
      });
    }

    return res.status(200).json(data);
  } catch {
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

export default cors(handler);
