import { timingSafeEqual } from 'node:crypto';

/** Constant-time string compare (false when the expected secret is not configured). */
export function sameSecret(given, expected) {
  if (!expected || typeof given !== 'string') return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const SNAPSHOT_PREFIX = 'kpi/snapshot';

/** Site files kept in Blob (published from the till with publish.mjs) and served by /api/page. */
export const SITE_FILES = {
  'index.html': { type: 'text/html; charset=utf-8', cache: 'no-cache' },
  'app.js': { type: 'text/javascript; charset=utf-8', cache: 'no-cache' },
  'styles.css': { type: 'text/css; charset=utf-8', cache: 'no-cache' },
  'logo-dark.png': { type: 'image/png', cache: 'public, max-age=86400' },
  'logo-light.png': { type: 'image/png', cache: 'public, max-age=86400' },
};
