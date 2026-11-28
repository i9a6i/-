// GET /, /app.js, /styles.css, /logo-*.png (rewritten to /api/page?f=...) — the site files live in Blob.
import { list } from '@vercel/blob';
import { SITE_FILES } from './_auth.js';

export default async function handler(req, res) {
  const f = String(req.query?.f ?? 'index.html');
  const meta = SITE_FILES[f];
  if (!meta) return res.status(404).send('not found');
  const { blobs } = await list({ prefix: `site/${f}` });
  const blob = blobs.find((b) => b.pathname === `site/${f}`);
  if (!blob) return res.status(503).send('الموقع لم يُنشر بعد');
  const r = await fetch(`${blob.url}?v=${new Date(blob.uploadedAt).getTime()}`, { cache: 'no-store' });
  if (!r.ok) return res.status(502).send('storage unavailable');
  res.setHeader('content-type', meta.type);
  res.setHeader('cache-control', meta.cache);
  return res.status(200).send(Buffer.from(await r.arrayBuffer()));
}
