// مزامنة بيانات الكاشير مع السحابة (Upstash Redis عبر واجهة REST) + إشعارات تيليجرام
//
// POST /api/sync  { events: [...] }   يحفظ فتح الكاشير والطلبات والإلغاءات وتعديلات المنيو
// GET  /api/sync?day=YYYY-MM-DD       يرجع طلبات اليوم + آخر سجل التحديثات + تعديلات المنيو
//
// كل الطلبات تحتاج الترويسة x-pos-key مطابقة لمتغير البيئة POS_KEY.
//
// التخزين:
//   orders:<day>  (hash)  رقم الطلب الداخلي -> JSON الطلب (الإلغاء يحدّث نفس الحقل)
//   log           (list)  أحدث 2000 حدث، الأحدث أولاً
//   menu          (string) JSON تعديلات المنيو الحالية
//   seen          (set)   معرّفات الأحداث المحفوظة، حتى لا يتكرر الحدث عند إعادة الإرسال

const L = require('./_lib');

const MAX_EVENTS = 200;
const LOG_KEEP = 2000;
const TYPES = ['order', 'void', 'menu', 'open'];
const PAY = { cash: 'كاش', card: 'شبكة' };

// سطر مختصر يظهر في سجل التحديثات
function summary(ev) {
  const d = ev.data || {};
  if (ev.type === 'order') return `طلب #${d.no}${d.pager ? ' بيجر ' + d.pager : ''} — ${L.fmt(d.total)} ر.س (${PAY[d.pay] || d.pay})`;
  if (ev.type === 'void') return `إلغاء الطلب #${d.no}`;
  if (ev.type === 'menu') return d.text || 'تعديل المنيو';
  if (ev.type === 'open') return 'فتح الكاشير';
  return ev.type;
}

// نص رسالة تيليجرام لكل حدث
function message(ev, stats) {
  const d = ev.data || {};
  const at = L.clock(ev.ts);
  if (ev.type === 'order') {
    const lines = [`🧾 طلب #${d.no}${d.pager ? ' — 📟 بيجر ' + d.pager : ''} — ${at}`];
    for (const l of d.items || []) lines.push(`• ${l.name} ×${l.qty} = ${L.fmt(l.price * l.qty)}`);
    if (d.disc) lines.push(`خصم: -${L.fmt(d.disc)}`);
    lines.push(`الإجمالي: ${L.fmt(d.total)} ر.س (${PAY[d.pay] || d.pay})`);
    if (d.received) lines.push(`المستلم: ${L.fmt(d.received)} — الباقي: ${L.fmt(d.change)}`);
    if (d.note) lines.push(`ملاحظة: ${d.note}`);
    return lines.join('\n') + '\n\n' + L.statsLine(stats);
  }
  if (ev.type === 'void') return `❌ إلغاء الطلب #${d.no} (${L.fmt(d.total)} ر.س) — ${at}\n\n` + L.statsLine(stats);
  if (ev.type === 'menu') return `🛠 تعديل المنيو — ${at}\n${d.text || ''}`;
  if (ev.type === 'open') return `🟢 فتح الكاشير — ${at}\n\n` + L.statsLine(stats);
  return null;
}

module.exports = async (req, res) => {
  if (!L.guard(req, res)) return;
  try {
    if (req.method === 'GET') {
      const day = String(req.query.day || '');
      if (!L.DAY_RE.test(day)) return res.status(400).json({ error: 'bad_day' });
      const [log, menu] = await L.redis([['LRANGE', 'log', '0', '99'], ['GET', 'menu']]);
      const orders = await L.dayOrders(day);
      return res.status(200).json({
        orders: orders.sort((a, b) => b.ts - a.ts),
        log: (log || []).map((s) => JSON.parse(s)),
        menu: menu ? JSON.parse(menu) : {},
      });
    }

    if (req.method === 'POST') {
      const events = (req.body && req.body.events) || [];
      if (!Array.isArray(events) || events.length > MAX_EVENTS) return res.status(400).json({ error: 'bad_events' });
      const valid = events.filter((e) => e && typeof e.id === 'string' && e.id.length <= 64 && TYPES.includes(e.type));
      if (!valid.length) return res.status(200).json({ saved: [] });

      // تخطَّ ما حُفظ سابقاً. يُعلَّم الحدث كمحفوظ في نفس دفعة الكتابة، فإن فشلت يُعاد إرساله لاحقاً
      const seen = await L.redis(valid.map((e) => ['SISMEMBER', 'seen', e.id]));
      const fresh = valid.filter((e, i) => !seen[i]);
      const cmds = [];
      for (const e of fresh) {
        const d = e.data || {};
        cmds.push(['SADD', 'seen', e.id]);
        if ((e.type === 'order' || e.type === 'void') && L.DAY_RE.test(d.day || '') && typeof d.id === 'string') {
          cmds.push(['HSET', 'orders:' + d.day, d.id, JSON.stringify(d)]);
        }
        if (e.type === 'menu' && d.overrides && typeof d.overrides === 'object') {
          cmds.push(['SET', 'menu', JSON.stringify(d.overrides)]);
        }
        cmds.push(['LPUSH', 'log', JSON.stringify({ id: e.id, type: e.type, ts: e.ts || Date.now(), text: summary(e) })]);
      }
      if (cmds.length) {
        cmds.push(['LTRIM', 'log', '0', String(LOG_KEEP - 1)]);
        await L.redis(cmds);
      }

      // إشعارات تيليجرام: فشلها لا يُفشل الحفظ
      let notified = 0;
      if (fresh.length && L.TG_TOKEN) {
        try {
          const chatId = await L.tgChatId();
          if (chatId) {
            const statsByDay = {};
            for (const e of fresh) {
              const day = (e.data && e.data.day) || L.today();
              statsByDay[day] = statsByDay[day] || L.dayStats(await L.dayOrders(day));
              const text = message(e, statsByDay[day]);
              if (text && (await L.tgSend(text, chatId))) notified++;
            }
          }
        } catch (err) {
          console.error(err);
        }
      }
      return res.status(200).json({ saved: valid.map((e) => e.id), notified });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  } catch (err) {
    console.error(err);
    return res.status(502).json({ error: 'storage_error' });
  }
};
