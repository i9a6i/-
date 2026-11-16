// إعداد بوت تيليجرام وإرسال الملخصات
//
// POST /api/telegram { action }
//   status   هل التوكن مضبوط؟ هل المحادثة مربوطة؟ واسم البوت
//   link     يربط آخر محادثة خاصة أرسلت رسالة للبوت (اكتب /start للبوت أولاً)
//   test     يرسل رسالة تجريبية
//   summary  يرسل ملخص اليوم { day }
//
// يحتاج الترويسة x-pos-key. توكن البوت في متغير البيئة TELEGRAM_BOT_TOKEN فقط، ولا يصل للمتصفح.

const L = require('./_lib');

module.exports = async (req, res) => {
  if (!L.guard(req, res)) return;
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'method_not_allowed' }); }
  if (!L.TG_TOKEN) return res.status(503).json({ error: 'telegram_not_configured' });
  const action = String((req.body && req.body.action) || '');

  try {
    if (action === 'status') {
      const me = await L.tg('getMe');
      return res.status(200).json({ bot: me.username, linked: !!(await L.tgChatId()) });
    }

    if (action === 'link') {
      const updates = await L.tg('getUpdates', { limit: 100, allowed_updates: ['message'] });
      const msgs = updates.map((u) => u.message).filter((m) => m && m.chat && m.chat.type === 'private');
      const last = msgs[msgs.length - 1];
      if (!last) return res.status(404).json({ error: 'no_private_message' });
      await L.redis([['SET', 'tg:chat', String(last.chat.id)]]);
      const name = [last.chat.first_name, last.chat.last_name].filter(Boolean).join(' ') || last.chat.username || '';
      await L.tgSend('✅ تم ربط Bunni POS بهذه المحادثة. ستصلك هنا كل عمليات الكاشير ومؤشرات اليوم.', String(last.chat.id));
      return res.status(200).json({ linked: true, name });
    }

    if (action === 'test') {
      const sent = await L.tgSend(`🔔 رسالة تجريبية من Bunni POS — ${L.clock()}`);
      return sent ? res.status(200).json({ sent: true }) : res.status(409).json({ error: 'not_linked' });
    }

    if (action === 'summary') {
      const day = String((req.body && req.body.day) || L.today());
      if (!L.DAY_RE.test(day)) return res.status(400).json({ error: 'bad_day' });
      const sent = await L.tgSend(L.summaryText(day, L.dayStats(await L.dayOrders(day))));
      return sent ? res.status(200).json({ sent: true }) : res.status(409).json({ error: 'not_linked' });
    }

    return res.status(400).json({ error: 'bad_action' });
  } catch (err) {
    console.error(err);
    return res.status(502).json({ error: 'telegram_error', detail: String(err.message || '').replace(/bot\d+:[\w-]+/g, 'bot***') });
  }
};
