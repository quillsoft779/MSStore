# Malik Shahzad — Electric, Hardware & Sanitary Store

Website, logo and online store for **Malik Shahzad Electric Hardware and Sanitary Store**,
Raiwind Road, Kot Araian, Lahore. Open 24 hours · 0344 650 4445.

## What's in this repo

| Folder | What it is | Where it runs |
|---|---|---|
| `/` (`index.html`, `styles.css`, `script.js`) | Business website: hero with light switch, parts-cabinet catalogue, 24-hour section, WhatsApp order form, map | Any static host (e.g. Netlify) |
| [`logo/`](logo) | Logo files (SVG) and a brand sheet that exports PNGs: horizontal, stacked with Urdu, icon, profile photo, signboard | Open `logo/index.html` in a browser |
| [`store/`](store) | Online store with an admin panel: products, cart, checkout (COD, bank, JazzCash, Easypaisa), orders, stock, discounts, reviews | Node.js host with persistent storage (e.g. Railway) — see [`store/README.md`](store/README.md) |

## Run locally

Website: open `index.html`, or serve the folder:

```powershell
python -m http.server 5173
```

Store (Node.js 22.13+, no packages to install):

```powershell
cd store
node server.js
```

Shop at http://localhost:3000, admin at http://localhost:3000/admin.

## Deploying the store

The store deploys from the **`store/`** folder, which has a `Dockerfile`. It is live on Railway
(project *accurate-optimism*, service *MSStore*): root directory `/store`, volume at `/data`,
health check `/healthz`, and `BASE_URL`, `PORT` and `SETUP_CODE` set as variables.
Every push to `main` redeploys it. Full details are in [`store/README.md`](store/README.md).

After the store is live, put its address in `STORE_URL` near the end of `script.js`
so the website's "Shop online" buttons appear.
