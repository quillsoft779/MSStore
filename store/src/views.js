import { esc, money } from "./util.js";
import { icon, MARK, ICONS } from "./icons.js";
import { STATUS_LABEL, PAYMENT_LABEL } from "./commerce.js";

const TRADES = { E: "Electric", S: "Sanitary", H: "Hardware" };
const V = Date.now().toString(36); // cache-buster, changes on every restart/deploy
const TRADE_UR = { E: "بجلی", S: "سینیٹری", H: "ہارڈویئر" };

/* ------------------------------------------------------------------ layout */
export function layout({ title, description = "", body, ctx, canonical = "", noindex = false, jsonld = null }) {
  const { s, cats, user } = ctx;
  const nav = cats.map((c) => `<a class="t-${c.trade}" href="/shop?c=${esc(c.slug)}">${icon(c.icon)}<span>${esc(c.name)}</span></a>`).join("");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description || "Buy electric, hardware and sanitary items online from Malik Shahzad, Raiwind Road, Lahore. Cash on delivery, open 24 hours.")}">
${canonical ? `<link rel="canonical" href="${esc(canonical)}">` : ""}
${noindex ? '<meta name="robots" content="noindex">' : ""}
<meta name="theme-color" content="#16150f">
<link rel="icon" href="/static/logo-mark.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..900&family=IBM+Plex+Mono:wght@400;500&family=Noto+Nastaliq+Urdu:wght@400;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/static/store.css?v=${V}">
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld).replace(/</g, "\\u003c")}</script>` : ""}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<div class="announce">${esc(s.announcement)}</div>
<header class="top">
  <div class="wrap top__row">
    <a class="logo" href="/" aria-label="Malik Shahzad online store — home">${MARK}<span><b>Malik Shahzad</b><small>Online store</small></span></a>
    <form class="search" action="/shop" role="search">
      <label class="sr" for="q">Search products</label>
      <input id="q" name="q" type="search" placeholder="Search wire, taps, MCB, PPR…" autocomplete="off" value="${esc(ctx.q || "")}">
      <button aria-label="Search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg></button>
      <div class="search__pop" hidden></div>
    </form>
    <nav class="top__links">
      <a href="/track">Track order</a>
      <a href="/account">${user ? esc(user.name.split(" ")[0]) : "Account"}</a>
      <button class="cartbtn" type="button" data-open-cart aria-label="Open cart">
        <svg viewBox="0 0 24 24"><path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6.2"/><circle cx="10" cy="20.5" r="1.3"/><circle cx="17" cy="20.5" r="1.3"/></svg>
        <span>Cart</span><b data-cart-count>0</b>
      </button>
    </nav>
  </div>
  <nav class="cats" aria-label="Categories"><div class="wrap cats__row">${nav}</div></nav>
</header>

<main id="main">${body}</main>

<footer class="foot">
  <div class="wrap foot__grid">
    <div>
      <a class="logo logo--light" href="/">${MARK}<span><b>Malik Shahzad</b><small>Electric · Hardware · Sanitary</small></span></a>
      <p class="foot__ur" lang="ur" dir="rtl">ملک شہزاد الیکٹرک ہارڈویئر اینڈ سینیٹری اسٹور</p>
      <p>${esc(s.address)}<br>Counter open 24 hours, 7 days</p>
    </div>
    <div><h4>Shop</h4>${Object.entries(TRADES).map(([k, v]) => `<a href="/shop?t=${k}">${v}</a>`).join("")}<a href="/shop?sale=1">On offer</a></div>
    <div><h4>Help</h4><a href="/track">Track your order</a><a href="/account">My account</a><a href="/help">Delivery, payment &amp; returns</a><a href="https://wa.me/${esc(s.whatsapp)}" target="_blank" rel="noopener">WhatsApp us</a></div>
    <div><h4>Pay with</h4><p class="pays"><span>Cash on delivery</span><span>Bank transfer</span><span>JazzCash</span><span>Easypaisa</span></p><p><a href="tel:${esc(s.phone.replace(/\s/g, ""))}">${esc(s.phone)}</a></p></div>
  </div>
  <div class="wrap foot__base">© ${new Date().getFullYear()} Malik Shahzad. Prices in Pakistani rupees.</div>
</footer>

<aside class="drawer" id="cart-drawer" aria-label="Cart" hidden>
  <div class="drawer__scrim" data-close-cart></div>
  <div class="drawer__panel" role="dialog" aria-modal="true" aria-labelledby="cart-title">
    <header><h2 id="cart-title">Your cart</h2><button type="button" class="x" data-close-cart aria-label="Close cart">×</button></header>
    <div class="drawer__body" data-cart-lines></div>
    <footer class="drawer__foot" data-cart-foot></footer>
  </div>
</aside>
<div class="toast" role="status" aria-live="polite" hidden></div>
<script>window.STORE=${JSON.stringify({ cur: s.currency, wa: s.whatsapp, freeOver: Number(s.free_shipping_over) || 0, low: Number(s.low_stock_at) || 5, icons: ICONS }).replace(/</g, "\\u003c")};</script>
<script src="/static/store.js?v=${V}" defer></script>
</body>
</html>`;
}

/* ------------------------------------------------------------------ pieces */
export function thumb(p, cls = "thumb") {
  if (p.image) return `<div class="${cls}"><img src="${esc(p.image)}" alt="${esc(p.title)}" loading="lazy"></div>`;
  return `<div class="${cls} ${cls}--draw t-${esc(p.trade || "")}">${icon(p.icon, "thumb__ico")}<span class="thumb__sku">${esc(p.sku || "")}</span></div>`;
}

const stars = (r) => {
  const n = Math.round(r);
  return `<span class="stars" aria-label="${r.toFixed(1)} out of 5">${"★".repeat(n)}<i>${"★".repeat(5 - n)}</i></span>`;
};

export function card(p, cur) {
  const sale = p.compare_price && p.compare_price > p.price ? Math.round((1 - p.price / p.compare_price) * 100) : 0;
  const out = p.stock <= 0;
  const hasV = p.variant_count > 0;
  return `<article class="card${out ? " card--out" : ""}">
  <a href="/p/${esc(p.slug)}" class="card__img">${thumb(p)}${sale ? `<span class="tag tag--sale">−${sale}%</span>` : ""}${out ? '<span class="tag">Sold out</span>' : ""}</a>
  <div class="card__body">
    <a href="/p/${esc(p.slug)}" class="card__title">${esc(p.title)}</a>
    ${p.title_ur ? `<span class="card__ur" lang="ur">${esc(p.title_ur)}</span>` : ""}
    ${p.rating ? `<span class="card__rate">${stars(p.rating)} <small>(${p.reviews})</small></span>` : ""}
    <div class="card__foot">
      <span class="price">${hasV ? "<small>from</small> " : ""}${money(p.price, cur)}${sale ? ` <s>${money(p.compare_price, cur)}</s>` : ""}<em>/ ${esc(p.unit)}</em></span>
      ${out ? "" : hasV
        ? `<a class="btn btn--sm btn--line" href="/p/${esc(p.slug)}">Choose</a>`
        : `<button class="btn btn--sm" type="button" data-add='${esc(JSON.stringify({ productId: p.id, qty: 1, title: p.title }))}'>Add</button>`}
    </div>
  </div>
</article>`;
}

const grid = (items, cur) => items.length ? `<div class="grid">${items.map((p) => card(p, cur)).join("")}</div>` : "";

/* ------------------------------------------------------------------ pages */
export function home(ctx, { featured, offers, trades, newest }) {
  const cur = ctx.s.currency;
  const body = `
<section class="hero">
  <div class="wrap hero__grid">
    <div>
      <p class="eyebrow">Raiwind Road · Kot Araian · Lahore</p>
      <h1>The whole counter,<br><mark>online.</mark></h1>
      <p class="lede">Wire, breakers, lights, taps, PPR fittings and tools at shop prices. Order here and pay cash on delivery, or pick up from our counter any time, day or night.</p>
      <form class="hero__search" action="/shop"><input name="q" type="search" placeholder="What do you need? e.g. 7/29 wire" aria-label="Search products"><button class="btn">Search</button></form>
      <p class="hero__chips">Popular: <a href="/shop?q=wire">Wire</a><a href="/shop?q=mcb">MCB</a><a href="/shop?q=ppr">PPR</a><a href="/shop?q=led">LED bulb</a><a href="/shop?q=mixer">Mixer</a></p>
    </div>
    <div class="trades">
      ${trades.map((t) => `<a class="trade t-${t.trade}" href="/shop?t=${t.trade}">
        <span class="trade__k">${t.trade}</span>
        <b>${TRADES[t.trade]}</b><em lang="ur">${TRADE_UR[t.trade]}</em>
        <small>${t.n} products →</small></a>`).join("")}
    </div>
  </div>
</section>

<section class="trust"><div class="wrap trust__row">
  <div><b>Cash on delivery</b><span>Pay when it arrives</span></div>
  <div><b>Lahore delivery</b><span>${money(ctx.s.shipping_local, cur)} · free over ${money(ctx.s.free_shipping_over, cur)}</span></div>
  <div><b>24-hour pickup</b><span>Collect from the counter</span></div>
  <div><b>Help on WhatsApp</b><span>Send a photo of the part</span></div>
</div></section>

${featured.length ? `<section class="block"><div class="wrap">
  <div class="block__head"><h2>Counter favourites</h2><a href="/shop">See all products →</a></div>${grid(featured, cur)}</div></section>` : ""}

<section class="block block--tint"><div class="wrap">
  <div class="block__head"><h2>Shop by department</h2></div>
  <div class="depts">${ctx.cats.map((c) => `<a class="dept t-${c.trade}" href="/shop?c=${esc(c.slug)}">${icon(c.icon)}<span><b>${esc(c.name)}</b><em lang="ur">${esc(c.name_ur)}</em></span></a>`).join("")}</div>
</div></section>

${offers.length ? `<section class="block"><div class="wrap">
  <div class="block__head"><h2>On offer</h2><a href="/shop?sale=1">All offers →</a></div>${grid(offers, cur)}</div></section>` : ""}

<section class="block"><div class="wrap">
  <div class="cta">
    <div><p class="eyebrow eyebrow--y">For electricians, plumbers &amp; contractors</p><h2>Got a full job list?</h2><p>Send the whole list on WhatsApp. We'll price it, pack it and keep it ready at the counter, or send it to site.</p></div>
    <a class="btn btn--y" href="https://wa.me/${esc(ctx.s.whatsapp)}?text=${encodeURIComponent("Assalam o Alaikum, I'd like a price for this list:\n")}" target="_blank" rel="noopener">Send list on WhatsApp</a>
  </div>
</div></section>

${newest.length ? `<section class="block"><div class="wrap"><div class="block__head"><h2>New on the shelf</h2></div>${grid(newest, cur)}</div></section>` : ""}`;
  return layout({
    title: "Malik Shahzad Online Store · Electric, Hardware & Sanitary · Lahore",
    body, ctx, canonical: ctx.base + "/",
    jsonld: { "@context": "https://schema.org", "@type": "HardwareStore", name: ctx.s.store_name, telephone: ctx.s.phone, url: ctx.base + "/",
      address: { "@type": "PostalAddress", streetAddress: "Raiwind Road, Kot Araian", addressLocality: "Lahore", addressCountry: "PK" },
      openingHours: "Mo-Su 00:00-23:59" }
  });
}

export function shop(ctx, { products, total, page, pages, f, cat, brands }) {
  const cur = ctx.s.currency;
  const qs = (over) => {
    const p = new URLSearchParams();
    const m = { ...f, ...over };
    for (const [k, v] of Object.entries(m)) if (v !== "" && v != null && v !== false && !(k === "page" && v === 1)) p.set(k, v);
    const s = p.toString();
    return "/shop" + (s ? "?" + s : "");
  };
  const heading = cat ? cat.name : f.t ? TRADES[f.t] : f.q ? `Results for “${f.q}”` : f.sale ? "On offer" : "All products";
  const groups = Object.entries(TRADES).map(([k, v]) => `
    <div class="fgroup"><a class="fgroup__t${f.t === k && !f.c ? " on" : ""}" href="${qs({ t: k, c: "", page: 1 })}">${v}</a>
    ${ctx.cats.filter((c) => c.trade === k).map((c) => `<a class="${f.c === c.slug ? "on" : ""}" href="${qs({ c: c.slug, t: "", page: 1 })}">${esc(c.name)}</a>`).join("")}</div>`).join("");

  const body = `
<div class="wrap shop">
  <nav class="crumbs"><a href="/">Home</a><span>/</span>${cat ? `<a href="/shop?t=${cat.trade}">${TRADES[cat.trade]}</a><span>/</span>${esc(cat.name)}` : esc(heading)}</nav>
  <div class="shop__head">
    <div><h1>${esc(heading)}</h1>${cat?.name_ur ? `<p class="ur" lang="ur">${esc(cat.name_ur)}</p>` : ""}<p class="muted">${total} product${total === 1 ? "" : "s"}</p></div>
    <form class="sort" action="/shop">
      ${Object.entries(f).filter(([k, v]) => k !== "sort" && k !== "page" && v).map(([k, v]) => `<input type="hidden" name="${k}" value="${esc(v)}">`).join("")}
      <label for="sort">Sort</label>
      <select id="sort" name="sort" data-autosubmit>
        ${[["", "Featured"], ["price_asc", "Price: low to high"], ["price_desc", "Price: high to low"], ["new", "Newest"], ["name", "Name A–Z"]].map(([v, l]) => `<option value="${v}"${f.sort === v ? " selected" : ""}>${l}</option>`).join("")}
      </select>
    </form>
  </div>
  <div class="shop__grid">
    <details class="filters" open>
      <summary>Filters</summary>
      <a class="fgroup__t${!f.t && !f.c ? " on" : ""}" href="${qs({ t: "", c: "", page: 1 })}">All products</a>
      ${groups}
      <form class="frange" action="/shop">
        ${Object.entries(f).filter(([k, v]) => !["min", "max", "stock", "sale", "brand", "page"].includes(k) && v).map(([k, v]) => `<input type="hidden" name="${k}" value="${esc(v)}">`).join("")}
        <p class="flabel">Price (${esc(cur)})</p>
        <div class="frange__row"><input name="min" inputmode="numeric" placeholder="Min" value="${esc(f.min)}" aria-label="Minimum price"><span>–</span><input name="max" inputmode="numeric" placeholder="Max" value="${esc(f.max)}" aria-label="Maximum price"></div>
        ${brands.length ? `<p class="flabel">Brand</p><select name="brand" aria-label="Brand"><option value="">Any brand</option>${brands.map((b) => `<option${f.brand === b ? " selected" : ""}>${esc(b)}</option>`).join("")}</select>` : ""}
        <label class="check"><input type="checkbox" name="stock" value="1"${f.stock ? " checked" : ""}> In stock only</label>
        <label class="check"><input type="checkbox" name="sale" value="1"${f.sale ? " checked" : ""}> On offer</label>
        <button class="btn btn--sm">Apply</button>
      </form>
    </details>
    <div>
      ${products.length ? grid(products, cur) : `<div class="empty"><h2>Nothing found</h2><p>Try a different word, or ask us on WhatsApp — we stock far more than we've listed online.</p><a class="btn" href="https://wa.me/${esc(ctx.s.whatsapp)}" target="_blank" rel="noopener">Ask on WhatsApp</a></div>`}
      ${pages > 1 ? `<nav class="pager">${Array.from({ length: pages }, (_, i) => i + 1).map((n) => n === page ? `<span>${n}</span>` : `<a href="${qs({ page: n })}">${n}</a>`).join("")}</nav>` : ""}
    </div>
  </div>
</div>`;
  return layout({ title: `${heading} · Malik Shahzad Online Store`, body, ctx, canonical: ctx.base + (cat ? `/shop?c=${cat.slug}` : "/shop"), noindex: !!(f.q || f.min || f.max || f.sort || page > 1) });
}

export function product(ctx, { p, variants, cat, related, reviews, rating }) {
  const cur = ctx.s.currency;
  const first = variants.find((v) => v.stock > 0) || variants[0];
  const price = first ? first.price : p.price;
  const stock = first ? first.stock : p.stock;
  const compare = first ? first.compare_price : p.compare_price;
  const wa = `https://wa.me/${ctx.s.whatsapp}?text=${encodeURIComponent(`Assalam o Alaikum, I have a question about: ${p.title}\n${ctx.base}/p/${p.slug}`)}`;
  const body = `
<div class="wrap pdp">
  <nav class="crumbs"><a href="/">Home</a><span>/</span>${cat ? `<a href="/shop?c=${esc(cat.slug)}">${esc(cat.name)}</a><span>/</span>` : ""}${esc(p.title)}</nav>
  <div class="pdp__grid">
    <div class="pdp__media">${thumb({ ...p, trade: cat?.trade }, "pimg")}</div>
    <div class="pdp__info" data-product='${esc(JSON.stringify({ id: p.id, title: p.title, variants: variants.map((v) => ({ id: v.id, name: v.name, price: v.price, compare: v.compare_price, stock: v.stock })), price: p.price, stock: p.stock }))}'>
      ${cat ? `<a class="eyebrow" href="/shop?c=${esc(cat.slug)}">${esc(cat.name)}</a>` : ""}
      <h1>${esc(p.title)}</h1>
      ${p.title_ur ? `<p class="ur" lang="ur" dir="rtl">${esc(p.title_ur)}</p>` : ""}
      ${rating.n ? `<a class="pdp__rate" href="#reviews">${stars(rating.avg)} ${rating.avg.toFixed(1)} · ${rating.n} review${rating.n === 1 ? "" : "s"}</a>` : ""}
      <p class="pdp__price"><b data-price>${money(price, cur)}</b> <s data-compare>${compare && compare > price ? money(compare, cur) : ""}</s> <em>per ${esc(p.unit)}</em></p>

      ${variants.length ? `<fieldset class="variants"><legend>Size / type</legend>
        ${variants.map((v) => `<label class="vpill${v.stock <= 0 ? " vpill--out" : ""}"><input type="radio" name="variant" value="${v.id}"${v === first ? " checked" : ""}${v.stock <= 0 ? " disabled" : ""}><span>${esc(v.name)}<small>${money(v.price, cur)}</small></span></label>`).join("")}
      </fieldset>` : ""}

      <p class="stock" data-stock>${stockLabel(stock, ctx.s)}</p>

      <div class="buy">
        <div class="qty"><button type="button" data-step="-1" aria-label="Less">−</button><input type="number" min="1" max="999" value="1" data-qty aria-label="Quantity"><button type="button" data-step="1" aria-label="More">+</button></div>
        <button class="btn btn--grow" type="button" data-add-pdp${stock <= 0 ? " disabled" : ""}>Add to cart</button>
      </div>
      <button class="btn btn--y btn--block" type="button" data-buy-now${stock <= 0 ? " disabled" : ""}>Buy now — cash on delivery</button>
      <a class="btn btn--line btn--block" href="${esc(wa)}" target="_blank" rel="noopener">Ask about this on WhatsApp</a>

      <ul class="pdp__facts">
        <li><span>SKU</span><code data-sku>${esc(p.sku)}</code></li>
        ${p.brand ? `<li><span>Brand</span>${esc(p.brand)}</li>` : ""}
        <li><span>Delivery</span>Lahore ${money(ctx.s.shipping_local, cur)} · other cities ${money(ctx.s.shipping_outside, cur)} · free over ${money(ctx.s.free_shipping_over, cur)}</li>
        <li><span>Pickup</span>Free, from our Raiwind Road counter, 24 hours</li>
      </ul>
      ${p.description ? `<div class="pdp__desc"><h2>About this item</h2>${p.description.split(/\n+/).map((x) => `<p>${esc(x)}</p>`).join("")}</div>` : ""}
    </div>
  </div>

  <section class="reviews" id="reviews">
    <div class="block__head"><h2>Reviews</h2></div>
    <div class="reviews__grid">
      <div>${reviews.length ? reviews.map((r) => `<article class="review"><header>${stars(r.rating)} <b>${esc(r.name)}</b><time>${esc(r.created_at.slice(0, 10))}</time></header>${r.body ? `<p>${esc(r.body)}</p>` : ""}</article>`).join("") : '<p class="muted">No reviews yet. Bought this from us? Tell others what you think.</p>'}</div>
      <form class="rform" data-review="${p.id}">
        <h3>Write a review</h3>
        <label>Your name<input name="name" required maxlength="60"></label>
        <label>Rating<select name="rating" required><option value="5">★★★★★ Excellent</option><option value="4">★★★★ Good</option><option value="3">★★★ Okay</option><option value="2">★★ Poor</option><option value="1">★ Bad</option></select></label>
        <label>Review<textarea name="body" rows="3" maxlength="800"></textarea></label>
        <button class="btn btn--sm">Submit review</button>
        <p class="muted small">Reviews appear after the shop approves them.</p>
      </form>
    </div>
  </section>

  ${related.length ? `<section class="block"><div class="block__head"><h2>You may also need</h2></div>${grid(related, cur)}</section>` : ""}
</div>`;
  return layout({
    title: `${p.title} · Malik Shahzad`, description: (p.description || "").slice(0, 155), body, ctx, canonical: `${ctx.base}/p/${p.slug}`,
    jsonld: {
      "@context": "https://schema.org", "@type": "Product", name: p.title, sku: p.sku, description: p.description,
      ...(p.brand ? { brand: { "@type": "Brand", name: p.brand } } : {}),
      ...(rating.n ? { aggregateRating: { "@type": "AggregateRating", ratingValue: rating.avg.toFixed(1), reviewCount: rating.n } } : {}),
      offers: { "@type": "Offer", priceCurrency: "PKR", price: price, availability: stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock", url: `${ctx.base}/p/${p.slug}` }
    }
  });
}

export const stockLabel = (n, s) =>
  n <= 0 ? '<span class="dot dot--out"></span> Out of stock — ask us on WhatsApp'
  : n <= Number(s.low_stock_at || 5) ? `<span class="dot dot--low"></span> Only ${n} left`
  : '<span class="dot"></span> In stock, ready at the counter';

export function cartPage(ctx) {
  const body = `<div class="wrap narrow"><h1 class="pg">Your cart</h1><div class="cartpage" data-cart-page><p class="muted">Loading your cart…</p></div></div>`;
  return layout({ title: "Cart · Malik Shahzad", body, ctx, noindex: true });
}

export function checkout(ctx, { methods }) {
  const s = ctx.s, u = ctx.user || {};
  const payInfo = {
    cod: "Pay in cash when your order arrives.",
    bank: `Transfer the total to this account, then enter the transaction ID below. We'll confirm on WhatsApp.<pre>${esc(s.bank_details)}</pre>`,
    jazzcash: `Send the total to JazzCash number <b>${esc(s.wallet_number)}</b>, then enter the transaction ID below.`,
    easypaisa: `Send the total to Easypaisa number <b>${esc(s.wallet_number)}</b>, then enter the transaction ID below.`
  };
  const body = `
<div class="wrap checkout">
  <h1 class="pg">Checkout</h1>
  <form class="co" id="checkout" novalidate>
    <div class="co__main">
      <section class="co__box"><h2><span>1</span> Contact</h2>
        <div class="fields">
          <label>Full name<input name="name" required autocomplete="name" value="${esc(u.name || "")}"></label>
          <label>Mobile number<input name="phone" required inputmode="tel" autocomplete="tel" placeholder="03XX XXXXXXX" value="${esc(u.phone || "")}"></label>
          <label class="span2">Email <small>(optional, for a receipt)</small><input name="email" type="email" autocomplete="email" value="${esc(u.email || "")}"></label>
        </div>
      </section>
      <section class="co__box"><h2><span>2</span> Delivery</h2>
        <div class="choice">
          <label><input type="radio" name="delivery" value="delivery" checked><span><b>Deliver to me</b><small>Lahore ${money(s.shipping_local, s.currency)} · other cities ${money(s.shipping_outside, s.currency)}</small></span></label>
          ${s.allow_pickup === "1" ? `<label><input type="radio" name="delivery" value="pickup"><span><b>Pick up from the shop</b><small>Free · Raiwind Road, Kot Araian · any time, 24 hours</small></span></label>` : ""}
        </div>
        <div class="fields" data-address>
          <label class="span2">Address<textarea name="address" rows="2" autocomplete="street-address" placeholder="House, street, block / area">${esc(u.address || "")}</textarea></label>
          <label>City<input name="city" autocomplete="address-level2" value="${esc(u.city || s.local_city)}"></label>
          <label>Note for us <small>(optional)</small><input name="notes" placeholder="Landmark, best time to call…"></label>
        </div>
      </section>
      <section class="co__box"><h2><span>3</span> Payment</h2>
        <div class="choice" data-pay>
          ${methods.map((m, i) => `<label><input type="radio" name="payment" value="${m}"${i === 0 ? " checked" : ""}><span><b>${PAYMENT_LABEL[m]}</b><small class="payinfo">${payInfo[m]}</small></span></label>`).join("")}
          <label data-counter hidden><input type="radio" name="payment" value="counter"><span><b>Pay at the counter</b><small class="payinfo">Pay in cash or by card when you collect.</small></span></label>
        </div>
        <label class="ref" data-ref hidden>Transaction ID<input name="paymentRef" placeholder="e.g. 0123456789"></label>
      </section>
    </div>
    <aside class="co__side">
      <div class="co__box co__sum" data-summary><p class="muted">Loading…</p></div>
      <div class="co__code"><input name="code" placeholder="Discount code" aria-label="Discount code"><button type="button" class="btn btn--sm btn--line" data-apply-code>Apply</button></div>
      <p class="co__err" role="alert" hidden></p>
      <button class="btn btn--block btn--big" type="submit" data-place>Place order</button>
      <p class="muted small center">We'll call or WhatsApp to confirm before dispatch.</p>
    </aside>
  </form>
</div>`;
  return layout({ title: "Checkout · Malik Shahzad", body, ctx, noindex: true });
}

export function orderPage(ctx, o, fresh) {
  const cur = ctx.s.currency;
  const steps = ["pending", "confirmed", "packed", "shipped", "delivered"];
  const at = steps.indexOf(o.status);
  const waText = `Assalam o Alaikum, I just placed order ${o.number} (${money(o.total, cur)}). Please confirm.`;
  const needsPay = ["bank", "jazzcash", "easypaisa"].includes(o.payment_method) && o.payment_status !== "paid";
  const body = `
<div class="wrap narrow order">
  ${fresh ? `<div class="thanks"><p class="eyebrow">Order placed</p><h1>Shukriya, ${esc(o.name.split(" ")[0])}!</h1><p>Your order <b>${esc(o.number)}</b> is in. We'll call or WhatsApp you on <b>${esc(o.phone)}</b> to confirm.</p>
    <a class="btn btn--wa" href="https://wa.me/${esc(ctx.s.whatsapp)}?text=${encodeURIComponent(waText)}" target="_blank" rel="noopener">Confirm faster on WhatsApp</a></div>`
    : `<p class="eyebrow">Order</p><h1 class="pg">${esc(o.number)}</h1>`}

  ${o.status === "cancelled"
    ? '<div class="note note--bad">This order was cancelled. Questions? Call or WhatsApp us.</div>'
    : `<ol class="steps">${steps.map((st, i) => `<li class="${i < at ? "done" : i === at ? "now" : ""}"><span></span>${STATUS_LABEL[st]}</li>`).join("")}</ol>`}

  ${needsPay ? `<div class="note">Payment pending: please send <b>${money(o.total, cur)}</b> by ${PAYMENT_LABEL[o.payment_method]}${o.payment_method === "bank" ? `<pre>${esc(ctx.s.bank_details)}</pre>` : ` to <b>${esc(ctx.s.wallet_number)}</b>.`} ${o.payment_ref ? `Your reference: <code>${esc(o.payment_ref)}</code>` : ""}</div>` : ""}

  <div class="order__grid">
    <section class="co__box">
      <h2>Items</h2>
      <table class="lines">${o.items.map((i) => `<tr><td>${esc(i.title)}${i.variant_name ? `<small>${esc(i.variant_name)}</small>` : ""}</td><td>× ${i.qty}</td><td>${money(i.line_total, cur)}</td></tr>`).join("")}</table>
      <dl class="totals">
        <div><dt>Subtotal</dt><dd>${money(o.subtotal, cur)}</dd></div>
        ${o.discount ? `<div><dt>Discount ${o.discount_code ? `(${esc(o.discount_code)})` : ""}</dt><dd>− ${money(o.discount, cur)}</dd></div>` : ""}
        <div><dt>${o.delivery_method === "pickup" ? "Pickup" : "Delivery"}</dt><dd>${o.shipping ? money(o.shipping, cur) : "Free"}</dd></div>
        <div class="grand"><dt>Total</dt><dd>${money(o.total, cur)}</dd></div>
      </dl>
    </section>
    <section class="co__box">
      <h2>${o.delivery_method === "pickup" ? "Pickup" : "Delivery"}</h2>
      <p>${esc(o.name)}<br>${esc(o.phone)}${o.delivery_method === "pickup" ? `<br>Collect from: ${esc(ctx.s.address)}` : `<br>${esc(o.address)}<br>${esc(o.city)}`}</p>
      <h2>Payment</h2><p>${PAYMENT_LABEL[o.payment_method] || esc(o.payment_method)} · <b>${o.payment_status === "paid" ? "Paid" : "Not paid yet"}</b></p>
      <h2>Placed</h2><p>${esc(o.created_at)} (UTC)</p>
    </section>
  </div>
  <p class="center"><a href="/shop">← Continue shopping</a></p>
</div>`;
  return layout({ title: `Order ${o.number} · Malik Shahzad`, body, ctx, noindex: true });
}

export function trackPage(ctx, err = "") {
  const body = `
<div class="wrap narrow">
  <h1 class="pg">Track your order</h1>
  <form class="co__box track" method="post" action="/track">
    <p>Enter the order number from your confirmation and the mobile number you ordered with.</p>
    ${err ? `<p class="co__err">${esc(err)}</p>` : ""}
    <label>Order number<input name="number" placeholder="MS-10001" required></label>
    <label>Mobile number<input name="phone" inputmode="tel" placeholder="03XX XXXXXXX" required></label>
    <button class="btn">Find my order</button>
  </form>
</div>`;
  return layout({ title: "Track order · Malik Shahzad", body, ctx, noindex: true });
}

export function accountPage(ctx, orders) {
  const cur = ctx.s.currency;
  if (!ctx.user) {
    const body = `
<div class="wrap narrow">
  <h1 class="pg">Your account</h1>
  <p class="muted">You don't need an account to order. Make one to save your address and see all your orders.</p>
  <div class="auth">
    <form class="co__box" data-auth="login"><h2>Log in</h2>
      <label>Mobile number<input name="phone" inputmode="tel" required></label>
      <label>Password<input name="password" type="password" required autocomplete="current-password"></label>
      <p class="co__err" hidden></p><button class="btn">Log in</button></form>
    <form class="co__box" data-auth="register"><h2>Create account</h2>
      <label>Full name<input name="name" required autocomplete="name"></label>
      <label>Mobile number<input name="phone" inputmode="tel" required></label>
      <label>Password <small>(at least 6 characters)</small><input name="password" type="password" minlength="6" required autocomplete="new-password"></label>
      <p class="co__err" hidden></p><button class="btn btn--y">Create account</button></form>
  </div>
</div>`;
    return layout({ title: "Account · Malik Shahzad", body, ctx, noindex: true });
  }
  const u = ctx.user;
  const body = `
<div class="wrap narrow">
  <div class="acct__head"><div><p class="eyebrow">My account</p><h1 class="pg">${esc(u.name)}</h1><p class="muted">${esc(u.phone)}${u.city ? " · " + esc(u.city) : ""}</p></div><button class="btn btn--line btn--sm" data-logout>Log out</button></div>
  <section class="co__box"><h2>Your orders</h2>
  ${orders.length ? `<table class="otable"><thead><tr><th>Order</th><th>Date</th><th>Status</th><th>Total</th></tr></thead><tbody>
    ${orders.map((o) => `<tr><td><a href="/order/${esc(o.number)}?t=${esc(o.token)}">${esc(o.number)}</a></td><td>${esc(o.created_at.slice(0, 10))}</td><td><span class="badge badge--${o.status}">${STATUS_LABEL[o.status]}</span></td><td>${money(o.total, cur)}</td></tr>`).join("")}
  </tbody></table>` : '<p class="muted">No orders yet. <a href="/shop">Start shopping →</a></p>'}
  </section>
</div>`;
  return layout({ title: "My account · Malik Shahzad", body, ctx, noindex: true });
}

export function helpPage(ctx) {
  const s = ctx.s, cur = s.currency;
  const body = `
<div class="wrap narrow prose">
  <h1 class="pg">Delivery, payment &amp; returns</h1>
  <h2>Delivery</h2>
  <p>Inside ${esc(s.local_city)}: ${money(s.shipping_local, cur)}. Other cities: ${money(s.shipping_outside, cur)} by courier. Orders over ${money(s.free_shipping_over, cur)} ship free. We call or WhatsApp to confirm every order before it leaves the shop.</p>
  <h2>Pickup</h2>
  <p>Choose "Pick up from the shop" at checkout and collect from ${esc(s.address)}. The counter is open 24 hours, every day.</p>
  <h2>Payment</h2>
  <p>Cash on delivery, bank transfer, JazzCash or Easypaisa. For transfers, add your transaction ID at checkout and we'll mark your order paid once it's received.</p>
  <h2>Returns &amp; exchanges</h2>
  <p>Unused items in original packing can be exchanged or returned within 7 days with the order number. Cut-to-length wire, used items and special orders can't be returned. Faulty items are replaced as per the manufacturer's warranty.</p>
  <h2>Need help?</h2>
  <p>Call <a href="tel:${esc(s.phone.replace(/\s/g, ""))}">${esc(s.phone)}</a> or <a href="https://wa.me/${esc(s.whatsapp)}" target="_blank" rel="noopener">message us on WhatsApp</a>.</p>
</div>`;
  return layout({ title: "Delivery, payment & returns · Malik Shahzad", body, ctx, canonical: ctx.base + "/help" });
}

export function notFound(ctx) {
  const body = `<div class="wrap narrow empty"><p class="eyebrow">404</p><h1 class="pg">That shelf is empty.</h1><p>The page you wanted isn't here. Try searching, or browse all products.</p><a class="btn" href="/shop">Browse products</a></div>`;
  return layout({ title: "Not found · Malik Shahzad", body, ctx, noindex: true });
}
