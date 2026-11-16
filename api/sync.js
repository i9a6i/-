// مزامنة بيانات الكاشير مع السحابة (Upstash Redis عبر واجهة REST)
//
// POST /api/sync  { events: [...] }   يحفظ الطلبات والإلغاءات وتعديلات المنيو
// GET  /api/sync?day=YYYY-MM-DD       يرجع طلبات اليوم + آخر سجل التحديثات + تعديلات المنيو
//
// كل الطلبات تحتاج الترويسة x-pos-key مطابقة لمتغير البيئة POS_KEY.
//
// التخزين:
//   orders:<day>  (hash)  رقم الطلب الداخلي -> JSON الطلب (الإلغاء يحدّث نفس الحقل)
//   log           (list)  أحدث 2000 حدث، الأحدث أولاً
//   menu          (string) JSON تعديلات المنيو الحالية
//   seen          (set)   معرّفات الأحداث المحفوظة، حتى لا يتكرر الحدث عند إعادة الإرسال

const crypto = require('crypto');

const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_EVENTS = 200;
const LOG_KEEP = 2000;

async function redis(commands) {
  const res = await fetch(URL_ + '/pipeline', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json' },
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

// سطر مختصر يظهر في سجل التحديثات
function summary(ev) {
  const d = ev.data || {};
  if (ev.type === 'order') return `طلب #${d.no}${d.pager ? ' بيجر ' + d.pager : ''} — ${d.total} ر.س (${d.pay === 'card' ? 'شبكة' : 'كاش'})`;
  if (ev.type === 'void') return `إلغاء الطلب #${d.no}`;
  if (ev.type === 'menu') return d.text || 'تعديل المنيو';
  return ev.type;
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!URL_ || !TOKEN) return res.status(503).json({ error: 'storage_not_configured' });
  if (!process.env.POS_KEY) return res.status(503).json({ error: 'pos_key_not_configured' });
  if (!keyOk(req)) return res.status(401).json({ error: 'bad_key' });

  try {
    if (req.method === 'GET') {
      const day = String(req.query.day || '');
      if (!DAY_RE.test(day)) return res.status(400).json({ error: 'bad_day' });
      const [flat, log, menu] = await redis([
        ['HGETALL', 'orders:' + day],
        ['LRANGE', 'log', '0', '99'],
        ['GET', 'menu'],
      ]);
      const orders = [];
      for (let i = 1; i < (flat || []).length; i += 2) orders.push(JSON.parse(flat[i]));
      return res.status(200).json({
        orders: orders.sort((a, b) => b.ts - a.ts),
        log: (log || []).map((s) => JSON.parse(s)),
        menu: menu ? JSON.parse(menu) : {},
      });
    }

    if (req.method === 'POST') {
      const events = (req.body && req.body.events) || [];
      if (!Array.isArray(events) || events.length > MAX_EVENTS) return res.status(400).json({ error: 'bad_events' });
      const valid = events.filter((e) => e && typeof e.id === 'string' && e.id.length <= 64 && ['order', 'void', 'menu'].includes(e.type));
      if (!valid.length) return res.status(200).json({ saved: [] });

      // تخطَّ ما حُفظ سابقاً. يُعلَّم الحدث كمحفوظ في نفس دفعة الكتابة، فإن فشلت يُعاد إرساله لاحقاً
      const seen = await redis(valid.map((e) => ['SISMEMBER', 'seen', e.id]));
      const cmds = [];
      valid.forEach((e, i) => {
        if (seen[i]) return;
        cmds.push(['SADD', 'seen', e.id]);
        const d = e.data || {};
        if ((e.type === 'order' || e.type === 'void') && DAY_RE.test(d.day || '') && typeof d.id === 'string') {
          cmds.push(['HSET', 'orders:' + d.day, d.id, JSON.stringify(d)]);
        }
        if (e.type === 'menu' && d.overrides && typeof d.overrides === 'object') {
          cmds.push(['SET', 'menu', JSON.stringify(d.overrides)]);
        }
        cmds.push(['LPUSH', 'log', JSON.stringify({ id: e.id, type: e.type, ts: e.ts || Date.now(), text: summary(e) })]);
      });
      if (cmds.length) {
        cmds.push(['LTRIM', 'log', '0', String(LOG_KEEP - 1)]);
        await redis(cmds);
      }
      return res.status(200).json({ saved: valid.map((e) => e.id) });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  } catch (err) {
    console.error(err);
    return res.status(502).json({ error: 'storage_error' });
  }
};
