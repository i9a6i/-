// GET /api/setup — يربط البوت بتيليجرام (setWebhook + قائمة الأوامر) ويفحص الإعدادات.
// آمن بدون مفتاح: يربط البوت بنفس هذا الموقع وبنفس السر المحفوظ، فتكراره ما يغيّر شي،
// وما يرجع أي قيمة سرية (بس هل كل متغير موجود أو لا).
import { tg } from '../lib/tg.js';

export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');
  if (req.method !== 'GET') return res.status(405).end();

  const env = Object.fromEntries(
    ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_WEBHOOK_SECRET', 'ALLOWED_USER_IDS', 'BLOB_READ_WRITE_TOKEN', 'PULSE_URL', 'PULSE_DASH_KEY']
      .map((k) => [k, Boolean(process.env[k])]),
  );
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_WEBHOOK_SECRET) return res.status(200).json({ ok: false, env, error: 'missing env' });

  const me = await tg('getMe', {});
  const hook = await tg('setWebhook', {
    url: `https://${req.headers.host}/api/telegram`,
    secret_token: process.env.TELEGRAM_WEBHOOK_SECRET,
    allowed_updates: ['message', 'callback_query'],
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
