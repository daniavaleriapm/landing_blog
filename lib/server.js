// Utilidades del servidor: base de datos (Upstash Redis o archivos locales), autenticación y validación
const crypto = require('crypto'), fs = require('fs'), path = require('path');
const RURL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const RTOK = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const dir = path.join(process.cwd(), '.data');
const fail = (code, msg) => Object.assign(new Error(msg), { code });

async function redis(cmd) {
  const r = await fetch(RURL, { method: 'POST', headers: { Authorization: 'Bearer ' + RTOK }, body: JSON.stringify(cmd) });
  const j = await r.json(); if (j.error) throw new Error(j.error); return j.result;
}
const db = {
  async get(k, def) {
    if (RURL) { const v = await redis(['GET', k]); return v ? JSON.parse(v) : def; }
    try { return JSON.parse(fs.readFileSync(path.join(dir, k + '.json'), 'utf8')); } catch { return def; }
  },
  async set(k, v) {
    if (RURL) return redis(['SET', k, JSON.stringify(v)]);
    if (process.env.VERCEL) throw fail(503, 'Falta conectar la base de datos (Upstash Redis) en Vercel');
    fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(path.join(dir, k + '.json'), JSON.stringify(v));
  }
};

// Sesión de la dueña: contraseña (ADMIN_PASSWORD) -> token firmado que dura 12 h
const secret = () => process.env.AUTH_SECRET || process.env.ADMIN_PASSWORD || '';
const sign = p => crypto.createHmac('sha256', secret()).update(p).digest('base64url');
const token = () => { const p = Buffer.from(JSON.stringify({ exp: Date.now() + 12 * 36e5 })).toString('base64url'); return p + '.' + sign(p); };
function authed(req) {
  try {
    const [p, s] = (req.headers.authorization || '').replace('Bearer ', '').split('.');
    return !!secret() && crypto.timingSafeEqual(Buffer.from(s), Buffer.from(sign(p))) && JSON.parse(Buffer.from(p, 'base64url')).exp > Date.now();
  } catch { return false; }
}
function passwordOk(pw) {
  const a = Buffer.from(String(pw || '')), b = Buffer.from(process.env.ADMIN_PASSWORD || '');
  return b.length > 0 && a.length === b.length && crypto.timingSafeEqual(a, b);
}
const send = (res, code, obj) => { res.statusCode = code; res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(obj)); };

// Validación de entrada
const text = (v, max, req, name) => {
  if (v == null || v === '') { if (req) throw fail(400, name + ' es obligatorio'); return ''; }
  if (typeof v !== 'string' || v.length > max) throw fail(400, name + ' no es válido (máx. ' + max + ' caracteres)');
  return v.trim();
};
function cleanLanding(b) {
  if (!b || typeof b !== 'object') throw fail(400, 'Cuerpo inválido');
  const list = (a, n, f) => { if (!Array.isArray(a) || a.length > n) throw fail(400, 'Lista inválida'); return a.map(f); };
  const t = (v, n, name) => text(v, n, false, name), img = v => t(v, 2e6, 'La imagen');
  return {
    about: { text: t(b.about && b.about.text, 1500, 'Sobre mí'), photo: img(b.about && b.about.photo) },
    languages: list(b.languages, 20, l => ({ name: t(l.name, 40, 'El lenguaje'), icon: img(l.icon) })),
    events: list(b.events, 30, e => ({ title: t(e.title, 120, 'El título'), text: t(e.text, 600, 'La descripción'), image: img(e.image) })),
    projects: list(b.projects, 30, p => ({ title: t(p.title, 80, 'El título'), text: t(p.text, 1500, 'La descripción'), image: img(p.image), palette: img(p.palette), card: img(p.card) }))
  };
}
function cleanPost(b, old) {
  b = b || {};
  const status = b.status === 'published' ? 'published' : 'draft', now = new Date().toISOString();
  const p = { title: text(b.title, 80, true, 'El título'), text: text(b.text, 8000, status === 'published', 'La descripción'), image: text(b.image, 2e6, false, 'La imagen') };
  if (status === 'published' && !p.image) throw fail(400, 'La imagen es obligatoria para publicar');
  return { ...p, status, hearts: old ? old.hearts : 0, createdAt: old ? old.createdAt : now,
    date: status === 'published' && old && old.status === 'published' ? old.date : now };
}
module.exports = { db, fail, send, token, authed, passwordOk, cleanLanding, cleanPost };
