// التخزين في Vercel Blob:
//   ledger/<YYYY-MM>/<YYYY-MM-DD>_<id>.json   سحبة واحدة
//   income/<YYYY-MM-DD>.json                  دخل مكتوب يدوياً (يغلب الرقم التلقائي)
// المعرّف عشوائي (96 بت) فرابط الملف ما ينخمّن.
import { put, list, del } from '@vercel/blob';
import { randomBytes } from 'node:crypto';

const OPTS = { access: 'public', contentType: 'application/json; charset=utf-8', cacheControlMaxAge: 60 };

export async function addExpense(entry) {
  const id = randomBytes(12).toString('hex');
  const record = { id, ...entry };
  await put(`ledger/${entry.date.slice(0, 7)}/${entry.date}_${id}.json`, JSON.stringify(record), {
    ...OPTS, addRandomSuffix: false,
  });
  return record;
}

export async function removeExpense(month, id) {
  const blobs = await listAll(`ledger/${month}/`);
  const hit = blobs.find((b) => b.pathname.endsWith(`_${id}.json`));
  if (!hit) return null;
  const record = await readJson(hit.url);
  await del(hit.url);
  return record;
}

/** كل سحوبات شهر أو يوم (prefix: '2026-11' أو '2026-11-28'). */
export async function listExpenses(prefix) {
  const month = prefix.slice(0, 7);
  const blobs = (await listAll(`ledger/${month}/`)).filter((b) => b.pathname.startsWith(`ledger/${month}/${prefix}`));
  const out = [];
  for (let i = 0; i < blobs.length; i += 20) {
    out.push(...(await Promise.all(blobs.slice(i, i + 20).map((b) => readJson(b.url)))));
  }
  return out.filter(Boolean).sort((a, b) => a.at.localeCompare(b.at));
}

export async function setManualIncome(date, amount, by) {
  await put(`income/${date}.json`, JSON.stringify({ date, amount, by, at: new Date().toISOString() }), {
    ...OPTS, addRandomSuffix: false, allowOverwrite: true,
  });
}

/** { 'YYYY-MM-DD': amount } للدخل اليدوي في شهر. */
export async function manualIncome(month) {
  const blobs = await listAll(`income/${month}`);
  const rows = await Promise.all(blobs.map((b) => readJson(b.url)));
  return Object.fromEntries(rows.filter(Boolean).map((r) => [r.date, r.amount]));
}

async function listAll(prefix) {
  const blobs = [];
  let cursor;
  do {
    const r = await list({ prefix, cursor, limit: 1000 });
    blobs.push(...r.blobs);
    cursor = r.hasMore ? r.cursor : undefined;
  } while (cursor);
  return blobs;
}

async function readJson(url) {
  const r = await fetch(`${url}?t=${Date.now()}`, { cache: 'no-store' });
  return r.ok ? r.json() : null;
}
