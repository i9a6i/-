// POST /api/ingest — the till pushes its KPI snapshot here (Authorization: Bearer INGEST_TOKEN).
// POST /api/ingest?site=index.html with {"data":"<base64>"} publishes one site file (served by /api/page).
import { put, list, del } from '@vercel/blob';
import { sameSecret, SNAPSHOT_PREFIX, SITE_FILES } from './_auth.js';

export const config = { api: { bodyParser: { sizeLimit: '3mb' } } };

export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  const token = String(req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
  if (!sameSecret(token, process.env.INGEST_TOKEN)) return res.status(401).json({ error: 'unauthorized' });
  const body = typeof req.body === 'string' ? safeJson(req.body) : req.body;

  const site = req.query?.site;
  if (site) {
    const meta = SITE_FILES[site];
    if (!meta || typeof body?.data !== 'string') return res.status(400).json({ error: 'bad_site_file' });
    await put(`site/${site}`, Buffer.from(body.data, 'base64'), { access: 'public', addRandomSuffix: false, allowOverwrite: true, contentType: meta.type, cacheControlMaxAge: 60 });
    return res.status(200).json({ ok: true });
  }

  if (!body || body.v !== 1 || !Array.isArray(body.daily) || typeof body.today !== 'string') return res.status(400).json({ error: 'bad_snapshot' });
  const json = JSON.stringify({ ...body, receivedAt: new Date().toISOString() 
// ⚠️ TRUNCATED — the rest of this file (~640 chars) was not returned by the Vercel API. See README.
