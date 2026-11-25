import { all, get, run, tx, settings } from "./db.js";
import { HttpError, int, str, normPhone, token } from "./util.js";

export const STATUSES = ["pending", "confirmed", "packed", "shipped", "delivered", "cancelled"];
export const STATUS_LABEL = {
  pending: "Order received", confirmed: "Confirmed", packed: "Packed", shipped: "Out for delivery",
  delivered: "Delivered", cancelled: "Cancelled"
};
export const PAYMENT_LABEL = { cod: "Cash on delivery", bank: "Bank transfer", jazzcash: "JazzCash", easypaisa: "Easypaisa", counter: "Pay at counter" };

export function paymentMethods(s = settings()) {
  const m = [];
  if (s.pay_cod === "1") m.push("cod");
  if (s.pay_bank === "1") m.push("bank");
  if (s.pay_jazzcash === "1") m.push("jazzcash");
  if (s.pay_easypaisa === "1") m.push("easypaisa");
  return m;
}

export function recomputeStock(productId) {
  const v = get("SELECT COUNT(*) n, COALESCE(SUM(stock),0) s, MIN(price) p FROM variants WHERE product_id = ?", productId);
  if (v.n > 0) run("UPDATE products SET stock = ?, price = ?, updated_at = datetime('now') WHERE id = ?", v.s, v.p, productId);
}

export function checkDiscount(code, subtotal) {
  if (!code) return { discount: null };
  const d = get("SELECT * FROM discounts WHERE code = ? COLLATE NOCASE", str(code, 40));
  if (!d || !d.active) return { error: "That code isn't valid." };
  if (d.ends_at && new Date(d.ends_at + "T23:59:59") < new Date()) return { error: "That code has expired." };
  if (d.usage_limit != null && d.used >= d.usage_limit) return { error: "That code has been fully used." };
  if (subtotal < (d.min_subtotal || 0)) return { error: `Add items worth Rs ${d.min_subtotal.toLocaleString("en-PK")} or more to use this code.` };
  return { discount: d };
}

/**
 * Price a cart on the server. Never trusts prices from the browser.
 * items: [{ productId, variantId, qty }]
 */
export function quote({ items = [], code = "", city = "", delivery = "delivery" } = {}) {
  const s = settings();
  const lines = [];
  for (const it of Array.isArray(items) ? items.slice(0, 100) : []) {
    const qty = Math.max(1, Math.min(999, int(it.qty, 1)));
    const p = get("SELECT p.*, c.slug cat_slug FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE p.id = ? AND p.status = 'active'", int(it.productId));
    if (!p) continue;
    const variants = all("SELECT * FROM variants WHERE product_id = ? ORDER BY sort, id", p.id);
    let v = null;
    if (variants.length) {
      v = variants.find((x) => x.id === int(it.variantId)) || null;
      if (!v) continue;
    }
    const price = v ? v.price : p.price;
    const stock = v ? v.stock : p.stock;
    lines.push({
      productId: p.id, variantId: v ? v.id : null, slug: p.slug, title: p.title, variant: v ? v.name : "",
      unit: p.unit, image: p.image, icon: p.icon, price, qty, stock, lineTotal: price * qty,
      error: stock <= 0 ? "Out of stock" : qty > stock ? `Only ${stock} left` : ""
    });
  }
  const subtotal = lines.reduce((a, l) => a + l.lineTotal, 0);

  let discount = 0, discountCode = "", discountError = "", freeShipCode = false;
  if (code) {
    const r = checkDiscount(code, subtotal);
    if (r.error) discountError = r.error;
    else if (r.discount) {
      const d = r.discount;
      discountCode = d.code;
      if (d.type === "percent") discount = Math.round(subtotal * Math.min(100, d.value) / 100);
      else if (d.type === "fixed") discount = Math.min(d.value, subtotal);
      else if (d.type === "free_shipping") freeShipCode = true;
    }
  }

  const freeOver = int(s.free_shipping_over, 0);
  const isLocal = !city || city.toLowerCase().includes(String(s.local_city || "lahore").toLowerCase());
  let shipping = 0;
  if (delivery !== "pickup" && lines.length) {
    shipping = isLocal ? int(s.shipping_local) : int(s.shipping_outside);
    if ((freeOver > 0 && subtotal - discount >= freeOver) || freeShipCode) shipping = 0;
  }

  return {
    lines, subtotal, discount, discountCode, discountError, shipping,
    total: Math.max(0, subtotal - discount + shipping),
    freeShippingOver: freeOver, isLocal, count: lines.reduce((a, l) => a + l.qty, 0)
  };
}

function nextOrderNumber() {
  const r = get("SELECT number FROM orders ORDER BY id DESC LIMIT 1");
  const n = r ? int(r.number.replace(/\D/g, ""), 10000) + 1 : 10001;
  return "MS-" + n;
}

export function placeOrder(body, customerId = null) {
  const s = settings();
  const name = str(body.name, 100);
  const phone = normPhone(body.phone);
  const delivery = body.delivery === "pickup" && s.allow_pickup === "1" ? "pickup" : "delivery";
  const city = str(body.city, 80);
  const address = str(body.address, 400);
  const payment = delivery === "pickup" && body.payment === "counter" ? "counter" : str(body.payment, 20);

  if (!name) throw new HttpError(400, "Please enter your name.");
  if (!phone) throw new HttpError(400, "Please enter a valid mobile number, like 0300 1234567.");
  if (delivery === "delivery" && (!address || !city)) throw new HttpError(400, "Please enter your delivery address and city.");
  if (payment !== "counter" && !paymentMethods(s).includes(payment)) throw new HttpError(400, "Please choose a payment method.");

  return tx(() => {
    const q = quote({ items: body.items, code: body.code, city, delivery });
    if (!q.lines.length) throw new HttpError(400, "Your cart is empty.");
    const bad = q.lines.find((l) => l.error);
    if (bad) throw new HttpError(409, `${bad.title}${bad.variant ? " (" + bad.variant + ")" : ""}: ${bad.error}. Please update your cart.`);

    const number = nextOrderNumber();
    const tok = token(12);
    const r = run(`INSERT INTO orders(number, token, customer_id, name, phone, email, address, city, notes, delivery_method, payment_method, payment_ref,
        subtotal, discount, shipping, total, discount_code) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      number, tok, customerId, name, phone, str(body.email, 120), address, city, str(body.notes, 600), delivery, payment,
      str(body.paymentRef, 60), q.subtotal, q.discount, q.shipping, q.total, q.discountCode);
    const orderId = Number(r.lastInsertRowid);

    for (const l of q.lines) {
      run("INSERT INTO order_items(order_id, product_id, variant_id, title, variant_name, price, qty, line_total) VALUES(?,?,?,?,?,?,?,?)",
        orderId, l.productId, l.variantId, l.title, l.variant, l.price, l.qty, l.lineTotal);
      if (l.variantId) { run("UPDATE variants SET stock = stock - ? WHERE id = ?", l.qty, l.variantId); recomputeStock(l.productId); }
      else run("UPDATE products SET stock = stock - ? WHERE id = ?", l.qty, l.productId);
    }
    if (q.discountCode) run("UPDATE discounts SET used = used + 1 WHERE code = ?", q.discountCode);
    run("INSERT INTO order_events(order_id, status, note) VALUES(?,?,?)", orderId, "pending", "Order placed online");

    if (customerId) run("UPDATE customers SET address = COALESCE(NULLIF(?, ''), address), city = COALESCE(NULLIF(?, ''), city) WHERE id = ?", address, city, customerId);
    return { id: orderId, number, token: tok, total: q.total };
  });
}

export function setOrderStatus(id, status, note = "") {
  if (!STATUSES.includes(status)) throw new HttpError(400, "Unknown status");
  return tx(() => {
    const o = get("SELECT * FROM orders WHERE id = ?", id);
    if (!o) throw new HttpError(404, "Order not found");
    if (o.status === status) return o;
    const items = all("SELECT * FROM order_items WHERE order_id = ?", id);
    const restock = (sign) => {
      for (const it of items) {
        if (it.variant_id) {
          run("UPDATE variants SET stock = stock + ? WHERE id = ?", sign * it.qty, it.variant_id);
          if (it.product_id) recomputeStock(it.product_id);
        } else if (it.product_id) run("UPDATE products SET stock = stock + ? WHERE id = ?", sign * it.qty, it.product_id);
      }
    };
    if (status === "cancelled") restock(+1);
    if (o.status === "cancelled") restock(-1);
    run("UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?", status, id);
    if (status === "delivered" && o.payment_method === "cod") run("UPDATE orders SET payment_status = 'paid' WHERE id = ?", id);
    run("INSERT INTO order_events(order_id, status, note) VALUES(?,?,?)", id, status, str(note, 300));
    return get("SELECT * FROM orders WHERE id = ?", id);
  });
}

export function orderDetail(where, ...params) {
  const o = get(`SELECT * FROM orders WHERE ${where}`, ...params);
  if (!o) return null;
  o.items = all("SELECT * FROM order_items WHERE order_id = ?", o.id);
  o.events = all("SELECT * FROM order_events WHERE order_id = ? ORDER BY id", o.id);
  return o;
}
