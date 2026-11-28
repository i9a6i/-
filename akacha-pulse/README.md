# akacha-pulse (recovered source)

Source of the Vercel project **akacha-pulse** (team `i9a6is-projects`), taken from the latest
production deployment `dpl_AAp8pC1p5XbpSro3dfMJPWr6GZGX`. The project is **not linked to Git**:
it was deployed with the Vercel CLI, so the deployment was the only copy of this code.

## How it works

```
Windows PC (POS / till)                      Vercel: akacha-pulse                    Phone
───────────────────────                      ────────────────────                    ─────
till script ── POST /api/ingest ──────────►  saves KPI snapshot to Blob (kpi/snapshot…)
  (Authorization: Bearer INGEST_TOKEN)
publish.mjs ── POST /api/ingest?site=… ───►  saves site files to Blob (site/…)
Telegram bot ── /dash link (DASH_KEY) ─────────────────────────────────────────────►  opens dashboard
                                             GET /            → api/page.js (index.html from Blob)
                                             GET /api/data    → api/data.js (latest snapshot, x-dash-key)
```

| File | Role |
|---|---|
| `api/_auth.js` | constant-time secret check, Blob prefixes, list of allowed site files |
| `api/ingest.partial.js` | POST from the till: a KPI snapshot, or one site file (`?site=`) |
| `api/data.js` | GET latest snapshot for the dashboard (header `x-dash-key`) |
| `api/page.js` | serves `index.html`, `app.js`, `styles.css`, logos **from Blob** |
| `vercel.json` | rewrites `/`, `/app.js`… → `/api/page`, security headers |

## Not in this folder

- **The rest of `api/ingest.js`**: the Vercel API cut off about 640 characters at the end. Copy the full file
  from the dashboard: Deployments → latest → **Source** → `api/ingest.js`, then rename `ingest.partial.js`.
- **The dashboard UI** (`index.html`, `app.js`, `styles.css`, logos): stored in Vercel Blob, uploaded
  from the PC with `publish.mjs`. Its source is on the Windows PC.
- **The till script, `publish.mjs` and the Telegram bot**: on the Windows PC.
- **Secrets** (`INGEST_TOKEN`, `DASH_KEY`, `BLOB_READ_WRITE_TOKEN`): only on Vercel. Never commit them.

## Run on the Mac

```bash
cd akacha-pulse
npm install
npm i -g vercel
vercel link --scope i9a6is-projects --project akacha-pulse
vercel env pull .env.local     # only BLOB_READ_WRITE_TOKEN comes down (the other two are production-only "sensitive")
vercel dev
```

Note: `.env.local` points at the **same production Blob store**, so data shown by `vercel dev` is live data.
Deploy with `vercel` (preview) first; `vercel --prod` replaces the live site.
