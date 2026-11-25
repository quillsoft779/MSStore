import { DatabaseSync } from "node:sqlite";
import { mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { seed } from "./seed.js";

export const DATA_DIR = process.env.DATA_DIR || fileURLToPath(new URL("../data", import.meta.url));
export const UPLOAD_DIR = join(DATA_DIR, "uploads");
mkdirSync(UPLOAD_DIR, { recursive: true });

const file = join(DATA_DIR, "store.db");
const fresh = !existsSync(file);
export const db = new DatabaseSync(file);
db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");

db.exec(`
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY, slug TEXT UNIQUE NOT NULL, name TEXT NOT NULL, name_ur TEXT DEFAULT '',
  trade TEXT NOT NULL DEFAULT 'E', icon TEXT DEFAULT 'box', sort INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY, slug TEXT UNIQUE NOT NULL, title TEXT NOT NULL, title_ur TEXT DEFAULT '',
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  brand TEXT DEFAULT '', description TEXT DEFAULT '', unit TEXT DEFAULT 'piece',
  price INTEGER NOT NULL DEFAULT 0, compare_price INTEGER, sku TEXT DEFAULT '', stock INTEGER NOT NULL DEFAULT 0,
  image TEXT, icon TEXT DEFAULT 'box', status TEXT NOT NULL DEFAULT 'active', featured INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS variants (
  id INTEGER PRIMARY KEY, product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL, price INTEGER NOT NULL, compare_price INTEGER, sku TEXT DEFAULT '', stock INTEGER NOT NULL DEFAULT 0, sort INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, phone TEXT UNIQUE NOT NULL, email TEXT DEFAULT '',
  password_hash TEXT, address TEXT DEFAULT '', city TEXT DEFAULT '', created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY, number TEXT UNIQUE NOT NULL, token TEXT NOT NULL,
  customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  name TEXT NOT NULL, phone TEXT NOT NULL, email TEXT DEFAULT '', address TEXT DEFAULT '', city TEXT DEFAULT '', notes TEXT DEFAULT '',
  delivery_method TEXT NOT NULL DEFAULT 'delivery', payment_method TEXT NOT NULL DEFAULT 'cod',
  payment_ref TEXT DEFAULT '', payment_status TEXT NOT NULL DEFAULT 'unpaid', status TEXT NOT NULL DEFAULT 'pending',
  subtotal INTEGER NOT NULL, discount INTEGER NOT NULL DEFAULT 0, shipping INTEGER NOT NULL DEFAULT 0, total INTEGER NOT NULL,
  discount_code TEXT DEFAULT '', created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY, order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER, variant_id INTEGER, title TEXT NOT NULL, variant_name TEXT DEFAULT '',
  price INTEGER NOT NULL, qty INTEGER NOT NULL, line_total INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS order_events (
  id INTEGER PRIMARY KEY, order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL, note TEXT DEFAULT '', created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS discounts (
  id INTEGER PRIMARY KEY, code TEXT UNIQUE NOT NULL, type TEXT NOT NULL DEFAULT 'percent', value INTEGER NOT NULL DEFAULT 0,
  min_subtotal INTEGER DEFAULT 0, ends_at TEXT, usage_limit INTEGER, used INTEGER DEFAULT 0, active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY, product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL, rating INTEGER NOT NULL, body TEXT DEFAULT '', approved INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS admins (id INTEGER PRIMARY KEY, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL);

CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, kind TEXT NOT NULL, user_id INTEGER NOT NULL, expires INTEGER NOT NULL);

CREATE INDEX IF NOT EXISTS idx_products_cat ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_variants_product ON variants(product_id);
CREATE INDEX IF NOT EXISTS idx_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
`);

if (fresh) seed(db);

/* ---------- small helpers ---------- */
export const all = (sql, ...p) => db.prepare(sql).all(...p);
export const get = (sql, ...p) => db.prepare(sql).get(...p);
export const run = (sql, ...p) => db.prepare(sql).run(...p);

export function tx(fn) {
  db.exec("BEGIN");
  try { const r = fn(); db.exec("COMMIT"); return r; }
  catch (e) { db.exec("ROLLBACK"); throw e; }
}

const DEFAULT_SETTINGS = {
  store_name: "Malik Shahzad Electric, Hardware & Sanitary Store",
  phone: "+92 344 6504445",
  whatsapp: "923446504445",
  address: "Raiwind Road, Kot Araian, Lahore",
  currency: "Rs",
  local_city: "Lahore",
  shipping_local: "250",
  shipping_outside: "500",
  free_shipping_over: "10000",
  allow_pickup: "1",
  pay_cod: "1",
  pay_bank: "1",
  pay_jazzcash: "1",
  pay_easypaisa: "1",
  bank_details: "Bank: (your bank)\nAccount title: Malik Shahzad\nIBAN: PK00 XXXX 0000 0000 0000 0000",
  wallet_number: "0344 6504445",
  announcement: "Open 24 hours · Cash on delivery across Lahore · Order on WhatsApp: 0344 650 4445",
  low_stock_at: "5"
};

export function settings() {
  const rows = all("SELECT key, value FROM settings");
  const out = { ...DEFAULT_SETTINGS };
  for (const r of rows) out[r.key] = r.value;
  return out;
}

export function saveSettings(obj) {
  const st = db.prepare("INSERT INTO settings(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value");
  for (const [k, v] of Object.entries(obj)) if (k in DEFAULT_SETTINGS) st.run(k, String(v ?? ""));
}
