(() => {
  "use strict";
  const S = window.STORE || { cur: "Rs", icons: {} };
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const money = (n) => `${S.cur} ${Math.round(n || 0).toLocaleString("en-PK")}`;
  const KEY = "ms_cart_v1";

  /* ---------------- storage ---------------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
  };
  const getCart = () => store.get(KEY, []).filter((x) => x && x.productId);
  const setCart = (c) => { store.set(KEY, c); updateCount(); };
  const getCode = () => { try { return sessionStorage.getItem("ms_code") || ""; } catch { return ""; } };
  const setCode = (c) => { try { sessionStorage.setItem("ms_code", c); } catch {} };

  function updateCount() {
    const n = getCart().reduce((a, x) => a + x.qty, 0);
    $$("[data-cart-count]").forEach((el) => (el.textContent = n));
  }

  function addToCart(item) {
    const cart = getCart();
    const hit = cart.find((x) => x.productId === item.productId && (x.variantId || null) === (item.variantId || null));
    if (hit) hit.qty = Math.min(999, hit.qty + item.qty);
    else cart.push({ productId: item.productId, variantId: item.variantId || null, qty: item.qty });
    setCart(cart);
    const btn = $(".cartbtn");
    if (btn) { btn.classList.remove("bump"); void btn.offsetWidth; btn.classList.add("bump"); }
  }

  async function api(url, body) {
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body || {}), credentials: "same-origin" });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || "Something went wrong.");
    return data;
  }

  const quote = (extra = {}) => api("/api/cart/quote", { items: getCart(), code: getCode(), ...extra });

  /** Drop lines the server no longer recognises (deleted / hidden products) */
  function syncCart(q) {
    const keep = new Set(q.lines.map((l) => `${l.productId}:${l.variantId || ""}`));
    const c = getCart();
    const next = c.filter((x) => keep.has(`${x.productId}:${x.variantId || ""}`));
    if (next.length !== c.length) setCart(next);
  }

  function toast(html, ms = 2600) {
    const t = $(".toast");
    if (!t) return;
    t.innerHTML = html; t.hidden = false;
    clearTimeout(t._h); t._h = setTimeout(() => (t.hidden = true), ms);
  }

  const thumb = (l) => l.image
    ? `<div class="thumb"><img src="${esc(l.image)}" alt=""></div>`
    : `<div class="thumb thumb--draw t-${esc(l.trade || "")}"><svg class="thumb__ico" viewBox="0 0 32 32">${S.icons[l.icon] || S.icons.box || ""}</svg></div>`;

  function linesHTML(q) {
    return q.lines.map((l, i) => `
      <div class="cline" data-i="${i}">
        <a href="/p/${esc(l.slug)}">${thumb(l)}</a>
        <div>
          <a class="cline__t" href="/p/${esc(l.slug)}">${esc(l.title)}</a>
          <div class="cline__v">${l.variant ? esc(l.variant) + " · " : ""}${money(l.price)} / ${esc(l.unit)}</div>
          ${l.error ? `<div class="cline__err">${esc(l.error)}</div>` : ""}
          <div class="cline__row">
            <div class="qty qty--sm"><button type="button" data-cq="-1" aria-label="Less">−</button><input type="number" min="1" max="999" value="${l.qty}" data-cqty aria-label="Quantity"><button type="button" data-cq="1" aria-label="More">+</button></div>
            <button type="button" class="cline__rm" data-crm>Remove</button>
          </div>
        </div>
        <div class="cline__p">${money(l.lineTotal)}</div>
      </div>`).join("");
  }

  function shipHint(q) {
    if (!S.freeOver || !q.lines.length) return "";
    const left = S.freeOver - (q.subtotal - q.discount);
    const pct = Math.min(100, Math.round(((q.subtotal - q.discount) / S.freeOver) * 100));
    return left > 0
      ? `<p class="hint">Add ${money(left)} more for free delivery<span class="ship-bar"><i style="width:${pct}%"></i></span></p>`
      : `<p class="hint">You've got free delivery ✓</p>`;
  }

  function totalsHTML(q, { final = false } = {}) {
    return `<dl class="totals">
      <div><dt>Subtotal (${q.count} item${q.count === 1 ? "" : "s"})</dt><dd>${money(q.subtotal)}</dd></div>
      ${q.discount ? `<div class="save"><dt>Discount ${esc(q.discountCode)}</dt><dd>− ${money(q.discount)}</dd></div>` : ""}
      <div><dt>Delivery</dt><dd>${final ? (q.shipping ? money(q.shipping) : "Free") : q.shipping ? money(q.shipping) + (q.isLocal ? " (Lahore)" : "") : "Free"}</dd></div>
      <div class="grand"><dt>Total</dt><dd>${money(q.total)}</dd></div>
    </dl>`;
  }

  function bindLines(root, rerender) {
    root.addEventListener("click", (e) => {
      const line = e.target.closest(".cline");
      if (!line) return;
      const i = +line.dataset.i;
      const cart = getCart();
      const q = root._q;
      if (!q || !q.lines[i]) return;
      const l = q.lines[i];
      const idx = cart.findIndex((x) => x.productId === l.productId && (x.variantId || null) === (l.variantId || null));
      if (idx < 0) return;
      if (e.target.matches("[data-crm]")) { cart.splice(idx, 1); setCart(cart); rerender(); }
      if (e.target.matches("[data-cq]")) { cart[idx].qty = Math.max(1, Math.min(999, cart[idx].qty + +e.target.dataset.cq)); setCart(cart); rerender(); }
    });
    root.addEventListener("change", (e) => {
      if (!e.target.matches("[data-cqty]")) return;
      const i = +e.target.closest(".cline").dataset.i;
      const l = root._q.lines[i];
      const cart = getCart();
      const it = cart.find((x) => x.productId === l.productId && (x.variantId || null) === (l.variantId || null));
      if (it) { it.qty = Math.max(1, Math.min(999, parseInt(e.target.value, 10) || 1)); setCart(cart); rerender(); }
    });
  }

  const emptyHTML = `<div class="cart-empty"><svg class="ico" viewBox="0 0 24 24"><path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6.2"/></svg><p><b>Your cart is empty.</b></p><p class="muted">Find what you need, or send your list on WhatsApp.</p><a class="btn" href="/shop">Browse products</a></div>`;

  /* ---------------- drawer ---------------- */
  const drawer = $("#cart-drawer");
  let lastFocus = null;
  async function renderDrawer() {
    const body = $("[data-cart-lines]", drawer), foot = $("[data-cart-foot]", drawer);
    if (!getCart().length) { body.innerHTML = emptyHTML; foot.innerHTML = ""; return; }
    try {
      const q = await quote();
      syncCart(q);
      body._q = q;
      if (!q.lines.length) { body.innerHTML = emptyHTML; foot.innerHTML = ""; return; }
      body.innerHTML = linesHTML(q);
      foot.innerHTML = `${totalsHTML(q)}${shipHint(q)}<a class="btn btn--block btn--big" href="/checkout">Checkout · ${money(q.total)}</a><a class="btn btn--line btn--block btn--sm" href="/cart">View cart</a>`;
    } catch (e) { body.innerHTML = `<p class="co__err">${esc(e.message)}</p>`; }
  }
  function openDrawer() {
    if (!drawer) return;
    lastFocus = document.activeElement;
    drawer.hidden = false;
    document.body.style.overflow = "hidden";
    renderDrawer();
    setTimeout(() => $(".x", drawer)?.focus(), 30);
  }
  function closeDrawer() {
    if (!drawer || drawer.hidden) return;
    drawer.hidden = true;
    document.body.style.overflow = "";
    lastFocus?.focus?.();
  }
  if (drawer) bindLines($("[data-cart-lines]", drawer), renderDrawer);
  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-open-cart]")) openDrawer();
    if (e.target.closest("[data-close-cart]")) closeDrawer();
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeDrawer(); });

  /* ---------------- quick add on cards ---------------- */
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-add]");
    if (!b) return;
    const d = JSON.parse(b.dataset.add);
    addToCart({ productId: d.productId, qty: d.qty || 1 });
    openDrawer();
  });

  /* ---------------- product page ---------------- */
  const pdp = $("[data-product]");
  if (pdp) {
    const P = JSON.parse(pdp.dataset.product);
    const qtyEl = $("[data-qty]", pdp);
    const current = () => {
      const r = $('input[name="variant"]:checked', pdp);
      return r ? P.variants.find((v) => v.id === +r.value) : null;
    };
    const stockHTML = (n) => n <= 0 ? '<span class="dot dot--out"></span> Out of stock — ask us on WhatsApp'
      : n <= S.low ? `<span class="dot dot--low"></span> Only ${n} left` : '<span class="dot"></span> In stock, ready at the counter';
    function refresh() {
      const v = current();
      const price = v ? v.price : P.price, stock = v ? v.stock : P.stock, compare = v ? v.compare : null;
      $("[data-price]", pdp).textContent = money(price);
      $("[data-compare]", pdp).textContent = compare && compare > price ? money(compare) : "";
      $("[data-stock]", pdp).innerHTML = stockHTML(stock);
      $$("[data-add-pdp], [data-buy-now]", pdp).forEach((b) => (b.disabled = stock <= 0));
      qtyEl.max = Math.max(1, stock);
    }
    pdp.addEventListener("change", (e) => { if (e.target.name === "variant") refresh(); });
    pdp.addEventListener("click", (e) => {
      const st = e.target.closest("[data-step]");
      if (st) qtyEl.value = Math.max(1, Math.min(+qtyEl.max || 999, (parseInt(qtyEl.value, 10) || 1) + +st.dataset.step));
      const add = e.target.closest("[data-add-pdp], [data-buy-now]");
      if (add) {
        const v = current();
        addToCart({ productId: P.id, variantId: v ? v.id : null, qty: Math.max(1, parseInt(qtyEl.value, 10) || 1) });
        if (add.matches("[data-buy-now]")) location.href = "/checkout";
        else openDrawer();
      }
    });
    refresh();
  }

  /* ---------------- cart page ---------------- */
  const cartPage = $("[data-cart-page]");
  if (cartPage) {
    const render = async () => {
      if (!getCart().length) { cartPage.innerHTML = emptyHTML; cartPage.style.display = "block"; return; }
      try {
        const q = await quote();
        syncCart(q);
        if (!q.lines.length) { cartPage.innerHTML = emptyHTML; cartPage.style.display = "block"; return; }
        cartPage.style.display = "";
        cartPage.innerHTML = `<div class="co__box" data-lines>${linesHTML(q)}</div>
          <aside class="co__box">${totalsHTML(q)}${shipHint(q)}
            <div class="co__code" style="margin-top:14px"><input placeholder="Discount code" value="${esc(getCode())}" aria-label="Discount code" data-code><button class="btn btn--sm btn--line" type="button" data-apply>Apply</button></div>
            ${q.discountError ? `<p class="co__err">${esc(q.discountError)}</p>` : ""}
            <a class="btn btn--block btn--big" href="/checkout">Checkout</a>
            <p class="muted small center">Delivery cost is confirmed at checkout. Pickup from the shop is free.</p></aside>`;
        $("[data-lines]", cartPage)._q = q;
        bindLines($("[data-lines]", cartPage), render);
        $("[data-apply]", cartPage).onclick = () => { setCode($("[data-code]", cartPage).value.trim()); render(); };
      } catch (e) { cartPage.innerHTML = `<p class="co__err">${esc(e.message)}</p>`; }
    };
    render();
  }

  /* ---------------- checkout ---------------- */
  const co = $("#checkout");
  if (co) {
    const sum = $("[data-summary]", co), err = $(".co__err", co), place = $("[data-place]", co);
    const codeIn = co.elements.code;
    codeIn.value = getCode();
    let last = null, timer;

    const fields = () => ({
      delivery: co.elements.delivery.value || "delivery",
      city: co.elements.city.value.trim(),
      code: codeIn.value.trim()
    });

    function toggle() {
      const pickup = fields().delivery === "pickup";
      $("[data-address]", co).hidden = pickup;
      const counter = $("[data-counter]", co);
      counter.hidden = !pickup;
      if (!pickup && counter.querySelector("input").checked) co.querySelector('input[name="payment"]').checked = true;
      const pay = co.elements.payment.value;
      $("[data-ref]", co).hidden = !["bank", "jazzcash", "easypaisa"].includes(pay);
    }

    async function refresh() {
      if (!getCart().length) { sum.innerHTML = emptyHTML; place.disabled = true; return; }
      try {
        const f = fields();
        const q = await quote({ code: f.code, city: f.city, delivery: f.delivery });
        syncCart(q);
        last = q;
        if (!q.lines.length) { sum.innerHTML = emptyHTML; place.disabled = true; return; }
        sum.innerHTML = `<h2>Order summary</h2>
          <table class="lines">${q.lines.map((l) => `<tr><td>${esc(l.title)}${l.variant ? `<small>${esc(l.variant)}</small>` : ""}${l.error ? `<small style="color:var(--red)">${esc(l.error)}</small>` : ""}</td><td>× ${l.qty}</td><td>${money(l.lineTotal)}</td></tr>`).join("")}</table>
          ${totalsHTML(q, { final: true })}
          ${q.discountError ? `<p class="co__err" style="margin-top:10px">${esc(q.discountError)}</p>` : ""}
          ${f.delivery !== "pickup" ? shipHint(q) : ""}`;
        place.disabled = q.lines.some((l) => l.error);
        place.textContent = `Place order · ${money(q.total)}`;
      } catch (e) { sum.innerHTML = `<p class="co__err">${esc(e.message)}</p>`; }
    }

    co.addEventListener("change", (e) => {
      toggle();
      if (["delivery", "city"].includes(e.target.name)) refresh();
    });
    co.elements.city.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(refresh, 450); });
    $("[data-apply-code]", co).addEventListener("click", () => { setCode(codeIn.value.trim()); refresh(); });

    co.addEventListener("submit", async (e) => {
      e.preventDefault();
      err.hidden = true;
      const fd = Object.fromEntries(new FormData(co));
      place.disabled = true;
      const label = place.textContent;
      place.textContent = "Placing order…";
      try {
        const r = await api("/api/checkout", { ...fd, items: getCart(), code: codeIn.value.trim() });
        setCart([]); setCode("");
        location.href = r.url;
      } catch (ex) {
        err.textContent = ex.message; err.hidden = false;
        place.disabled = false; place.textContent = label;
        err.scrollIntoView({ block: "center", behavior: "smooth" });
        refresh();
      }
    });
    toggle();
    refresh();
  }

  /* ---------------- live search ---------------- */
  const sf = $(".search");
  if (sf) {
    const input = $("input", sf), pop = $(".search__pop", sf);
    let t, active = -1, ctl;
    const close = () => { pop.hidden = true; active = -1; };
    input.addEventListener("input", () => {
      clearTimeout(t);
      const q = input.value.trim();
      if (q.length < 2) return close();
      t = setTimeout(async () => {
        ctl?.abort(); ctl = new AbortController();
        try {
          const r = await fetch("/api/search?q=" + encodeURIComponent(q), { signal: ctl.signal });
          const items = await r.json();
          if (!items.length) { pop.innerHTML = `<a href="/shop?q=${encodeURIComponent(q)}"><span>No quick match — search all for “${esc(q)}”</span></a>`; pop.hidden = false; return; }
          pop.innerHTML = items.map((x) => `<a href="/p/${esc(x.slug)}">${x.image ? `<img src="${esc(x.image)}" alt="">` : `<span class="sico t-${esc(x.trade || "")}"><svg class="ico" viewBox="0 0 32 32">${S.icons[x.icon] || ""}</svg></span>`}<span>${esc(x.title)}</span><em>${x.from ? "from " : ""}${money(x.price)}</em></a>`).join("")
            + `<a href="/shop?q=${encodeURIComponent(q)}"><span>See all results →</span></a>`;
          pop.hidden = false; active = -1;
        } catch {}
      }, 180);
    });
    input.addEventListener("keydown", (e) => {
      const links = $$("a", pop);
      if (pop.hidden || !links.length) return;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        active = (active + (e.key === "ArrowDown" ? 1 : -1) + links.length) % links.length;
        links.forEach((a, i) => a.classList.toggle("on", i === active));
      } else if (e.key === "Enter" && active >= 0) { e.preventDefault(); location.href = links[active].href; }
      else if (e.key === "Escape") close();
    });
    document.addEventListener("click", (e) => { if (!sf.contains(e.target)) close(); });
  }

  /* ---------------- misc ---------------- */
  if (matchMedia("(max-width: 860px)").matches) $$("details.filters").forEach((d) => (d.open = false));
  $$("[data-autosubmit]").forEach((el) => el.addEventListener("change", () => el.form.submit()));

  $$("[data-review]").forEach((f) => f.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = $("button", f);
    btn.disabled = true;
    try {
      await api("/api/reviews", { productId: +f.dataset.review, ...Object.fromEntries(new FormData(f)) });
      f.innerHTML = "<h3>Thank you!</h3><p>Your review will appear once the shop approves it.</p>";
    } catch (ex) { toast(esc(ex.message)); btn.disabled = false; }
  }));

  $$("[data-auth]").forEach((f) => f.addEventListener("submit", async (e) => {
    e.preventDefault();
    const er = $(".co__err", f);
    er.hidden = true;
    try { await api("/api/account/" + f.dataset.auth, Object.fromEntries(new FormData(f))); location.reload(); }
    catch (ex) { er.textContent = ex.message; er.hidden = false; }
  }));
  $$("[data-logout]").forEach((b) => b.addEventListener("click", async () => { await api("/api/account/logout"); location.href = "/"; }));

  updateCount();
  window.addEventListener("storage", (e) => { if (e.key === KEY) updateCount(); });
})();
