/* Pizza Pantas API — Cloudflare Worker + D1.
   Endpoints (all JSON):
     GET    /api/health
     POST   /api/register  {username, password, display?}  -> {token, user}
     POST   /api/login     {username, password}            -> {token, user}
     POST   /api/logout                                    (Bearer token)
     GET    /api/me                                        (Bearer token)
     DELETE /api/me        {password}                      deletes the account and all its data
     POST   /api/runs      {ch, money, goal, stars, served, ok, bad, topics, at?}
     GET    /api/runs?limit=300
   Config (Worker variables): ALLOWED_ORIGINS (comma separated), PBKDF2_ITER (optional, default 100000)
   Binding: DB (D1 database) */

const enc = new TextEncoder();
const SESSION_DAYS = 30;
const LOGIN_MAX = 8, LOGIN_WINDOW = 600;      // 8 failures per username+IP, then blocked for 10 minutes
const REG_MAX = 10, REG_WINDOW = 3600;        // 10 sign-ups per IP per hour

class HttpError extends Error { constructor(status, code, message) { super(message || code); this.status = status; this.code = code; } }

/* ---------- small helpers ---------- */
const now = () => Math.floor(Date.now() / 1000);
const toB64 = buf => { let s = ''; new Uint8Array(buf).forEach(b => { s += String.fromCharCode(b); }); return btoa(s); };
const fromB64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const toB64Url = buf => toB64(buf).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const toHex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
const sha256 = async s => toHex(await crypto.subtle.digest('SHA-256', enc.encode(s)));
function safeEqual(a, b) { if (a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; }
async function pbkdf2(password, salt, iterations) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']);
  return toB64(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256));
}
const iterOf = env => Math.min(100000, Math.max(1000, parseInt(env.PBKDF2_ITER, 10) || 100000));   // Workers cap PBKDF2 at 100000

function json(data, status, extra) {
  return new Response(JSON.stringify(data), { status: status || 200, headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, extra || {}) });
}
function corsHeaders(req, env) {
  const origin = req.headers.get('Origin') || '';
  const allowed = String(env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  const h = { 'Vary': 'Origin' };
  if (origin && allowed.includes(origin)) {
    h['Access-Control-Allow-Origin'] = origin;
    h['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
    h['Access-Control-Allow-Methods'] = 'GET, POST, DELETE, OPTIONS';
    h['Access-Control-Max-Age'] = '86400';
  }
  return h;
}
async function readBody(req) {
  const len = parseInt(req.headers.get('Content-Length') || '0', 10);
  if (len > 8192) throw new HttpError(413, 'too_large', 'Data terlalu besar.');
  try { const text = await req.text(); if (text.length > 8192) throw 0; return text ? JSON.parse(text) : {}; }
  catch (e) { throw new HttpError(400, 'bad_json', 'Permintaan tidak sah.'); }
}

/* ---------- throttling ---------- */
async function isBlocked(env, key, max) {
  const row = await env.DB.prepare('SELECT n, until FROM attempts WHERE k = ?').bind(key).first();
  return !!(row && row.until > now() && row.n >= max);
}
async function addFailure(env, key, windowSec) {
  const t = now(); const row = await env.DB.prepare('SELECT n, until FROM attempts WHERE k = ?').bind(key).first();
  if (!row || row.until <= t) await env.DB.prepare('INSERT OR REPLACE INTO attempts (k, n, until) VALUES (?, 1, ?)').bind(key, t + windowSec).run();
  else await env.DB.prepare('UPDATE attempts SET n = n + 1 WHERE k = ?').bind(key).run();
}
const clearFailures = (env, key) => env.DB.prepare('DELETE FROM attempts WHERE k = ?').bind(key).run();

/* ---------- validation ---------- */
function cleanUsername(v) {
  const u = String(v || '').trim().toLowerCase();
  if (!/^[a-z0-9_]{3,20}$/.test(u)) throw new HttpError(400, 'bad_username', 'Nama pengguna: 3–20 huruf kecil, nombor atau _.');
  return u;
}
function cleanPassword(v) {
  const p = String(v || '');
  if (p.length < 6 || p.length > 72) throw new HttpError(400, 'bad_password', 'Kata laluan mesti 6–72 aksara.');
  return p;
}
const cleanDisplay = (v, fallback) => { const d = String(v || '').replace(/[\u0000-\u001f<>&"']/g, '').trim().slice(0, 20); return d || fallback; };
function int(v, min, max, name) { const n = Number(v); if (!Number.isFinite(n) || Math.floor(n) !== n || n < min || n > max) throw new HttpError(400, 'bad_run', 'Data permainan tidak sah: ' + name); return n; }
function num(v, min, max, name) { const n = Number(v); if (!Number.isFinite(n) || n < min || n > max) throw new HttpError(400, 'bad_run', 'Data permainan tidak sah: ' + name); return Math.round(n * 100) / 100; }
function cleanRun(b) {
  const topics = {}; const src = (b && typeof b.topics === 'object' && b.topics) || {}; const keys = Object.keys(src);
  if (keys.length > 30) throw new HttpError(400, 'bad_run', 'Terlalu banyak topik.');
  for (const k of keys) { const key = String(k).replace(/[\u0000-\u001f<>]/g, '').slice(0, 40); topics[key] = { ok: int(src[k].ok, 0, 300, 'topik'), bad: int(src[k].bad, 0, 300, 'topik') }; }
  let at = Number(b.at) > 0 ? Math.floor(Number(b.at) / 1000) : now();
  if (at > now() + 86400 || at < now() - 365 * 86400) at = now();
  return { ch: int(b.ch, 1, 13, 'bab'), money: num(b.money, 0, 5000, 'wang'), goal: num(b.goal, 0, 5000, 'sasaran'), stars: int(b.stars, 0, 3, 'bintang'),
    served: int(b.served, 0, 200, 'pelanggan'), ok: int(b.ok, 0, 500, 'ok'), bad: int(b.bad, 0, 500, 'bad'), topics: JSON.stringify(topics), at };
}

/* ---------- auth ---------- */
async function newSession(env, userId) {
  const raw = toB64Url(crypto.getRandomValues(new Uint8Array(32)));
  await env.DB.prepare('DELETE FROM sessions WHERE user_id = ? AND expires_at < ?').bind(userId, now()).run();
  await env.DB.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)').bind(await sha256(raw), userId, now() + SESSION_DAYS * 86400).run();
  return raw;
}
async function authed(req, env) {
  const m = /^Bearer ([A-Za-z0-9_-]{20,100})$/.exec(req.headers.get('Authorization') || '');
  if (!m) throw new HttpError(401, 'unauthorized', 'Sila log masuk.');
  const row = await env.DB.prepare('SELECT u.id, u.username, u.display, u.pw_hash, u.pw_salt, u.iter, s.token_hash FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?')
    .bind(await sha256(m[1]), now()).first();
  if (!row) throw new HttpError(401, 'unauthorized', 'Sesi tamat. Sila log masuk semula.');
  return row;
}
const publicUser = u => ({ id: u.id, username: u.username, display: u.display });
const clientKey = req => req.headers.get('CF-Connecting-IP') || 'local';

/* ---------- routes ---------- */
async function register(req, env) {
  const ip = clientKey(req);
  if (await isBlocked(env, 'reg:' + ip, REG_MAX)) throw new HttpError(429, 'rate_limited', 'Terlalu banyak pendaftaran. Cuba lagi nanti.');
  const b = await readBody(req); const username = cleanUsername(b.username); const password = cleanPassword(b.password); const display = cleanDisplay(b.display, username);
  const taken = await env.DB.prepare('SELECT 1 AS x FROM users WHERE username = ?').bind(username).first();
  await addFailure(env, 'reg:' + ip, REG_WINDOW);
  if (taken) throw new HttpError(409, 'username_taken', 'Nama pengguna sudah digunakan.');
  const salt = crypto.getRandomValues(new Uint8Array(16)); const iter = iterOf(env);
  const hash = await pbkdf2(password, salt, iter);
  let res;
  try { res = await env.DB.prepare('INSERT INTO users (username, display, pw_hash, pw_salt, iter, created_at) VALUES (?, ?, ?, ?, ?, ?)').bind(username, display, hash, toB64(salt), iter, now()).run(); }
  catch (e) { throw new HttpError(409, 'username_taken', 'Nama pengguna sudah digunakan.'); }
  const id = res.meta.last_row_id;
  return json({ token: await newSession(env, id), user: { id, username, display } }, 201);
}
async function login(req, env) {
  const b = await readBody(req); const username = String(b.username || '').trim().toLowerCase().slice(0, 20); const password = String(b.password || '').slice(0, 72);
  const key = 'login:' + username + ':' + clientKey(req);
  if (await isBlocked(env, key, LOGIN_MAX)) throw new HttpError(429, 'rate_limited', 'Terlalu banyak percubaan. Cuba lagi dalam 10 minit.');
  const u = await env.DB.prepare('SELECT id, username, display, pw_hash, pw_salt, iter FROM users WHERE username = ?').bind(username).first();
  // always do one PBKDF2 so "unknown user" and "wrong password" take about the same time
  const salt = u ? fromB64(u.pw_salt) : new Uint8Array(16); const hash = await pbkdf2(password, salt, u ? u.iter : iterOf(env));
  if (!u || !safeEqual(hash, u.pw_hash)) { await addFailure(env, key, LOGIN_WINDOW); throw new HttpError(401, 'bad_credentials', 'Nama pengguna atau kata laluan salah.'); }
  await clearFailures(env, key);
  return json({ token: await newSession(env, u.id), user: publicUser(u) });
}
async function logout(req, env) {
  const u = await authed(req, env);
  await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(u.token_hash).run();
  return json({ ok: true });
}
async function deleteMe(req, env) {
  const u = await authed(req, env); const b = await readBody(req);
  const hash = await pbkdf2(String(b.password || '').slice(0, 72), fromB64(u.pw_salt), u.iter);
  if (!safeEqual(hash, u.pw_hash)) throw new HttpError(401, 'bad_credentials', 'Kata laluan salah.');
  await env.DB.batch([env.DB.prepare('DELETE FROM runs WHERE user_id = ?').bind(u.id), env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(u.id), env.DB.prepare('DELETE FROM users WHERE id = ?').bind(u.id)]);
  return json({ ok: true });
}
async function addRun(req, env) {
  const u = await authed(req, env); const r = cleanRun(await readBody(req));
  const res = await env.DB.prepare('INSERT INTO runs (user_id, ch, money, goal, stars, served, ok, bad, topics, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(u.id, r.ch, r.money, r.goal, r.stars, r.served, r.ok, r.bad, r.topics, r.at).run();
  await env.DB.prepare('DELETE FROM runs WHERE user_id = ?1 AND id NOT IN (SELECT id FROM runs WHERE user_id = ?1 ORDER BY id DESC LIMIT 1000)').bind(u.id).run();
  return json({ ok: true, id: res.meta.last_row_id }, 201);
}
async function listRuns(req, env, url) {
  const u = await authed(req, env); const limit = Math.min(500, Math.max(1, parseInt(url.searchParams.get('limit'), 10) || 300));
  const { results } = await env.DB.prepare('SELECT id, ch, money, goal, stars, served, ok, bad, topics, created_at FROM runs WHERE user_id = ? ORDER BY id DESC LIMIT ?').bind(u.id, limit).all();
  return json({ runs: results.map(r => { let t = {}; try { t = JSON.parse(r.topics); } catch (e) { /* keep empty */ } return { id: r.id, ch: r.ch, money: r.money, goal: r.goal, stars: r.stars, served: r.served, ok: r.ok, bad: r.bad, topics: t, at: r.created_at * 1000 }; }) });
}

async function route(req, env, url) {
  const p = url.pathname.replace(/\/+$/, ''); const m = req.method;
  if (p === '/api/health' && m === 'GET') return json({ ok: true });
  if (p === '/api/register' && m === 'POST') return register(req, env);
  if (p === '/api/login' && m === 'POST') return login(req, env);
  if (p === '/api/logout' && m === 'POST') return logout(req, env);
  if (p === '/api/me' && m === 'GET') return json({ user: publicUser(await authed(req, env)) });
  if (p === '/api/me' && m === 'DELETE') return deleteMe(req, env);
  if (p === '/api/runs' && m === 'POST') return addRun(req, env);
  if (p === '/api/runs' && m === 'GET') return listRuns(req, env, url);
  throw new HttpError(404, 'not_found', 'Tidak dijumpai.');
}

export default {
  async fetch(req, env) {
    const cors = corsHeaders(req, env);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    try {
      const res = await route(req, env, new URL(req.url));
      Object.entries(cors).forEach(([k, v]) => res.headers.set(k, v));
      return res;
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.code, message: e.message }, e.status, cors);
      console.error(e);
      return json({ error: 'server', message: 'Ralat pelayan.' }, 500, cors);
    }
  }
};
