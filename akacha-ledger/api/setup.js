// POST /api/setup — يربط البوت بتيليجرام (setWebhook + قائمة الأوامر) ويفحص الإعدادات.
// محمي بنفس TELEGRAM_WEBHOOK_SECRET في الهيدر x-setup-key. ما يرجع أي قيمة سرية.
import { timingSafeEqual } from 'node:crypto';
import { tg } from '../lib/tg.js';

const same = (a, b) => {
  if (!b || typeof a !== 'string') return false;
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');
  if (req.method !== 'POST') return res.status(405).end();
  if (!same(String(req.headers['x-setup-key'] ?? ''), process.env.TELEGRAM_WEBHOOK_SECRET)) return res.status(401).end();

  const env = Object.fromEntries(
    ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_WEBHOOK_SECRET', 'ALLOWED_USER_IDS', 'BLOB_READ_WRITE_TOKEN', 'PULSE_URL', 'PULSE_DASH_KEY']
      .map((k) => [k, Boolean(process.env[k])]),
  );
  if (!process.env.TELEGRAM_BOT_TOKEN) return res.status(200).json({ ok: false, env, error: 'missing TELEGRAM_BOT_TOKEN' });

  const me = await tg('getMe', {});
  const hook = await tg('setWebhook', {
    url: `https://${req.headers.host}/api/telegram`,
    secret_token: process.env.TELEGRAM_WEBHOOK_SECRET,
    allowed_updates: ['message', 'callback_query'],
    drop_pending_updates: true,
  });
  await tg('setMyCommands', {
    commands: [
      { command: 'today', description: 'دخل اليوم والسحوبات' },
      { command: 'month', description: 'ملخص الشهر حسب الفئة' },
      { command: 'help', description: 'طريقة الاستخدام' },
    ],
  });
  return res.status(200).json({
    ok: Boolean(me.ok && hook.ok), env, bot: me.result?.username ?? null, webhook: hook.ok ? 'set' : hook.description,
  });
}
