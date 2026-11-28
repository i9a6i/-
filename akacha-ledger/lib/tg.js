// مساعد بسيط لـ Telegram Bot API.
export async function tg(method, payload) {
  const r = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const j = await r.json().catch(() => ({}));
  if (!j.ok) console.error(`telegram ${method} failed:`, j.description ?? r.status);
  return j;
}

export const reply = (chat_id, text, extra = {}) =>
  tg('sendMessage', { chat_id, text, parse_mode: 'Markdown', disable_web_page_preview: true, ...extra });
