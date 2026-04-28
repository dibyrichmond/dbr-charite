const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);

export function cors(handler) {
  return async (req, res) => {
    const origin = req.headers.origin;
    // If CORS_ORIGINS is configured, only allow listed origins.
    // If not configured (dev mode), only allow localhost to avoid open CORS in production.
    const isDev = !process.env.VERCEL_ENV || process.env.VERCEL_ENV === 'development';
    const isLocalhostOrigin = origin && (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1'));
    const allowed = origin && (
      ALLOWED_ORIGINS.includes(origin) ||
      (ALLOWED_ORIGINS.length === 0 && (isDev || isLocalhostOrigin))
    );
    if (allowed) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Cron-Secret');
      res.setHeader('Access-Control-Max-Age', '86400');
    }

    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }

    return handler(req, res);
  };
}
