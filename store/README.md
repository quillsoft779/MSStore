# Malik Shahzad — Online Store

The online shop for Malik Shahzad Electric, Hardware & Sanitary Store, with a full admin panel.
It needs **no extra packages**, only Node.js 22.13 or newer, and keeps everything in one folder (`data/`).

## What's included

**Shop (for customers)**
- Home page, 12 departments, search with instant suggestions, filters (department, price, in stock, on offer, brand) and sorting
- Product pages with sizes/types (e.g. wire 3/29 · 7/29 · 7/36), sale prices, stock levels, reviews, WhatsApp button
- Slide-out cart, cart page, discount codes, free-delivery progress bar
- Checkout: delivery or **pickup from the shop**, Lahore vs other-city delivery charges,
  **Cash on delivery, Bank transfer, JazzCash, Easypaisa** (with transaction ID)
- Order confirmation with a status tracker, "Track order" by order number and mobile
- Customer accounts (mobile + password) with order history
- Urdu names throughout, SEO (Google product data, sitemap.xml, robots.txt), works on phones

**Admin panel** — `/admin`
- Dashboard: today / 7 days / month sales, 14-day chart, orders to confirm, low stock, top sellers
- Orders: filter by status, search, one-click next status, cancel (puts stock back), mark paid,
  private notes, history, **printable invoice**, WhatsApp the customer, CSV export
- Products: add/edit/delete, photos, Urdu name, variants with their own price and stock, draft/active, featured
- Inventory: change stock counts in one list
- Categories, Customers, Discount codes (% off, Rs off, free delivery, min order, expiry, max uses),
  Reviews (approve before they show), Settings (delivery rates, payment methods, bank details, top bar message), change password

## Run it on your computer

```powershell
cd store
node server.js
```

Open http://localhost:3000 for the shop and **http://localhost:3000/admin** for the admin.
The first time you open `/admin`, it asks you to create the owner username and password.

## Before going live

1. In **Admin → Products**, check every price and stock count. The starter catalogue (54 products) uses
   **sample prices**, so replace them with your real ones and add photos.
2. In **Admin → Settings**, enter your real bank account details and JazzCash/Easypaisa number,
   and check the delivery charges.
3. Delete or change the starter discount code `WELCOME5` in **Admin → Discounts** if you don't want it.

## Putting it online

The store is a small server program, so it needs a host that runs **Node.js** and keeps files
(the `data/` folder holds the database and product photos). Netlify (used for the main website) **cannot** run it.

Good options:

| Host | Cost (approx.) | Notes |
|---|---|---|
| **Railway** (railway.app) | about $5/month | Easiest. Deploy from GitHub, add a **Volume** mounted at `/data`. |
| **Render** (render.com) | about $7/month + disk | Web Service with a **Persistent Disk** at `/data`. |
| VPS (Hostinger, DigitalOcean, Contabo) | $4–6/month | Most control. Run with `pm2`, put Caddy or Nginx in front for HTTPS. |

A `Dockerfile` is included, and Railway and Render will use it automatically.

Set these environment variables on the host:

| Variable | Example | Why |
|---|---|---|
| `BASE_URL` | `https://shop.malikshahzad.pk` | Correct links in Google data and secure cookies |
| `DATA_DIR` | `/data` | Where the database and photos are kept (must be persistent storage) |
| `PORT` | `3000` | Usually set by the host automatically |
| `SETUP_CODE` | a long random code | Only someone with this code can create the first owner account at `/admin`. Remove it once you've set up. |
| `TRUST_PROXY` | `1` | Already set in the Dockerfile. Uses the visitor's real address for login/checkout limits behind the host's proxy. Leave unset if the store faces the internet directly. |

A health check is available at `/healthz` (Railway uses it automatically via `railway.json`).

Then point a domain or subdomain (e.g. `shop.yourdomain.pk`) at it.

## Backups

Everything is in the `data/` folder (`store.db` + `uploads/`). Copy that folder somewhere safe regularly.
Railway and Render volumes can also be snapshotted.

## Files

```
server.js          web server, all routes and the admin API
src/db.js          database tables and settings
src/seed.js        starter categories and products (sample prices)
src/commerce.js    cart pricing, discounts, delivery, orders, stock
src/views.js       shop pages
src/icons.js       product drawings used when there's no photo
public/            shop CSS/JS, logo, and the admin panel (public/admin)
```
