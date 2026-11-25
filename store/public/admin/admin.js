/* Malik Shahzad — store admin (single-page app, no build step) */
const app = document.getElementById("app");
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const money = (n) => "Rs " + Math.round(n || 0).toLocaleString("en-PK");
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
let META = { icons: {}, statuses: [], statusLabel: {}, paymentLabel: {} };
let BADGES = { pending: 0, reviews: 0 };

async function api(path, method = "GET", body) {
  const opt = { method, credentials: "same-origin", headers: {} };
  if (body !== undefined) { opt.headers["Content-Type"] = "application/json"; opt.body = JSON.stringify(body); }
  const r = await fetch("/api/admin" + path, opt);
  const data = await r.json().catch(() => ({}));
  if (r.status === 401) { boot(); throw new Error("Please log in."); }
  if (!r.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

function toast(msg, bad = false) {
  const t = $(".toast");
  t.textContent = msg; t.className = "toast" + (bad ? " bad" : ""); t.hidden = false;
  clearTimeout(t._h); t._h = setTimeout(() => (t.hidden = true), 2600);
}

const thumb = (p) => `<div class="thumb">${p.image ? `<img src="${esc(p.image)}" alt="">` : `<svg viewBox="0 0 32 32">${META.icons[p.icon] || META.icons.box || ""}</svg>`}</div>`;
const badge = (s, label) => `<span class="badge b-${esc(s)}">${esc(label || s)}</span>`;
const date = (s) => (s ? new Date(s.replace(" ", "T") + "Z").toLocaleString("en-PK", { dateStyle: "medium", timeStyle: "short" }) : "");
const waLink = (phone, text) => `https://wa.me/92${String(phone).replace(/^0/, "")}?text=${encodeURIComponent(text)}`;

/* ================================================================ auth */
async function boot() {
  const me = await fetch("/api/admin/me", { credentials: "same-origin" }).then((r) => r.json());
  META = me;
  if (me.admin) { shell(); route(); return; }
  const setup = me.needsSetup;
  app.innerHTML = `<div class="login"><form id="lf">
    <img src="/static/logo-mark.svg" alt="">
    <h1>${setup ? "Create owner account" : "Store admin"}</h1>
    <p class="muted" style="margin:0">${setup ? "First time here. Choose the username and password you'll use to manage the shop. Keep them private." : "Malik Shahzad online store"}</p>
    ${setup && me.setupCode ? `<label>Setup code <small>(from the setup-code file on your computer)</small><input name="code" required autocomplete="off" spellcheck="false"></label>` : ""}
    <label>Username<input name="username" required autocomplete="username"></label>
    <label>Password ${setup ? "<small>(at least 8 characters)</small>" : ""}<input name="password" type="password" required minlength="${setup ? 8 : 1}" autocomplete="${setup ? "new-password" : "current-password"}"></label>
    <p class="err" hidden></p>
    <button class="btn btn--y">${setup ? "Create account & open admin" : "Log in"}</button>
  </form></div>`;
  $("#lf").onsubmit = async (e) => {
    e.preventDefault();
    try { await api(setup ? "/setup" : "/login", "POST", Object.fromEntries(new FormData(e.target))); boot(); }
    catch (ex) { const er = $(".err"); er.textContent = ex.message; er.hidden = false; }
  };
}

/* ================================================================ shell */
const NAV = [["dashboard", "Dashboard"], ["orders", "Orders"], ["products", "Products"], ["inventory", "Inventory"], ["categories", "Categories"],
  ["customers", "Customers"], ["discounts", "Discounts"], ["reviews", "Reviews"], ["settings", "Settings"]];

function shell() {
  app.innerHTML = `<div class="shell">
    <aside class="side" id="side">
      <a class="brand" href="#/dashboard"><img src="/static/logo-mark.svg" alt=""><span><b>Malik Shahzad</b><small>Store admin</small></span></a>
      <nav class="nav">${NAV.map(([k, l]) => `<a href="#/${k}" data-k="${k}">${l}<i data-badge="${k}" hidden></i></a>`).join("")}</nav>
      <div class="side__foot"><a href="/" target="_blank">View store ↗</a><span class="muted">Signed in as ${esc(META.admin.username)}</span><button id="logout">Log out</button></div>
    </aside>
    <main id="view"></main>
  </div>`;
  $("#logout").onclick = async () => { await api("/logout", "POST", {}); location.hash = ""; boot(); };
  document.addEventListener("click", (e) => { if (e.target.closest(".nav a")) $("#side").classList.remove("open"); });
}

function setBadges() {
  const map = { orders: BADGES.pending, reviews: BADGES.reviews };
  $$("[data-badge]").forEach((i) => { const n = map[i.dataset.badge]; i.hidden = !n; i.textContent = n || ""; });
}

const view = () => $("#view");
const header = (title, sub = "", actions = "") => `<div class="head"><div><button class="btn btn--line btn--sm menu-btn" onclick="document.getElementById('side').classList.add('open')">☰ Menu</button><h1>${title}</h1>${sub ? `<div class="sub">${sub}</div>` : ""}</div><div class="row">${actions}</div></div>`;

async function route() {
  if (!$("#view")) return;
  const [, page = "dashboard", id] = location.hash.split("?")[0].split("/");
  $$(".nav a").forEach((a) => a.classList.toggle("on", a.dataset.k === page));
  view().innerHTML = '<p class="muted">Loading…</p>';
  try {
    const fn = { dashboard, orders: id ? orderView : orders, products: id ? productEdit : products, inventory, categories, customers, discounts, reviews, settingsView }[page === "settings" ? "settingsView" : page];
    await (fn || dashboard)(id);
  } catch (e) { view().innerHTML = `<p class="err">${esc(e.message)}</p>`; }
  window.scrollTo(0, 0);
}
window.addEventListener("hashchange", route);

/* ================================================================ dashboard */
function chart(series) {
  const W = 700, H = 190, pad = 24, bw = (W - pad) / series.length;
  const max = Math.max(1, ...series.map((d) => d.total));
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Sales for the last 14 days">
    <line class="grid" x1="${pad}" x2="${W}" y1="${H - 20}" y2="${H - 20}"/>
    ${series.map((d, i) => {
      const h = Math.round((d.total / max) * (H - 50));
      const x = pad + i * bw + 4;
      return `<g><title>${d.day}: ${money(d.total)} · ${d.n} order${d.n === 1 ? "" : "s"}</title>
        <rect class="bar" x="${x}" y="${H - 20 - h}" width="${bw - 8}" height="${Math.max(h, 1)}" rx="3"/>
        ${i % 2 === 0 || series.length < 10 ? `<text x="${x + (bw - 8) / 2}" y="${H - 5}" text-anchor="middle">${d.day.slice(8)}/${d.day.slice(5, 7)}</text>` : ""}</g>`;
    }).join("")}
    <text x="0" y="12">${money(max)}</text>
  </svg>`;
}

async function dashboard() {
  const s = await api("/stats");
  BADGES = { pending: s.pending, reviews: s.counts.reviews }; setBadges();
  view().innerHTML = header("Dashboard", new Date().toLocaleDateString("en-PK", { weekday: "long", day: "numeric", month: "long" }),
    `<a class="btn btn--line" href="/" target="_blank">View store ↗</a><a class="btn btn--y" href="#/products/new">+ Add product</a>`) + `
  <div class="kpis">
    <div class="kpi kpi--hot"><span>Needs action</span><b>${s.pending}</b><small>new order${s.pending === 1 ? "" : "s"} to confirm · ${s.open} open</small></div>
    <div class="kpi"><span>Today</span><b>${money(s.today.t)}</b><small>${s.today.n} order${s.today.n === 1 ? "" : "s"}</small></div>
    <div class="kpi"><span>Last 7 days</span><b>${money(s.week.t)}</b><small>${s.week.n} orders</small></div>
    <div class="kpi"><span>This month</span><b>${money(s.month.t)}</b><small>${s.month.n} orders</small></div>
  </div>
  <div class="grid2">
    <div class="stack">
      <div class="card"><h2>Sales · last 14 days</h2>${chart(s.series)}</div>
      <div class="tbl"><table><thead><tr><th>Order</th><th>Customer</th><th>Status</th><th class="num">Total</th></tr></thead><tbody>
        ${s.recent.length ? s.recent.map((o) => `<tr class="click" data-go="#/orders/${o.id}"><td><b>${esc(o.number)}</b><br><small class="muted">${date(o.created_at)}</small></td><td>${esc(o.name)}</td><td>${badge(o.status, META.statusLabel[o.status])}</td><td class="num">${money(o.total)}</td></tr>`).join("")
          : `<tr><td colspan="4" class="empty">No orders yet. Share your store link on WhatsApp and Google Maps to get the first one.</td></tr>`}
      </tbody></table></div>
    </div>
    <div class="stack">
      <div class="card"><h2>Low stock</h2>${s.lowStock.length ? `<table>${s.lowStock.map((l) => `<tr class="click" data-go="#/products/${l.id}"><td>${esc(l.title)}${l.vname ? ` <small class="muted">· ${esc(l.vname)}</small>` : ""}</td><td class="num ${l.stock <= 0 ? "low" : ""}">${l.stock}</td></tr>`).join("")}</table>` : '<p class="muted">Everything is well stocked.</p>'}<p><a href="#/inventory">Update stock →</a></p></div>
      <div class="card"><h2>Top sellers</h2>${s.top.length ? `<table>${s.top.map((t) => `<tr><td>${esc(t.title)}</td><td class="num">${t.qty} sold</td><td class="num">${money(t.revenue)}</td></tr>`).join("")}</table>` : '<p class="muted">Shows up after your first sales.</p>'}</div>
      <div class="card"><h2>Store</h2><dl class="kv"><dt>Products</dt><dd>${s.counts.products}</dd><dt>Customers</dt><dd>${s.counts.customers}</dd><dt>Reviews</dt><dd>${s.counts.reviews} waiting for approval</dd></dl></div>
    </div>
  </div>`;
}

document.addEventListener("click", (e) => { const tr = e.target.closest("[data-go]"); if (tr && !e.target.closest("a, button, input")) location.hash = tr.dataset.go; });

/* ================================================================ orders */
async function orders() {
  const params = new URLSearchParams(location.hash.split("?")[1] || "");
  const st = params.get("status") || "", q = params.get("q") || "";
  const list = await api(`/orders?status=${encodeURIComponent(st)}&q=${encodeURIComponent(q)}`);
  if (!st && !q) { BADGES.pending = list.filter((o) => o.status === "pending").length; setBadges(); }
  view().innerHTML = header("Orders", `${list.length} order${list.length === 1 ? "" : "s"}`, `<a class="btn btn--line" href="/api/admin/orders.csv">Export CSV</a>`) + `
  <div class="row" style="justify-content:space-between;margin-bottom:12px">
    <div class="tabs">${[["", "All"], ...META.statuses.map((x) => [x, META.statusLabel[x]])].map(([k, l]) => `<a href="#/orders?status=${k}${q ? "&q=" + encodeURIComponent(q) : ""}" class="${st === k ? "on" : ""}">${l}</a>`).join("")}</div>
    <form id="osf" class="row"><input class="search" name="q" placeholder="Search number, name, phone" value="${esc(q)}"></form>
  </div>
  <div class="tbl"><table><thead><tr><th>Order</th><th>Date</th><th>Customer</th><th>Items</th><th>Payment</th><th>Status</th><th class="num">Total</th></tr></thead><tbody>
  ${list.length ? list.map((o) => `<tr class="click" data-go="#/orders/${o.id}"><td><b>${esc(o.number)}</b></td><td>${date(o.created_at)}</td><td>${esc(o.name)}<br><small class="muted mono">${esc(o.phone)}</small></td><td>${o.items || 0}</td>
    <td>${esc(META.paymentLabel[o.payment_method] || o.payment_method)}<br>${badge(o.payment_status)}</td><td>${badge(o.status, META.statusLabel[o.status])}</td><td class="num"><b>${money(o.total)}</b></td></tr>`).join("")
    : `<tr><td colspan="7" class="empty">No orders here.</td></tr>`}
  </tbody></table></div>`;
  $("#osf").onsubmit = (e) => { e.preventDefault(); location.hash = `#/orders?status=${st}&q=${encodeURIComponent(e.target.q.value.trim())}`; };
}

async function orderView(id) {
  const o = await api("/orders/" + id);
  const next = { pending: "confirmed", confirmed: "packed", packed: "shipped", shipped: "delivered" }[o.status];
  const msg = `Assalam o Alaikum ${o.name.split(" ")[0]}, your order ${o.number} from Malik Shahzad is now: ${META.statusLabel[o.status]}. Total ${money(o.total)}.`;
  view().innerHTML = header(`Order ${esc(o.number)}`, `${date(o.created_at)} · ${badge(o.status, META.statusLabel[o.status])} ${badge(o.payment_status)}`,
    `<a class="btn btn--line" href="#/orders">← All orders</a><a class="btn btn--line" href="/admin/invoice/${o.id}" target="_blank">Print invoice</a><a class="btn btn--wa" href="${waLink(o.phone, msg)}" target="_blank" rel="noopener">WhatsApp customer</a>`) + `
  <div class="grid2">
    <div class="stack">
      <div class="card">
        <h2>Status</h2>
        ${next ? `<p><button class="btn btn--y" data-status="${next}">Mark as ${esc(META.statusLabel[next])} →</button></p>` : ""}
        <div class="statusbar">${META.statuses.map((s) => `<button class="btn btn--line btn--sm ${o.status === s ? "on" : ""}" data-status="${s}">${esc(META.statusLabel[s])}</button>`).join("")}</div>
        <p class="muted" style="font-size:.85rem">Cancelling puts the items back in stock. Marking a cash-on-delivery order as delivered marks it paid.</p>
      </div>
      <div class="card"><h2>Items</h2>
        <table>${o.items.map((i) => `<tr><td>${esc(i.title)}${i.variant_name ? ` <small class="muted">· ${esc(i.variant_name)}</small>` : ""}</td><td class="num">${money(i.price)} × ${i.qty}</td><td class="num"><b>${money(i.line_total)}</b></td></tr>`).join("")}
          <tr><td colspan="2" class="num">Subtotal</td><td class="num">${money(o.subtotal)}</td></tr>
          ${o.discount ? `<tr><td colspan="2" class="num">Discount ${esc(o.discount_code)}</td><td class="num">− ${money(o.discount)}</td></tr>` : ""}
          <tr><td colspan="2" class="num">${o.delivery_method === "pickup" ? "Pickup" : "Delivery"}</td><td class="num">${money(o.shipping)}</td></tr>
          <tr><td colspan="2" class="num"><b>Total</b></td><td class="num"><b style="font-size:1.2rem">${money(o.total)}</b></td></tr>
        </table>
      </div>
      <div class="card"><h2>History</h2><ul class="timeline">${o.events.slice().reverse().map((e) => `<li><b>${esc(META.statusLabel[e.status] || e.status)}</b>${e.note ? ` — ${esc(e.note)}` : ""}<time>${date(e.created_at)}</time></li>`).join("")}</ul>
        <form id="nf" class="row" style="margin-top:12px"><input name="note" placeholder="Add a private note (e.g. called customer, rider name)" style="flex:1"><button class="btn btn--sm">Add note</button></form></div>
    </div>
    <div class="stack">
      <div class="card"><h2>Customer</h2><dl class="kv">
        <dt>Name</dt><dd>${esc(o.name)}</dd>
        <dt>Mobile</dt><dd><a href="tel:${esc(o.phone)}">${esc(o.phone)}</a></dd>
        ${o.email ? `<dt>Email</dt><dd>${esc(o.email)}</dd>` : ""}
        <dt>${o.delivery_method === "pickup" ? "Pickup" : "Deliver to"}</dt><dd>${o.delivery_method === "pickup" ? "Collect from counter" : `${esc(o.address)}<br>${esc(o.city)}`}</dd>
        ${o.notes ? `<dt>Note</dt><dd>${esc(o.notes)}</dd>` : ""}
      </dl></div>
      <div class="card"><h2>Payment</h2><dl class="kv">
        <dt>Method</dt><dd>${esc(META.paymentLabel[o.payment_method] || o.payment_method)}</dd>
        ${o.payment_ref ? `<dt>Txn ID</dt><dd><code>${esc(o.payment_ref)}</code></dd>` : ""}
        <dt>Status</dt><dd>${badge(o.payment_status)}</dd></dl>
        <p class="row" style="margin-top:12px">${o.payment_status !== "paid" ? '<button class="btn btn--sm" data-pay="paid">Mark paid</button>' : '<button class="btn btn--sm btn--line" data-pay="unpaid">Mark unpaid</button>'}${o.payment_status === "paid" ? '<button class="btn btn--sm btn--line" data-pay="refunded">Mark refunded</button>' : ""}</p></div>
    </div>
  </div>`;
  const patch = async (body) => { try { await api("/orders/" + id, "PATCH", body); toast("Order updated"); orderView(id); } catch (e) { toast(e.message, true); } };
  $$("[data-status]").forEach((b) => (b.onclick = () => {
    if (b.dataset.status === "cancelled" && !confirm("Cancel this order? Items go back into stock.")) return;
    patch({ status: b.dataset.status });
  }));
  $$("[data-pay]").forEach((b) => (b.onclick = () => patch({ payment_status: b.dataset.pay })));
  $("#nf").onsubmit = (e) => { e.preventDefault(); const n = e.target.note.value.trim(); if (n) patch({ note: n }); };
}

/* ================================================================ products */
let CATS = [];
async function products() {
  const [list, cats] = await Promise.all([api("/products"), api("/categories")]);
  CATS = cats;
  view().innerHTML = header("Products", `${list.length} products`, `<a class="btn btn--y" href="#/products/new">+ Add product</a>`) + `
  <div class="row" style="margin-bottom:12px">
    <input class="search" id="pq" placeholder="Search products or SKU">
    <select id="pc" style="width:auto"><option value="">All categories</option>${cats.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join("")}</select>
    <select id="ps" style="width:auto"><option value="">Any status</option><option value="active">Active</option><option value="draft">Draft</option><option value="out">Out of stock</option></select>
  </div>
  <div class="tbl"><table><thead><tr><th>Product</th><th>Category</th><th class="num">Price</th><th class="num">Stock</th><th>Status</th></tr></thead><tbody id="pb"></tbody></table></div>`;
  const draw = () => {
    const q = $("#pq").value.toLowerCase(), c = +$("#pc").value, s = $("#ps").value;
    const rows = list.filter((p) => (!q || (p.title + " " + p.sku + " " + p.title_ur).toLowerCase().includes(q)) && (!c || p.category_id === c)
      && (!s || (s === "out" ? p.stock <= 0 : p.status === s)));
    $("#pb").innerHTML = rows.length ? rows.map((p) => `<tr class="click" data-go="#/products/${p.id}">
      <td><div class="pcell">${thumb(p)}<span><b>${esc(p.title)}</b><small>${esc(p.sku)}${p.variant_count ? ` · ${p.variant_count} variants` : ""}${p.featured ? " · ★ featured" : ""}</small></span></div></td>
      <td>${esc(p.category || "—")}</td><td class="num">${p.variant_count ? "from " : ""}${money(p.price)}</td>
      <td class="num ${p.stock <= 0 ? "low" : ""}">${p.stock}</td><td>${badge(p.status)}</td></tr>`).join("") : `<tr><td colspan="5" class="empty">No products match.</td></tr>`;
  };
  ["#pq", "#pc", "#ps"].forEach((s) => $(s).addEventListener("input", draw));
  draw();
}

async function productEdit(id) {
  if (!CATS.length) CATS = await api("/categories");
  const isNew = id === "new";
  const p = isNew ? { title: "", title_ur: "", category_id: CATS[0]?.id, brand: "", unit: "piece", price: 0, compare_price: null, sku: "", stock: 0, image: null, icon: "box", status: "active", featured: 0, description: "", variants: [] } : await api("/products/" + id);
  if (isNew && CATS[0]) p.icon = CATS[0].icon;
  const vrow = (v = {}) => `<tr><td><input name="vname" value="${esc(v.name || "")}" placeholder="e.g. 7/29 or ½&quot;"><input type="hidden" name="vid" value="${v.id || ""}"></td>
    <td><input name="vprice" type="number" min="0" value="${v.price ?? ""}"></td><td><input name="vcompare" type="number" min="0" value="${v.compare_price ?? ""}"></td>
    <td><input name="vsku" value="${esc(v.sku || "")}"></td><td><input name="vstock" type="number" value="${v.stock ?? 0}"></td><td><button type="button" class="btn btn--sm btn--line" data-vdel>✕</button></td></tr>`;

  view().innerHTML = header(isNew ? "Add product" : esc(p.title), isNew ? "" : `<a href="/p/${esc(p.slug)}" target="_blank">View in store ↗</a>`,
    `<a class="btn btn--line" href="#/products">← Products</a>${isNew ? "" : '<button class="btn btn--red" id="del">Delete</button>'}<button class="btn btn--y" form="pf">Save product</button>`) + `
  <form id="pf" class="grid2">
    <div class="stack">
      <div class="card form">
        <label class="full">Product name<input name="title" required value="${esc(p.title)}"></label>
        <label>Urdu name <small>(optional)</small><input name="title_ur" dir="rtl" value="${esc(p.title_ur)}" style="font-family:'Noto Nastaliq Urdu',serif"></label>
        <label>Brand <small>(optional)</small><input name="brand" value="${esc(p.brand)}"></label>
        <label class="full">Description<textarea name="description" rows="5">${esc(p.description)}</textarea></label>
      </div>
      <div class="card">
        <h2>Pricing &amp; stock</h2>
        <div class="form">
          <label>Price (Rs)<input name="price" type="number" min="0" value="${p.price}"></label>
          <label>Compare-at price <small>(shows as sale)</small><input name="compare_price" type="number" min="0" value="${p.compare_price ?? ""}"></label>
          <label>SKU<input name="sku" value="${esc(p.sku)}"></label>
          <label>Stock<input name="stock" type="number" value="${p.stock}"></label>
          <label>Sold per <small>(piece, metre, coil…)</small><input name="unit" value="${esc(p.unit)}"></label>
        </div>
      </div>
      <div class="card">
        <h2>Variants <small class="muted" style="text-transform:none;font-weight:400">— sizes, ratings or types with their own price and stock</small></h2>
        <table class="vtable"><thead><tr><th>Option</th><th>Price</th><th>Compare</th><th>SKU</th><th>Stock</th><th></th></tr></thead><tbody id="vb">${(p.variants || []).map(vrow).join("")}</tbody></table>
        <p><button type="button" class="btn btn--sm btn--line" id="vadd">+ Add variant</button></p>
        <p class="muted" style="font-size:.85rem;margin:0">With variants, the product price and stock above are worked out from the variants automatically.</p>
      </div>
    </div>
    <div class="stack">
      <div class="card stack">
        <label>Status<select name="status"><option value="active"${p.status === "active" ? " selected" : ""}>Active — visible in store</option><option value="draft"${p.status === "draft" ? " selected" : ""}>Draft — hidden</option></select></label>
        <label class="check"><input type="checkbox" name="featured"${p.featured ? " checked" : ""}> Feature on home page</label>
        <label>Category<select name="category_id">${CATS.map((c) => `<option value="${c.id}"${c.id === p.category_id ? " selected" : ""}>${esc(c.name)}</option>`).join("")}</select></label>
      </div>
      <div class="card stack">
        <h2>Photo</h2>
        <div class="img-edit"><div class="thumb" id="imgp"></div><div class="stack" style="gap:8px">
          <label class="btn btn--sm btn--line" style="display:inline-flex">Upload photo<input type="file" accept="image/png,image/jpeg,image/webp" id="imgf" hidden></label>
          <button type="button" class="btn btn--sm btn--line" id="imgx">Remove photo</button></div></div>
        <label>Drawing used when there's no photo<select name="icon">${Object.keys(META.icons).map((k) => `<option${k === p.icon ? " selected" : ""}>${k}</option>`).join("")}</select></label>
        <p class="muted" style="font-size:.85rem;margin:0">Square photos on a plain background look best. Max 4 MB.</p>
      </div>
      <p class="err" id="perr" hidden></p>
    </div>
  </form>`;

  let image = p.image;
  const drawImg = () => { $("#imgp").outerHTML = `<div class="thumb" id="imgp">${image ? `<img src="${esc(image)}" alt="">` : `<svg viewBox="0 0 32 32">${META.icons[$("[name=icon]").value] || ""}</svg>`}</div>`; $("#imgx").hidden = !image; };
  drawImg();
  $("[name=icon]").onchange = drawImg;
  $("#imgx").onclick = () => { image = null; drawImg(); };
  $("#imgf").onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    if (f.size > 4_000_000) return toast("Photo is larger than 4 MB", true);
    const data = await new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(f); });
    try { image = (await api("/upload", "POST", { data })).url; drawImg(); toast("Photo uploaded — remember to save"); } catch (ex) { toast(ex.message, true); }
  };
  $("#vadd").onclick = () => $("#vb").insertAdjacentHTML("beforeend", vrow());
  $("#vb").onclick = (e) => { if (e.target.matches("[data-vdel]")) e.target.closest("tr").remove(); };
  $("#del") && ($("#del").onclick = async () => {
    if (!confirm(`Delete "${p.title}"? This can't be undone. Past orders keep their item names.`)) return;
    await api("/products/" + id, "DELETE"); toast("Product deleted"); location.hash = "#/products";
  });
  $("#pf").onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target, fd = new FormData(f);
    const body = Object.fromEntries(fd);
    body.featured = f.featured.checked; body.image = image;
    body.variants = $$("#vb tr").map((tr) => ({ id: $("[name=vid]", tr).value, name: $("[name=vname]", tr).value, price: $("[name=vprice]", tr).value, compare_price: $("[name=vcompare]", tr).value, sku: $("[name=vsku]", tr).value, stock: $("[name=vstock]", tr).value }));
    try {
      const r = isNew ? await api("/products", "POST", body) : await api("/products/" + id, "PUT", body);
      toast("Saved");
      if (isNew) location.hash = "#/products/" + r.id; else productEdit(id);
    } catch (ex) { const er = $("#perr"); er.textContent = ex.message; er.hidden = false; }
  };
}

/* ================================================================ inventory */
async function inventory() {
  const rows = await api("/inventory");
  view().innerHTML = header("Inventory", "Type the new count and press Enter or click away — it saves straight away.") + `
  <div class="row" style="margin-bottom:12px"><input class="search" id="iq" placeholder="Search item or SKU"><label class="check"><input type="checkbox" id="il"> Low stock only</label></div>
  <div class="tbl"><table><thead><tr><th>Item</th><th>SKU</th><th class="num">In stock</th></tr></thead><tbody id="ib"></tbody></table></div>`;
  const draw = () => {
    const q = $("#iq").value.toLowerCase(), low = $("#il").checked;
    $("#ib").innerHTML = rows.filter((r) => (!q || (r.title + r.vname + r.sku).toLowerCase().includes(q)) && (!low || r.stock <= 5)).map((r, i) => `<tr>
      <td><b>${esc(r.title)}</b>${r.vname ? ` <span class="muted">· ${esc(r.vname)}</span>` : ""}</td><td class="mono">${esc(r.sku)}</td>
      <td class="num"><input class="stockin ${r.stock <= 0 ? "low" : ""}" type="number" value="${r.stock}" data-i="${rows.indexOf(r)}"></td></tr>`).join("");
  };
  $("#iq").oninput = draw; $("#il").onchange = draw;
  $("#ib").addEventListener("change", async (e) => {
    const r = rows[+e.target.dataset.i]; if (!r) return;
    const stock = parseInt(e.target.value, 10) || 0;
    try { await api("/stock", "POST", { productId: r.product_id, variantId: r.variant_id, stock }); r.stock = stock; e.target.classList.toggle("low", stock <= 0); toast(`${r.title}${r.vname ? " · " + r.vname : ""}: ${stock} in stock`); }
    catch (ex) { toast(ex.message, true); }
  });
  draw();
}

/* ================================================================ categories */
async function categories() {
  const cats = await api("/categories");
  CATS = cats;
  const TR = { E: "Electric", S: "Sanitary", H: "Hardware" };
  const form = (c = {}) => `<form class="card form" data-cat="${c.id || ""}">
    <label>Name<input name="name" required value="${esc(c.name || "")}"></label>
    <label>Urdu name<input name="name_ur" dir="rtl" value="${esc(c.name_ur || "")}"></label>
    <label>Department<select name="trade">${Object.entries(TR).map(([k, v]) => `<option value="${k}"${c.trade === k ? " selected" : ""}>${v}</option>`).join("")}</select></label>
    <label>Drawing<select name="icon">${Object.keys(META.icons).map((k) => `<option${k === c.icon ? " selected" : ""}>${k}</option>`).join("")}</select></label>
    <label>Order on menu<input name="sort" type="number" value="${c.sort ?? cats.length}"></label>
    <div class="row" style="align-items:end">${c.id ? `<button class="btn btn--sm">Save</button><button type="button" class="btn btn--sm btn--red" data-delcat="${c.id}">Delete</button><small class="muted">${c.n} products</small>` : '<button class="btn btn--sm btn--y">Add category</button>'}</div>
  </form>`;
  view().innerHTML = header("Categories", "These appear in the store menu, grouped into Electric, Sanitary and Hardware.") + `<div class="stack">${form()}${cats.map(form).join("")}</div>`;
  $$("[data-cat]").forEach((f) => (f.onsubmit = async (e) => {
    e.preventDefault();
    const id = f.dataset.cat;
    try { await api(id ? "/categories/" + id : "/categories", id ? "PUT" : "POST", Object.fromEntries(new FormData(f))); toast("Saved"); categories(); } catch (ex) { toast(ex.message, true); }
  }));
  $$("[data-delcat]").forEach((b) => (b.onclick = async () => {
    if (!confirm("Delete this category? Its products stay but won't have a category.")) return;
    await api("/categories/" + b.dataset.delcat, "DELETE"); toast("Deleted"); categories();
  }));
}

/* ================================================================ customers */
async function customers() {
  const list = await api("/customers");
  view().innerHTML = header("Customers", `${list.length} people have ordered or signed up`) + `
  <div class="row" style="margin-bottom:12px"><input class="search" id="cq" placeholder="Search name, phone, city"></div>
  <div class="tbl"><table><thead><tr><th>Name</th><th>Mobile</th><th>City</th><th>Account</th><th class="num">Orders</th><th class="num">Spent</th><th></th></tr></thead><tbody id="cb"></tbody></table></div>`;
  const draw = () => {
    const q = $("#cq").value.toLowerCase();
    const rows = list.filter((c) => !q || `${c.name} ${c.phone} ${c.city}`.toLowerCase().includes(q));
    $("#cb").innerHTML = rows.length ? rows.map((c) => `<tr><td><b>${esc(c.name)}</b></td><td class="mono">${esc(c.phone)}</td><td>${esc(c.city || "")}</td><td>${c.has_account ? badge("active", "Account") : '<span class="muted">Guest</span>'}</td>
      <td class="num">${c.orders}</td><td class="num">${money(c.spent)}</td><td><a class="btn btn--sm btn--line" href="#/orders?q=${encodeURIComponent(c.phone)}">Orders</a> <a class="btn btn--sm btn--wa" href="${waLink(c.phone, "Assalam o Alaikum " + c.name.split(" ")[0] + ", ")}" target="_blank" rel="noopener">WhatsApp</a></td></tr>`).join("")
      : `<tr><td colspan="7" class="empty">No customers yet.</td></tr>`;
  };
  $("#cq").oninput = draw; draw();
}

/* ================================================================ discounts */
async function discounts() {
  const list = await api("/discounts");
  const TYPES = { percent: "% off", fixed: "Rs off", free_shipping: "Free delivery" };
  const form = (d = { active: 1, type: "percent" }) => `<form class="card form" data-disc="${d.id || ""}" style="grid-template-columns:repeat(4,1fr)">
    <label>Code<input name="code" required value="${esc(d.code || "")}" style="text-transform:uppercase"></label>
    <label>Type<select name="type">${Object.entries(TYPES).map(([k, v]) => `<option value="${k}"${d.type === k ? " selected" : ""}>${v}</option>`).join("")}</select></label>
    <label>Value<input name="value" type="number" min="0" value="${d.value ?? ""}"></label>
    <label>Min order (Rs)<input name="min_subtotal" type="number" min="0" value="${d.min_subtotal ?? 0}"></label>
    <label>Ends on <small>(optional)</small><input name="ends_at" type="date" value="${esc(d.ends_at || "")}"></label>
    <label>Max uses <small>(optional)</small><input name="usage_limit" type="number" min="0" value="${d.usage_limit ?? ""}"></label>
    <label class="check" style="align-self:end"><input type="checkbox" name="active"${d.active ? " checked" : ""}> Active</label>
    <div class="row" style="align-items:end">${d.id ? `<button class="btn btn--sm">Save</button><button type="button" class="btn btn--sm btn--red" data-deldisc="${d.id}">Delete</button><small class="muted">Used ${d.used}×</small>` : '<button class="btn btn--sm btn--y">Create code</button>'}</div>
  </form>`;
  view().innerHTML = header("Discounts", "Codes customers type at checkout. Share them on WhatsApp, Facebook or printed bills.") + `<div class="stack">${form()}${list.map(form).join("")}</div>`;
  $$("[data-disc]").forEach((f) => (f.onsubmit = async (e) => {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(f)); body.active = f.active.checked;
    try { await api(f.dataset.disc ? "/discounts/" + f.dataset.disc : "/discounts", f.dataset.disc ? "PUT" : "POST", body); toast("Saved"); discounts(); } catch (ex) { toast(ex.message, true); }
  }));
  $$("[data-deldisc]").forEach((b) => (b.onclick = async () => { if (!confirm("Delete this code?")) return; await api("/discounts/" + b.dataset.deldisc, "DELETE"); discounts(); }));
}

/* ================================================================ reviews */
async function reviews() {
  const list = await api("/reviews");
  BADGES.reviews = list.filter((r) => !r.approved).length; setBadges();
  view().innerHTML = header("Reviews", "New reviews stay hidden until you approve them.") + `
  <div class="tbl"><table><thead><tr><th>Product</th><th>Review</th><th>Status</th><th></th></tr></thead><tbody>
  ${list.length ? list.map((r) => `<tr><td><a href="/p/${esc(r.slug)}" target="_blank">${esc(r.product)}</a></td><td><b>${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)}</b> ${esc(r.name)}<br><span class="muted">${esc(r.body)}</span></td>
    <td>${r.approved ? badge("active", "Live") : badge("pending", "Waiting")}</td>
    <td class="num"><button class="btn btn--sm ${r.approved ? "btn--line" : "btn--y"}" data-rv="${r.id}" data-a="${r.approved ? 0 : 1}">${r.approved ? "Hide" : "Approve"}</button> <button class="btn btn--sm btn--red" data-rd="${r.id}">Delete</button></td></tr>`).join("")
    : `<tr><td colspan="4" class="empty">No reviews yet. Customers can leave one on any product page.</td></tr>`}
  </tbody></table></div>`;
  $$("[data-rv]").forEach((b) => (b.onclick = async () => { await api("/reviews/" + b.dataset.rv, "PATCH", { approved: b.dataset.a === "1" }); reviews(); }));
  $$("[data-rd]").forEach((b) => (b.onclick = async () => { if (!confirm("Delete this review?")) return; await api("/reviews/" + b.dataset.rd, "DELETE"); reviews(); }));
}

/* ================================================================ settings */
async function settingsView() {
  const s = await api("/settings");
  const t = (k, label, help = "") => `<label>${label}${help ? ` <small>${help}</small>` : ""}<input name="${k}" value="${esc(s[k])}"></label>`;
  const c = (k, label) => `<label class="check"><input type="checkbox" name="${k}"${s[k] === "1" ? " checked" : ""}> ${label}</label>`;
  view().innerHTML = header("Settings") + `
  <form id="sf" class="grid2">
    <div class="stack">
      <div class="card form"><h2 class="full">Store</h2>
        ${t("store_name", "Store name")}${t("phone", "Phone")}${t("whatsapp", "WhatsApp number", "(international, no +, e.g. 923446504445)")}${t("address", "Address")}
        <label class="full">Top bar message<input name="announcement" value="${esc(s.announcement)}"></label></div>
      <div class="card form"><h2 class="full">Delivery</h2>
        ${t("local_city", "Home city")}${t("shipping_local", "Delivery in home city (Rs)")}${t("shipping_outside", "Delivery to other cities (Rs)")}${t("free_shipping_over", "Free delivery over (Rs)", "(0 = never)")}
        ${c("allow_pickup", "Allow pickup from the shop")}${t("low_stock_at", "Low-stock warning at")}</div>
    </div>
    <div class="stack">
      <div class="card stack"><h2>Payment methods</h2>
        ${c("pay_cod", "Cash on delivery")}${c("pay_bank", "Bank transfer")}${c("pay_jazzcash", "JazzCash")}${c("pay_easypaisa", "Easypaisa")}
        <label>Bank details shown at checkout<textarea name="bank_details" rows="4">${esc(s.bank_details)}</textarea></label>
        ${t("wallet_number", "JazzCash / Easypaisa number")}</div>
      <button class="btn btn--y">Save settings</button>
    </div>
  </form>
  <form id="pw" class="card form" style="margin-top:16px;max-width:640px"><h2 class="full">Change admin password</h2>
    <label>Current password<input name="current" type="password" required autocomplete="current-password"></label>
    <label>New password <small>(8+ characters)</small><input name="next" type="password" minlength="8" required autocomplete="new-password"></label>
    <div><button class="btn btn--sm">Change password</button></div></form>`;
  $("#sf").onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target, body = Object.fromEntries(new FormData(f));
    for (const k of ["allow_pickup", "pay_cod", "pay_bank", "pay_jazzcash", "pay_easypaisa"]) body[k] = f[k].checked ? "1" : "0";
    try { await api("/settings", "PUT", body); toast("Settings saved"); } catch (ex) { toast(ex.message, true); }
  };
  $("#pw").onsubmit = async (e) => {
    e.preventDefault();
    try { await api("/password", "POST", Object.fromEntries(new FormData(e.target))); e.target.reset(); toast("Password changed"); } catch (ex) { toast(ex.message, true); }
  };
}

boot();
