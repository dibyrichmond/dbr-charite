import crypto from 'crypto';

const SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// ── Signed JWT-like token ──
export function createToken(email, isAdmin) {
  const payload = Buffer.from(JSON.stringify({
    email: email.toLowerCase().trim(),
    adm: !!isAdmin,
    exp: Date.now() + 24 * 3600 * 1000
  })).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifyToken(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  const i = token.lastIndexOf('.');
  if (i < 1) return null;
  const payload = token.slice(0, i);
  const sig = token.slice(i + 1);
  const expected = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
  if (sig.length !== expected.length) return null;
  try { if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null; } catch { return null; }
  try {
    const d = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (!d.exp || d.exp < Date.now() || !d.email) return null;
    return d;
  } catch { return null; }
}

// ── Password hashing (PBKDF2) ──
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `pbkdf2$${salt}$${hash}`;
}

function legacyHash(p) {
  let h = 5381;
  for (let i = 0; i < p.length; i++) h = ((h << 5) + h) ^ p.charCodeAt(i);
  return (h >>> 0).toString(36);
}

export function verifyPassword(password, stored) {
  if (stored.startsWith('pbkdf2$')) {
    const [, salt, hash] = stored.split('$');
    if (!salt || !hash) return false;
    const check = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    try { return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(check, 'hex')); } catch { return false; }
  }
  return stored === legacyHash(password);
}

export function isLegacyHash(stored) {
  return typeof stored === 'string' && !stored.startsWith('pbkdf2$');
}

// ── HTML escaping ──
export function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
