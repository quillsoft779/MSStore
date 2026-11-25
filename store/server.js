import { createServer } from "node:http";
import { readFile, writeFile, stat } from "node:fs/promises";
import { join, normalize, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { db, all, get, run, tx, settings, saveSettings, UPLOAD_DIR } from "./src/db.js";
import { esc, money, hashPassword, verifyPassword, normPhone, readBody, HttpError, int, str, token } from "./src/util.js";
import { createSession, getSession, destroySession, throttle, clearThrottle } from "./src/auth.js";
import { quote, placeOrder, setOrderStatus, orderDetail, paymentMethods, recomputeStock, STATUSES, STATUS_LABEL, PAYMENT_LABEL } from "./src/commerce.js";
import { slugify } from "./src/seed.js";
import { ICON_KEYS, ICONS } from "./src/icons.js";
import * as V from "./src/views.js";

const ROOT = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(ROOT, "public");
const PORT = int(process.env.PORT, 3000);
const SECURE = String(process.env.BASE_URL || "").startsWith("https://");

const MIME = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp",
  ".ico": "image/x-icon", ".json": "application/json", ".txt": "text/plain; charset=utf-8", ".xml": "application/xml"
};

/* ================================================================ helpers */
function send(res, status, body, type = "text/html; charset=utf-8", extra = {}) {
  res.writeHead(status, { "Content-Type": type, ...extra });
  res.end(body);
}
const html = (res, body, status = 200) => send(res, status, body);
const json = (res, data, status = 200) => send(res, status, JSON.stringify(data), "application/json; charset=utf-8", { "Cache-Control": "no-store" });
const redirect = (res, to) => { res.writeHead(303, { Location: to }); res.end(); };

async function serveFile(res, base, rel, cache = "public, max-age=3600") {
  const file = normalize(join(base, rel));
  if (!file.startsWith(base)) return false;
  try {
    const st = await stat(file);
    if (!st.isFile()) return false;
    const data = await readFile(file);
    send(res, 200, data, MIME[extname(file).toLowerCase()] || "application/octet-stream", { "Cache-Control": cache });
    return true;
  } catch { return false; }
}

function baseUrl(req) {
  if (process.env.BASE_URL) return process.env.BASE_URL.replace(/\/$/, "");
  const proto = req.headers["x-forwarded-proto"] || "http";
  return `${proto}://${req.headers.host}`;
}

/** Real visitor IP. Behind a host's proxy (TRUST_PROXY=1) use the first X-Forwarded-For entry. */
function clientIp(req) {
  if (process.env.TRUST_PROXY === "1") {
    const fwd = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
    if (fwd) return fwd;
  }
  return req.socket.remoteAddress || "unknown";
}

function currentCustomer(req) {
  const s = getSession(req, "customer");
  return s ? get("SELECT id, name, phone, email, address, city FROM customers WHERE id = ?", s.user_id) : null;
}

function ctxFor(req, extra = {}) {
  return {
    s: settings(),
    cats: all("SELECT * FROM categories ORDER BY sort, id"),
    user: currentCustomer(req),
    base: baseUrl(req),
    ...extra
  };
}

const PRODUCT_COLS = `p.*,
  (SELECT COUNT(*) FROM variants v WHERE v.product_id = p.id) AS variant_count,
  (SELECT AVG(rating) FROM reviews r WHERE r.product_id = p.id AND r.approved = 1) AS rating,
  (SELECT COUNT(*) FROM reviews r WHERE r.product_id = p.id AND r.approved = 1) AS reviews`;

function listProducts(f, page = 1, per = 24) {
  const where = ["p.status = 'active'"];
  const params = [];
  if (f.c) { where.push("c.slug = ?"); params.push(f.c); }
  if (f.t) { where.push("c.trade = ?"); params.push(f.t); }
  if (f.brand) { where.push("p.brand = ?"); params.push(f.brand); }
  if (f.min) { where.push("p.price >= ?"); params.push(int(f.min)); }
  if (f.max) { where.push("p.price <= ?"); params.push(int(f.max)); }
  if (f.stock) where.push("p.stock > 0");
  if (f.sale) where.push("p.compare_price > p.price");
  if (f.q) {
    for (const w of f.q.toLowerCase().split(/\s+/).filter(Boolean).slice(0, 6)) {
      where.push(`(lower(p.title) LIKE ? OR p.title_ur LIKE ? OR lower(p.description) LIKE ? OR lower(p.sku) LIKE ? OR lower(p.brand) LIKE ? OR lower(c.name) LIKE ?
        OR EXISTS (SELECT 1 FROM variants v WHERE v.product_id = p.id AND lower(v.name) LIKE ?))`);
      const like = `%${w}%`;
      params.push(like, like, like, like, like, like, like);
    }
  }
  const order = {
    price_asc: "p.price ASC", price_desc: "p.price DESC", new: "p.id DESC", name: "p.title COLLATE NOCASE ASC"
  }[f.sort] || "(p.stock > 0) DESC, p.featured DESC, c.sort, p.id";
  const W = where.join(" AND ");
  const total = get(`SELECT COUNT(*) n FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE ${W}`, ...params).n;
  const pages = Math.max(1, Math.ceil(total / per));
  const pg = Math.min(Math.max(1, page), pages);
  const products = all(`SELECT ${PRODUCT_COLS} FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE ${W} ORDER BY ${order} LIMIT ? OFFSET ?`,
    ...params, per, (pg - 1) * per);
  return { products, total, page: pg, pages };
}

const cleanFilters = (sp) => ({
  q: str(sp.get("q"), 80), c: str(sp.get("c"), 80), t: ["E", "S", "H"].includes(sp.get("t")) ? sp.get("t") : "",
  brand: str(sp.get("brand"), 60), min: sp.get("min") ? String(int(sp.get("min"))) : "", max: sp.get("max") ? String(int(sp.get("max"))) : "",
  stock: sp.get("stock") === "1" ? "1" : "", sale: sp.get("sale") === "1" ? "1" : "", sort: str(sp.get("sort"), 20)
});

async function readForm(req) {
  const chunks = [];
  for await (const c of req) { chunks.push(c); if (chunks.length > 100) break; }
  return new URLSearchParams(Buffer.concat(chunks).toString("utf8"));
}

/* ================================================================ storefront */
async function storefront(req, res, url) {
  const p = url.pathname;

  if (p === "/") {
    const ctx = ctxFor(req);
    const featured = all(`SELECT ${PRODUCT_COLS} FROM products p WHERE p.status='active' AND p.featured=1 ORDER BY (p.stock>0) DESC, p.id LIMIT 8`);
    const offers = all(`SELECT ${PRODUCT_COLS} FROM products p WHERE p.status='active' AND p.compare_price > p.price ORDER BY (1.0*p.price/p.compare_price) LIMIT 4`);
    const newest = all(`SELECT ${PRODUCT_COLS} FROM products p WHERE p.status='active' AND p.featured=0 ORDER BY p.id DESC LIMIT 4`);
    const trades = all("SELECT c.trade, COUNT(p.id) n FROM categories c LEFT JOIN products p ON p.category_id = c.id AND p.status='active' GROUP BY c.trade ORDER BY CASE c.trade WHEN 'E' THEN 1 WHEN 'S' THEN 2 ELSE 3 END");
    return html(res, V.home(ctx, { featured, offers, trades, newest }));
  }

  if (p === "/shop") {
    const f = cleanFilters(url.searchParams);
    const ctx = ctxFor(req, { q: f.q });
    const cat = f.c ? ctx.cats.find((c) => c.slug === f.c) : null;
    const data = listProducts(f, int(url.searchParams.get("page"), 1));
    const brands = all("SELECT DISTINCT brand FROM products WHERE status='active' AND brand != '' ORDER BY brand").map((r) => r.brand);
    return html(res, V.shop(ctx, { ...data, f, cat, brands }));
  }

  let m;
  if ((m = p.match(/^\/p\/([a-z0-9-]+)$/))) {
    const ctx = ctxFor(req);
    const prod = get("SELECT * FROM products WHERE slug = ? AND status = 'active'", m[1]);
    if (!prod) return html(res, V.notFound(ctx), 404);
    const variants = all("SELECT * FROM variants WHERE product_id = ? ORDER BY sort, id", prod.id);
    const cat = ctx.cats.find((c) => c.id === prod.category_id);
    const related = all(`SELECT ${PRODUCT_COLS} FROM products p WHERE p.status='active' AND p.category_id = ? AND p.id != ? ORDER BY (p.stock>0) DESC, p.featured DESC LIMIT 4`, prod.category_id, prod.id);
    const reviews = all("SELECT * FROM reviews WHERE product_id = ? AND approved = 1 ORDER BY id DESC LIMIT 30", prod.id);
    const r = get("SELECT AVG(rating) avg, COUNT(*) n FROM reviews WHERE product_id = ? AND approved = 1", prod.id);
    return html(res, V.product(ctx, { p: prod, variants, cat, related, reviews, rating: { avg: r.avg || 0, n: r.n } }));
  }

  if (p === "/cart") return html(res, V.cartPage(ctxFor(req)));
  if (p === "/checkout") { const ctx = ctxFor(req); return html(res, V.checkout(ctx, { methods: paymentMethods(ctx.s) })); }
  if (p === "/help") return html(res, V.helpPage(ctxFor(req)));
  if (p === "/account") {
    const ctx = ctxFor(req);
    const orders = ctx.user ? all("SELECT number, token, created_at, status, total FROM orders WHERE customer_id = ? ORDER BY id DESC", ctx.user.id) : [];
    return html(res, V.accountPage(ctx, orders));
  }

  if ((m = p.match(/^\/order\/(MS-\d+)$/))) {
    const ctx = ctxFor(req);
    const o = orderDetail("number = ?", m[1]);
    const t = url.searchParams.get("t");
    const owns = o && ((t && t === o.token) || (ctx.user && o.customer_id === ctx.user.id));
    if (!owns) return html(res, V.notFound(ctx), 404);
    return html(res, V.orderPage(ctx, o, url.searchParams.get("new") === "1"));
  }

  if (p === "/track") {
    const ctx = ctxFor(req);
    if (req.method === "POST") {
      const ip = clientIp(req);
      if (!throttle("track:" + ip)) return html(res, V.trackPage(ctx, "Too many tries. Please wait a few minutes."), 429);
      const form = await readForm(req);
      const number = str(form.get("number"), 20).toUpperCase().replace(/^(\d)/, "MS-$1");
      const phone = normPhone(form.get("phone"));
      const o = get("SELECT number, token FROM orders WHERE number = ? AND phone = ?", number, phone || "-");
      if (!o) return html(res, V.trackPage(ctx, "We couldn't find that order. Check the number and mobile, or call us."));
      return redirect(res, `/order/${o.number}?t=${o.token}`);
    }
    return html(res, V.trackPage(ctx));
  }

  if (p === "/robots.txt") return send(res, 200, `User-agent: *\nDisallow: /admin\nDisallow: /checkout\nDisallow: /cart\nDisallow: /order/\nDisallow: /api/\nSitemap: ${baseUrl(req)}/sitemap.xml\n`, MIME[".txt"]);
  if (p === "/sitemap.xml") {
    const b = baseUrl(req);
    const urls = ["/", "/shop", "/help", ...all("SELECT slug FROM categories").map((c) => `/shop?c=${c.slug}`), ...all("SELECT slug FROM products WHERE status='active'").map((x) => `/p/${x.slug}`)];
    return send(res, 200, `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((u) => `<url><loc>${esc(b + u)}</loc></url>`).join("")}</urlset>`, MIME[".xml"]);
  }

  return html(res, V.notFound(ctxFor(req)), 404);
}

/* ================================================================ public API */
async function publicApi(req, res, url) {
  const p = url.pathname;
  if (p === "/api/search" && req.method === "GET") {
    const q = str(url.searchParams.get("q"), 60);
    if (q.length < 2) return json(res, []);
    const { products } = listProducts({ q }, 1, 6);
    return json(res, products.map((x) => ({ slug: x.slug, title: x.title, price: x.price, from: x.variant_count > 0, image: x.image, icon: x.icon })));
  }

  if (req.method !== "POST") throw new HttpError(405, "Method not allowed");
  if (!String(req.headers["content-type"] || "").startsWith("application/json")) throw new HttpError(415, "JSON expected");
  const body = await readBody(req);

  if (p === "/api/cart/quote") return json(res, quote(body));

  if (p === "/api/checkout") {
    const ip = clientIp(req);
    if (!throttle("checkout:" + ip)) throw new HttpError(429, "Too many orders from this connection. Please call us.");
    const user = currentCustomer(req);
    const o = placeOrder(body, user ? user.id : null);
    clearThrottle("checkout:" + ip);
    return json(res, { ok: true, number: o.number, url: `/order/${o.number}?t=${o.token}&new=1` });
  }

  if (p === "/api/reviews") {
    const pid = int(body.productId);
    if (!get("SELECT id FROM products WHERE id = ?", pid)) throw new HttpError(404, "Product not found");
    const name = str(body.name, 60), rating = Math.max(1, Math.min(5, int(body.rating, 5)));
    if (!name) throw new HttpError(400, "Please enter your name.");
    if (!throttle("review:" + clientIp(req))) throw new HttpError(429, "Too many reviews. Try later.");
    run("INSERT INTO reviews(product_id, name, rating, body) VALUES(?,?,?,?)", pid, name, rating, str(body.body, 800));
    return json(res, { ok: true });
  }

  if (p === "/api/account/register") {
    const name = str(body.name, 100), phone = normPhone(body.phone), pw = String(body.password || "");
    if (!name || !phone) throw new HttpError(400, "Enter your name and a valid mobile number.");
    if (pw.length < 6) throw new HttpError(400, "Password must be at least 6 characters.");
    const existing = get("SELECT * FROM customers WHERE phone = ?", phone);
    if (existing && existing.password_hash) throw new HttpError(409, "An account with this number exists. Please log in.");
    let id;
    if (existing) { run("UPDATE customers SET name = ?, password_hash = ? WHERE id = ?", name, hashPassword(pw), existing.id); id = existing.id; }
    else id = Number(run("INSERT INTO customers(name, phone, password_hash) VALUES(?,?,?)", name, phone, hashPassword(pw)).lastInsertRowid);
    run("UPDATE orders SET customer_id = ? WHERE phone = ? AND customer_id IS NULL", id, phone);
    createSession(res, "customer", id, SECURE);
    return json(res, { ok: true });
  }

  if (p === "/api/account/login") {
    const phone = normPhone(body.phone);
    const key = "login:" + (phone || clientIp(req));
    if (!throttle(key)) throw new HttpError(429, "Too many tries. Please wait 15 minutes.");
    const c = phone && get("SELECT * FROM customers WHERE phone = ?", phone);
    if (!c || !verifyPassword(body.password, c.password_hash)) throw new HttpError(401, "Mobile number or password is wrong.");
    clearThrottle(key);
    createSession(res, "customer", c.id, SECURE);
    return json(res, { ok: true });
  }

  if (p === "/api/account/logout") { destroySession(req, res, "customer"); return json(res, { ok: true }); }

  throw new HttpError(404, "Not found");
}

/* ================================================================ admin API */
function requireAdmin(req) {
  const s = getSession(req, "admin");
  if (!s) throw new HttpError(401, "Please log in.");
  return s;
}

function uniqueSlug(base, id = 0) {
  let slug = slugify(base) || "item", n = 1;
  while (get("SELECT id FROM products WHERE slug = ? AND id != ?", slug, id)) slug = `${slugify(base)}-${++n}`;
  return slug;
}

function saveProduct(body, id = null) {
  const title = str(body.title, 160);
  if (!title) throw new HttpError(400, "Product name is required.");
  const variants = Array.isArray(body.variants) ? body.variants.filter((v) => str(v.name, 60)) : [];
  const f = {
    title, title_ur: str(body.title_ur, 160), slug: uniqueSlug(body.slug || title, id || 0),
    category_id: int(body.category_id) || null, brand: str(body.brand, 60), description: str(body.description, 5000),
    unit: str(body.unit, 30) || "piece", price: Math.max(0, int(body.price)), compare_price: int(body.compare_price) > 0 ? int(body.compare_price) : null,
    sku: str(body.sku, 40), stock: int(body.stock), image: body.image ? str(body.image, 300) : null,
    icon: ICON_KEYS.includes(body.icon) ? body.icon : "box", status: body.status === "draft" ? "draft" : "active", featured: body.featured ? 1 : 0
  };
  return tx(() => {
    if (id) {
      run(`UPDATE products SET title=?, title_ur=?, slug=?, category_id=?, brand=?, description=?, unit=?, price=?, compare_price=?, sku=?, stock=?, image=?, icon=?, status=?, featured=?, updated_at=datetime('now') WHERE id=?`,
        f.title, f.title_ur, f.slug, f.category_id, f.brand, f.description, f.unit, f.price, f.compare_price, f.sku, f.stock, f.image, f.icon, f.status, f.featured, id);
    } else {
      id = Number(run(`INSERT INTO products(title, title_ur, slug, category_id, brand, description, unit, price, compare_price, sku, stock, image, icon, status, featured) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        f.title, f.title_ur, f.slug, f.category_id, f.brand, f.description, f.unit, f.price, f.compare_price, f.sku, f.stock, f.image, f.icon, f.status, f.featured).lastInsertRowid);
    }
    const keep = variants.filter((v) => int(v.id)).map((v) => int(v.id));
    const existing = all("SELECT id FROM variants WHERE product_id = ?", id).map((r) => r.id);
    for (const vid of existing) if (!keep.includes(vid)) run("DELETE FROM variants WHERE id = ?", vid);
    variants.forEach((v, i) => {
      const vals = [str(v.name, 60), Math.max(0, int(v.price)), int(v.compare_price) > 0 ? int(v.compare_price) : null, str(v.sku, 40), int(v.stock), i];
      if (int(v.id) && existing.includes(int(v.id))) run("UPDATE variants SET name=?, price=?, compare_price=?, sku=?, stock=?, sort=? WHERE id=?", ...vals, int(v.id));
      else run("INSERT INTO variants(name, price, compare_price, sku, stock, sort, product_id) VALUES(?,?,?,?,?,?,?)", ...vals, id);
    });
    if (variants.length) recomputeStock(id);
    return id;
  });
}

const PKT = "'+5 hours'";

async function adminApi(req, res, url) {
  const p = url.pathname.replace(/^\/api\/admin/, "");
  const M = req.method;
  let body = {};
  if (M !== "GET") {
    if (!String(req.headers["content-type"] || "").startsWith("application/json")) throw new HttpError(415, "JSON expected");
    body = await readBody(req, p === "/upload" ? 6_000_000 : 1_000_000);
  }
  const needsSetup = !get("SELECT id FROM admins LIMIT 1");

  if (p === "/me") {
    const s = getSession(req, "admin");
    const a = s && get("SELECT id, username FROM admins WHERE id = ?", s.user_id);
    return json(res, { admin: a || null, needsSetup, setupCode: needsSetup && !!process.env.SETUP_CODE, icons: ICONS, statuses: STATUSES, statusLabel: STATUS_LABEL, paymentLabel: PAYMENT_LABEL });
  }
  if (p === "/setup" && M === "POST") {
    if (!needsSetup) throw new HttpError(403, "Owner account already exists.");
    if (process.env.SETUP_CODE) {
      if (!throttle("setup:" + clientIp(req))) throw new HttpError(429, "Too many tries. Wait 15 minutes.");
      if (String(body.code || "").trim() !== process.env.SETUP_CODE) throw new HttpError(403, "That setup code is wrong.");
    }
    const u = str(body.username, 40), pw = String(body.password || "");
    if (!u || pw.length < 8) throw new HttpError(400, "Choose a username and a password of at least 8 characters.");
    const id = Number(run("INSERT INTO admins(username, password_hash) VALUES(?,?)", u, hashPassword(pw)).lastInsertRowid);
    createSession(res, "admin", id, SECURE);
    return json(res, { ok: true });
  }
  if (p === "/login" && M === "POST") {
    const key = "admin:" + clientIp(req);
    if (!throttle(key)) throw new HttpError(429, "Too many tries. Wait 15 minutes.");
    const a = get("SELECT * FROM admins WHERE username = ?", str(body.username, 40));
    if (!a || !verifyPassword(body.password, a.password_hash)) throw new HttpError(401, "Wrong username or password.");
    clearThrottle(key);
    createSession(res, "admin", a.id, SECURE);
    return json(res, { ok: true });
  }

  const sess = requireAdmin(req);
  let m;

  if (p === "/logout") { destroySession(req, res, "admin"); return json(res, { ok: true }); }

  if (p === "/password" && M === "POST") {
    const a = get("SELECT * FROM admins WHERE id = ?", sess.user_id);
    if (!verifyPassword(body.current, a.password_hash)) throw new HttpError(400, "Current password is wrong.");
    if (String(body.next || "").length < 8) throw new HttpError(400, "New password must be at least 8 characters.");
    run("UPDATE admins SET password_hash = ? WHERE id = ?", hashPassword(body.next), a.id);
    return json(res, { ok: true });
  }

  /* ---- dashboard ---- */
  if (p === "/stats") {
    const live = "status != 'cancelled'";
    const today = get(`SELECT COUNT(*) n, COALESCE(SUM(total),0) t FROM orders WHERE ${live} AND date(created_at, ${PKT}) = date('now', ${PKT})`);
    const week = get(`SELECT COUNT(*) n, COALESCE(SUM(total),0) t FROM orders WHERE ${live} AND date(created_at, ${PKT}) >= date('now', ${PKT}, '-6 days')`);
    const month = get(`SELECT COUNT(*) n, COALESCE(SUM(total),0) t FROM orders WHERE ${live} AND strftime('%Y-%m', created_at, ${PKT}) = strftime('%Y-%m', 'now', ${PKT})`);
    const open = get("SELECT COUNT(*) n FROM orders WHERE status IN ('pending','confirmed','packed','shipped')").n;
    const pending = get("SELECT COUNT(*) n FROM orders WHERE status = 'pending'").n;
    const series = all(`WITH RECURSIVE d(x) AS (SELECT date('now', ${PKT}, '-13 days') UNION ALL SELECT date(x, '+1 day') FROM d WHERE x < date('now', ${PKT}))
      SELECT d.x day, COALESCE(SUM(o.total),0) total, COUNT(o.id) n FROM d LEFT JOIN orders o ON date(o.created_at, ${PKT}) = d.x AND o.status != 'cancelled' GROUP BY d.x ORDER BY d.x`);
    const low = int(settings().low_stock_at, 5);
    const lowStock = all(`SELECT p.id, p.title, NULL vname, p.stock FROM products p WHERE p.status='active' AND p.stock <= ? AND NOT EXISTS (SELECT 1 FROM variants v WHERE v.product_id=p.id)
      UNION ALL SELECT p.id, p.title, v.name vname, v.stock FROM variants v JOIN products p ON p.id = v.product_id WHERE p.status='active' AND v.stock <= ? ORDER BY stock LIMIT 12`, low, low);
    const recent = all("SELECT id, number, name, total, status, payment_method, created_at FROM orders ORDER BY id DESC LIMIT 8");
    const top = all(`SELECT title, SUM(qty) qty, SUM(line_total) revenue FROM order_items i JOIN orders o ON o.id = i.order_id WHERE o.status != 'cancelled' GROUP BY title ORDER BY revenue DESC LIMIT 6`);
    const counts = { products: get("SELECT COUNT(*) n FROM products").n, customers: get("SELECT COUNT(*) n FROM customers").n, reviews: get("SELECT COUNT(*) n FROM reviews WHERE approved = 0").n };
    return json(res, { today, week, month, open, pending, series, lowStock, recent, top, counts });
  }

  /* ---- orders ---- */
  if (p === "/orders" && M === "GET") {
    const st = url.searchParams.get("status"), q = str(url.searchParams.get("q"), 60);
    const where = [], params = [];
    if (STATUSES.includes(st)) { where.push("status = ?"); params.push(st); }
    if (q) { where.push("(number LIKE ? OR name LIKE ? OR phone LIKE ?)"); params.push(`%${q}%`, `%${q}%`, `%${q.replace(/\D/g, "") || q}%`); }
    const W = where.length ? "WHERE " + where.join(" AND ") : "";
    return json(res, all(`SELECT o.*, (SELECT SUM(qty) FROM order_items WHERE order_id = o.id) items FROM orders o ${W} ORDER BY id DESC LIMIT 300`, ...params));
  }
  if ((m = p.match(/^\/orders\/(\d+)$/))) {
    const id = int(m[1]);
    if (M === "PATCH") {
      if (body.status) setOrderStatus(id, body.status, body.note);
      if (body.payment_status && ["paid", "unpaid", "refunded"].includes(body.payment_status)) {
        run("UPDATE orders SET payment_status = ?, updated_at = datetime('now') WHERE id = ?", body.payment_status, id);
        run("INSERT INTO order_events(order_id, status, note) VALUES(?,?,?)", id, "payment", `Payment marked ${body.payment_status}`);
      }
      if (!body.status && body.note) run("INSERT INTO order_events(order_id, status, note) VALUES(?,?,?)", id, "note", str(body.note, 300));
    }
    const o = orderDetail("id = ?", id);
    if (!o) throw new HttpError(404, "Order not found");
    return json(res, o);
  }
  if (p === "/orders.csv") {
    const rows = all("SELECT number, created_at, name, phone, city, delivery_method, payment_method, payment_status, status, subtotal, discount, shipping, total FROM orders ORDER BY id DESC");
    const head = Object.keys(rows[0] || { number: 1 });
    const csv = [head.join(","), ...rows.map((r) => head.map((h) => `"${String(r[h] ?? "").replace(/"/g, '""')}"`).join(","))].join("\n");
    return send(res, 200, "﻿" + csv, "text/csv; charset=utf-8", { "Content-Disposition": 'attachment; filename="orders.csv"' });
  }

  /* ---- products ---- */
  if (p === "/products" && M === "GET") {
    return json(res, all(`SELECT p.*, c.name category, (SELECT COUNT(*) FROM variants v WHERE v.product_id=p.id) variant_count FROM products p LEFT JOIN categories c ON c.id = p.category_id ORDER BY p.id DESC`));
  }
  if (p === "/products" && M === "POST") return json(res, { id: saveProduct(body) });
  if ((m = p.match(/^\/products\/(\d+)$/))) {
    const id = int(m[1]);
    if (M === "PUT") saveProduct(body, id);
    if (M === "DELETE") { run("DELETE FROM products WHERE id = ?", id); return json(res, { ok: true }); }
    const prod = get("SELECT * FROM products WHERE id = ?", id);
    if (!prod) throw new HttpError(404, "Not found");
    prod.variants = all("SELECT * FROM variants WHERE product_id = ? ORDER BY sort, id", id);
    return json(res, prod);
  }
  if (p === "/stock" && M === "POST") {
    if (body.variantId) { run("UPDATE variants SET stock = ? WHERE id = ?", int(body.stock), int(body.variantId)); recomputeStock(int(body.productId)); }
    else run("UPDATE products SET stock = ? WHERE id = ?", int(body.stock), int(body.productId));
    return json(res, { ok: true });
  }
  if (p === "/inventory") {
    return json(res, all(`SELECT p.id product_id, NULL variant_id, p.title, '' vname, p.sku, p.stock FROM products p WHERE NOT EXISTS (SELECT 1 FROM variants v WHERE v.product_id = p.id)
      UNION ALL SELECT p.id, v.id, p.title, v.name, v.sku, v.stock FROM variants v JOIN products p ON p.id = v.product_id ORDER BY stock, title`));
  }
  if (p === "/upload" && M === "POST") {
    const mm = String(body.data || "").match(/^data:image\/(png|jpeg|webp);base64,(.+)$/);
    if (!mm) throw new HttpError(400, "Upload a PNG, JPG or WebP image.");
    const buf = Buffer.from(mm[2], "base64");
    if (buf.length > 4_000_000) throw new HttpError(413, "Image is too large (max 4 MB).");
    const name = `${Date.now()}-${token(6)}.${mm[1] === "jpeg" ? "jpg" : mm[1]}`;
    await writeFile(join(UPLOAD_DIR, name), buf);
    return json(res, { url: `/uploads/${name}` });
  }

  /* ---- categories ---- */
  if (p === "/categories" && M === "GET") return json(res, all("SELECT c.*, (SELECT COUNT(*) FROM products WHERE category_id = c.id) n FROM categories c ORDER BY sort, id"));
  if (p === "/categories" && M === "POST" || (m = p.match(/^\/categories\/(\d+)$/))) {
    const id = m ? int(m[1]) : 0;
    if (M === "DELETE") { run("DELETE FROM categories WHERE id = ?", id); return json(res, { ok: true }); }
    const name = str(body.name, 80);
    if (!name) throw new HttpError(400, "Category name is required.");
    const vals = [slugify(body.slug || name), name, str(body.name_ur, 80), ["E", "S", "H"].includes(body.trade) ? body.trade : "E", ICON_KEYS.includes(body.icon) ? body.icon : "box", int(body.sort)];
    if (id) run("UPDATE categories SET slug=?, name=?, name_ur=?, trade=?, icon=?, sort=? WHERE id=?", ...vals, id);
    else run("INSERT INTO categories(slug, name, name_ur, trade, icon, sort) VALUES(?,?,?,?,?,?)", ...vals);
    return json(res, { ok: true });
  }

  /* ---- customers ---- */
  if (p === "/customers") {
    return json(res, all(`SELECT c.id, c.name, c.phone, c.email, c.city, c.created_at, c.password_hash IS NOT NULL has_account,
      (SELECT COUNT(*) FROM orders o WHERE o.phone = c.phone) orders, (SELECT COALESCE(SUM(total),0) FROM orders o WHERE o.phone = c.phone AND status != 'cancelled') spent
      FROM customers c
      UNION ALL
      SELECT NULL, o.name, o.phone, o.email, o.city, MIN(o.created_at), 0, COUNT(*), SUM(CASE WHEN status != 'cancelled' THEN total ELSE 0 END)
      FROM orders o WHERE o.phone NOT IN (SELECT phone FROM customers) GROUP BY o.phone
      ORDER BY spent DESC`));
  }

  /* ---- discounts ---- */
  if (p === "/discounts" && M === "GET") return json(res, all("SELECT * FROM discounts ORDER BY id DESC"));
  if (p === "/discounts" && M === "POST" || (m = p.match(/^\/discounts\/(\d+)$/))) {
    const id = m ? int(m[1]) : 0;
    if (M === "DELETE") { run("DELETE FROM discounts WHERE id = ?", id); return json(res, { ok: true }); }
    const code = str(body.code, 30).toUpperCase().replace(/\s+/g, "");
    if (!code) throw new HttpError(400, "Enter a code.");
    const vals = [code, ["percent", "fixed", "free_shipping"].includes(body.type) ? body.type : "percent", Math.max(0, int(body.value)), Math.max(0, int(body.min_subtotal)),
      /^\d{4}-\d{2}-\d{2}$/.test(body.ends_at || "") ? body.ends_at : null, int(body.usage_limit) > 0 ? int(body.usage_limit) : null, body.active ? 1 : 0];
    try {
      if (id) run("UPDATE discounts SET code=?, type=?, value=?, min_subtotal=?, ends_at=?, usage_limit=?, active=? WHERE id=?", ...vals, id);
      else run("INSERT INTO discounts(code, type, value, min_subtotal, ends_at, usage_limit, active) VALUES(?,?,?,?,?,?,?)", ...vals);
    } catch (e) { if (String(e.message).includes("UNIQUE")) throw new HttpError(409, "That code already exists."); throw e; }
    return json(res, { ok: true });
  }

  /* ---- reviews ---- */
  if (p === "/reviews" && M === "GET") return json(res, all("SELECT r.*, p.title product, p.slug FROM reviews r JOIN products p ON p.id = r.product_id ORDER BY r.approved, r.id DESC"));
  if ((m = p.match(/^\/reviews\/(\d+)$/))) {
    if (M === "DELETE") run("DELETE FROM reviews WHERE id = ?", int(m[1]));
    else run("UPDATE reviews SET approved = ? WHERE id = ?", body.approved ? 1 : 0, int(m[1]));
    return json(res, { ok: true });
  }

  /* ---- settings ---- */
  if (p === "/settings") {
    if (M === "PUT") saveSettings(body);
    return json(res, settings());
  }

  throw new HttpError(404, "Not found");
}

/* ================================================================ invoice */
function invoice(req, res, id) {
  requireAdmin(req);
  const s = settings();
  const o = orderDetail("id = ?", id);
  if (!o) throw new HttpError(404, "Order not found");
  const cur = s.currency;
  html(res, `<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${esc(o.number)}</title>
<style>body{font:14px/1.5 system-ui,sans-serif;color:#16150f;max-width:760px;margin:30px auto;padding:0 20px}h1{font-size:28px;margin:0}table{width:100%;border-collapse:collapse;margin:18px 0}td,th{padding:8px;border-bottom:1px solid #ddd;text-align:left}td:last-child,th:last-child{text-align:right}.top{display:flex;justify-content:space-between;gap:20px;border-bottom:3px solid #16150f;padding-bottom:14px}.mark{width:54px;height:54px}.tot td{border:0;padding:3px 8px}.grand td{font-weight:700;font-size:17px;border-top:2px solid #16150f}.muted{color:#6b6558}@media print{button{display:none}}</style></head><body>
<div class="top"><div style="display:flex;gap:12px;align-items:center"><img class="mark" src="/static/logo-mark.svg" alt=""><div><b style="font-size:18px">MALIK SHAHZAD</b><div class="muted">Electric · Hardware · Sanitary<br>${esc(s.address)} · ${esc(s.phone)}</div></div></div>
<div style="text-align:right"><h1>Invoice</h1><div>${esc(o.number)}<br>${esc(o.created_at.slice(0, 16))} UTC</div></div></div>
<p><b>Bill to:</b> ${esc(o.name)} · ${esc(o.phone)}<br>${o.delivery_method === "pickup" ? "Pickup at counter" : esc(o.address) + ", " + esc(o.city)}</p>
<table><thead><tr><th>Item</th><th>Price</th><th>Qty</th><th>Amount</th></tr></thead><tbody>
${o.items.map((i) => `<tr><td>${esc(i.title)}${i.variant_name ? " — " + esc(i.variant_name) : ""}</td><td>${money(i.price, cur)}</td><td>${i.qty}</td><td>${money(i.line_total, cur)}</td></tr>`).join("")}
</tbody></table>
<table style="width:320px;margin-left:auto"><tbody class="tot"><tr><td>Subtotal</td><td>${money(o.subtotal, cur)}</td></tr>
${o.discount ? `<tr><td>Discount ${esc(o.discount_code)}</td><td>− ${money(o.discount, cur)}</td></tr>` : ""}
<tr><td>Delivery</td><td>${money(o.shipping, cur)}</td></tr><tr class="grand"><td>Total</td><td>${money(o.total, cur)}</td></tr></tbody></table>
<p>Payment: ${PAYMENT_LABEL[o.payment_method] || esc(o.payment_method)} — ${o.payment_status === "paid" ? "PAID" : "UNPAID"}</p>
<p class="muted">Thank you for shopping with us. Unused items in original packing can be exchanged within 7 days with this invoice.</p>
<button onclick="print()">Print</button></body></html>`);
}

/* ================================================================ server */
const server = createServer(async (req, res) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  const url = new URL(req.url, "http://x");
  const p = url.pathname;
  try {
    if (p === "/healthz") { get("SELECT 1 AS ok"); return send(res, 200, "ok", MIME[".txt"], { "Cache-Control": "no-store" }); }
    if (p.startsWith("/static/")) { if (await serveFile(res, PUBLIC, p.slice(8))) return; }
    else if (p.startsWith("/uploads/")) { if (await serveFile(res, UPLOAD_DIR, p.slice(9), "public, max-age=604800")) return; }
    else if (p === "/admin" || p === "/admin/") { await serveFile(res, join(PUBLIC, "admin"), "index.html", "no-store"); return; }
    else if (p.startsWith("/admin/invoice/")) return invoice(req, res, int(p.split("/").pop()));
    else if (p.startsWith("/admin/")) { if (await serveFile(res, join(PUBLIC, "admin"), p.slice(7), "no-cache")) return; }
    else if (p.startsWith("/api/admin/")) return await adminApi(req, res, url);
    else if (p.startsWith("/api/")) return await publicApi(req, res, url);
    else if (req.method === "GET" || req.method === "HEAD" || (p === "/track" && req.method === "POST")) return await storefront(req, res, url);
    throw new HttpError(404, "Not found");
  } catch (e) {
    const status = e.status || 500;
    if (status === 500) console.error(e);
    if (p.startsWith("/api/")) return json(res, { error: status === 500 ? "Something went wrong. Please try again." : e.message }, status);
    if (!res.headersSent) html(res, `<h1>${status}</h1><p>${esc(status === 500 ? "Something went wrong." : e.message)}</p><p><a href="/">Home</a></p>`, status);
  }
});

server.listen(PORT, () => {
  const admins = get("SELECT COUNT(*) n FROM admins").n;
  console.log(`Malik Shahzad store running on http://localhost:${PORT}`);
  if (!admins) console.log(`First run: open http://localhost:${PORT}/admin to create the owner account.`);
});

process.on("SIGTERM", () => { server.close(); db.close(); process.exit(0); });
