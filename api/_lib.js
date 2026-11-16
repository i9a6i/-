// أدوات مشتركة لدوال /api (الملفات التي تبدأ بـ _ لا تصبح مسارات على Vercel)
const crypto = require('crypto');

const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TG_BASE = process.env.TELEGRAM_API_BASE || 'https://api.telegram.org'; // قابل للتغيير في الاختبارات فقط
const TZ = 'Asia/Riyadh';
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

async function redis(commands) {
  const res = await fetch(REDIS_URL + '/pipeline', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + REDIS_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands),
  });
  if (!res.ok) throw new Error('redis ' + res.status);
  const out = await res.json();
  for (const r of out) if (r.error) throw new Error('redis: ' + r.error);
  return out.map((r) => r.result);
}

function keyOk(req) {
  const want = process.env.POS_KEY || '';
  const got = String(req.headers['x-pos-key'] || '');
  if (!want || got.length !== want.length) return false;
  return crypto.timingSafeEqual(Buffer.from(got), Buffer.from(want));
}

// يتحقق من الإعداد والرمز؛ يرجع false بعد إرسال الرد إن كان هناك خطأ
function guard(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!REDIS_URL || !REDIS_TOKEN) { res.status(503).json({ error: 'storage_not_configured' }); return false; }
  if (!process.env.POS_KEY) { res.status(503).json({ error: 'pos_key_not_configured' }); return false; }
  if (!keyOk(req)) { res.status(401).json({ error: 'bad_key' }); return false; }
  return true;
}

const fmt = (n) => { const v = Math.round(Number(n || 0) * 100) / 100; return Number.isInteger(v) ? String(v) : v.toFixed(2); };
const clock = (ts) => new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(ts || Date.now()));
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

async function dayOrders(day) {
  const [flat] = await redis([['HGETALL', 'orders:' + day]]);
  const list = [];
  for (let i = 1; i < (flat || []).length; i += 2) list.push(JSON.parse(flat[i]));
  return list;
}

// مؤشرات اليوم من الطلبات المحفوظة في السحابة
function dayStats(list) {
  const ok = list.filter((o) => !o.void);
  const sum = (a) => a.reduce((s, o) => s + Number(o.total || 0), 0);
  const counts = {};
  for (const o of ok) for (const l of o.items || []) counts[l.name] = (counts[l.name] || 0) + Number(l.qty || 0);
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3);
  return {
    n: ok.length, voids: list.length - ok.length, total: sum(ok),
    cash: sum(ok.filter((o) => o.pay === 'cash')), card: sum(ok.filter((o) => o.pay === 'card')),
    avg: ok.length ? sum(ok) / ok.length : 0, top,
  };
}

function statsLine(s) {
  return `📊 اليوم: ${s.n} طلب | ${fmt(s.total)} ر.س\n💵 كاش ${fmt(s.cash)} | 💳 شبكة ${fmt(s.card)}` + (s.voids ? ` | ❌ ملغي ${s.voids}` : '');
}

function summaryText(day, s) {
  const lines = [`📈 ملخص يوم ${day}`, '', `عدد الطلبات: ${s.n}`, `إجمالي المبيعات: ${fmt(s.total)} ر.س`,
    `كاش: ${fmt(s.cash)} ر.س`, `شبكة: ${fmt(s.card)} ر.س`, `متوسط الطلب: ${fmt(s.avg)} ر.س`];
  if (s.voids) lines.push(`طلبات ملغاة: ${s.voids}`);
  if (s.top.length) lines.push('', 'الأكثر طلباً:', ...s.top.map(([n, q], i) => `${i + 1}. ${n} — ${q}`));
  return lines.join('\n');
}

async function tgChatId() {
  if (process.env.TELEGRAM_CHAT_ID) return process.env.TELEGRAM_CHAT_ID;
  const [id] = await redis([['GET', 'tg:chat']]);
  return id || '';
}

async function tg(method, body) {
  const res = await fetch(`${TG_BASE}/bot${TG_TOKEN}/${method}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}),
  });
  const out = await res.json().catch(() => ({}));
  if (!out.ok) throw new Error('telegram: ' + (out.description || res.status));
  return out.result;
}

async function tgSend(text, chatId) {
  const id = chatId || (await tgChatId());
  if (!TG_TOKEN || !id) return false;
  await tg('sendMessage', { chat_id: id, text, disable_web_page_preview: true });
  return true;
}

module.exports = { redis, guard, fmt, clock, today, dayOrders, dayStats, statsLine, summaryText, tg, tgSend, tgChatId, DAY_RE, TG_TOKEN };
