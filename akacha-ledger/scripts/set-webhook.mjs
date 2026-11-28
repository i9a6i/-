// يربط البوت بالرابط على Vercel ويضبط قائمة الأوامر.
// الاستخدام: TELEGRAM_BOT_TOKEN=... TELEGRAM_WEBHOOK_SECRET=... node scripts/set-webhook.mjs https://akacha-ledger.vercel.app
const [base] = process.argv.slice(2);
const { TELEGRAM_BOT_TOKEN: token, TELEGRAM_WEBHOOK_SECRET: secret } = process.env;
if (!base || !token || !secret) {
  console.error('usage: TELEGRAM_BOT_TOKEN=… TELEGRAM_WEBHOOK_SECRET=… node scripts/set-webhook.mjs <https://your-app.vercel.app>');
  process.exit(1);
}
const call = async (method, body) => {
  const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
  const j = await r.json();
  console.log(method, j.ok ? 'ok' : j.description);
};
await call('setWebhook', {
  url: `${base.replace(/\/$/, '')}/api/telegram`,
  secret_token: secret,
  allowed_updates: ['message', 'callback_query'],
  drop_pending_updates: true,
});
await call('setMyCommands', {
  commands: [
    { command: 'today', description: 'دخل اليوم والسحوبات' },
    { command: 'month', description: 'ملخص الشهر حسب الفئة' },
    { command: 'help', description: 'طريقة الاستخدام' },
  ],
});
