// GET /api/data — latest KPI snapshot for the dashboard (header x-dash-key: DASH_KEY).
import { list } from '@vercel/blob';
import { sameSecret, SNAPSHOT_PREFIX } from './_auth.js';

export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });
  if (!sameSecret(String(req.headers['x-dash-key'] ?? ''), process.env.DASH_KEY)) return res.status(401).json({ error: 'unauthorized' });

  const { blobs } = await list({ prefix: SNAPSHOT_PREFIX });
  if (!blobs.length) return res.status(404).json({ error: 'no_data_yet' });
  const latest = blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))[0];
  const r = await fetch(latest.url, { cache: 'no-store' });
  if (!r.ok) return res.status(502).json({ error: 'storage_unavailable' });
  res.setHeader('content-type', 'application/json; charset=utf-8');
  return res.status(200).send(await r.text());
}
