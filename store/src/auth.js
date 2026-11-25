import { get, run } from "./db.js";
import { parseCookies, token } from "./util.js";

const COOKIE = { admin: "ms_admin", customer: "ms_sess" };
const DAYS = { admin: 7, customer: 60 };

export function createSession(res, kind, userId, secure) {
  const t = token(32);
  const expires = Date.now() + DAYS[kind] * 86400_000;
  run("INSERT INTO sessions(token, kind, user_id, expires) VALUES(?,?,?,?)", t, kind, userId, expires);
  const parts = [`${COOKIE[kind]}=${t}`, "Path=/", "HttpOnly", "SameSite=Lax", `Max-Age=${DAYS[kind] * 86400}`];
  if (secure) parts.push("Secure");
  appendCookie(res, parts.join("; "));
}

export function getSession(req, kind) {
  const t = parseCookies(req)[COOKIE[kind]];
  if (!t) return null;
  const s = get("SELECT * FROM sessions WHERE token = ? AND kind = ?", t, kind);
  if (!s) return null;
  if (s.expires < Date.now()) { run("DELETE FROM sessions WHERE token = ?", t); return null; }
  return s;
}

export function destroySession(req, res, kind) {
  const t = parseCookies(req)[COOKIE[kind]];
  if (t) run("DELETE FROM sessions WHERE token = ?", t);
  appendCookie(res, `${COOKIE[kind]}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

function appendCookie(res, c) {
  const prev = res.getHeader("Set-Cookie");
  res.setHeader("Set-Cookie", prev ? [].concat(prev, c) : c);
}

/* very small login throttle: 8 tries per 15 minutes per key */
const attempts = new Map();
export function throttle(key) {
  const now = Date.now();
  const a = (attempts.get(key) || []).filter((t) => now - t < 15 * 60_000);
  if (a.length >= 8) return false;
  a.push(now);
  attempts.set(key, a);
  return true;
}
export const clearThrottle = (key) => attempts.delete(key);
