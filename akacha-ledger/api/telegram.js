// POST /api/telegram — webhook بوت المصاريف.
// يقبل فقط طلبات تيليجرام (secret_token) ومن المستخدمين في ALLOWED_USER_IDS.
import { timingSafeEqual } from 'node:crypto';
import { parseMessage } from '../lib/parse.js';
import { categoryName } from '../lib/categories.js';
import { addExpense, removeExpense, listExpenses, setManualIncome, manualIncome } from '../lib/store.js';
import { fetchSnapshot, incomeByDate } from '../lib/income.js';
import { dayReport, monthReport, money, HELP } from '../lib/report.js';
import { riyadhDate, riyadhTime, monthOf } from '../lib/time.js';
import { tg, reply } from '../lib/tg.js';

const allowed = () =>
  new Set(String(process.env.ALLOWED_USER_IDS ?? '').split(',').map((s) => s.trim()).filter(Boolean));

function sameSecret(given, expected) {
  if (!expected || typeof given !== 'string') return false;
  const a = Buffer.from(given), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

const who = (from) => [from?.first_name, from?.last_name].filter(Boolean).join(' ') || String(from?.id);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!sameSecret(String(req.headers['x-telegram-bot-api-secret-token'] ?? ''), process.env.TELEGRAM_WEBHOOK_SECRET)) {
    return res.status(401).end();
  }
  const update = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  try {
    if (update?.callback_query) await onCallback(update.callback_query);
    else if (update?.message?.text) await onMessage(update.message);
  } catch (err) {
    console.error(err);
    const chat = update?.message?.chat?.id ?? update?.callback_query?.message?.chat?.id;
    if (chat) await reply(chat, '⚠️ صار خطأ، ما انحفظ شي. جرّب مرة ثانية.');
  }
  // دائماً 200 عشان تيليجرام ما يعيد إرسال نفس الرسالة.
  return res.status(200).json({ ok: true });
}

async function onMessage(msg) {
  const chat = msg.chat.id;
  if (!allowed().has(String(msg.from?.id))) {
    // يعطي الشخص رقمه عشان تضيفه في ALLOWED_USER_IDS، وما يسوي أي شي ثاني.
    return reply(chat, `هذا البوت خاص. رقمك: \`${msg.from?.id}\``);
  }
  const p = parseMessage(msg.text);
  const today = riyadhDate();

  switch (p.kind) {
    case 'help':
    case 'unknown':
      return reply(chat, HELP);

    case 'bad':
      return reply(chat, p.reason === 'no_note'
        ? 'اكتب سبب السحب بعد المبلغ، مثلاً: `سحب 350 غيمة`'
        : 'ما فهمت المبلغ. مثال: `سحب 350 غيمة`');

    case 'expense': {
      const e = await addExpense({
        date: today, at: new Date().toISOString(), amount: p.amount, note: p.note,
        categoryId: p.category.id, by: who(msg.from), byId: msg.from.id,
      });
      return reply(chat,
        `✅ تم: *${money(e.amount)}* · ${p.category.group} ← ${p.category.name}\n📝 ${e.note}\n👤 ${e.by} · ${riyadhTime()}`,
        { reply_markup: { inline_keyboard: [[{ text: '↩️ تراجع', callback_data: `u:${monthOf(today)}:${e.id}` }]] } });
    }

    case 'income':
      await setManualIncome(today, p.amount, who(msg.from));
      return reply(chat, `💰 تم تسجيل دخل اليوم (${today}): *${money(p.amount)}*`);

    case 'today': {
      const [expenses, auto, manual] = await Promise.all([
        listExpenses(today), fetchSnapshot().then(incomeByDate), manualIncome(monthOf(today)),
      ]);
      return reply(chat, dayReport(today, manual[today] ?? auto[today] ?? null, expenses));
    }

    case 'month': {
      const month = p.month ?? monthOf(today);
      const [expenses, auto, manual] = await Promise.all([
        listExpenses(month), fetchSnapshot().then(incomeByDate), manualIncome(month),
      ]);
      return reply(chat, monthReport(month, { ...auto, ...manual }, expenses));
    }
  }
}

async function onCallback(cq) {
  if (!allowed().has(String(cq.from?.id))) return tg('answerCallbackQuery', { callback_query_id: cq.id });
  const m = String(cq.data ?? '').match(/^u:(\d{4}-\d{2}):([0-9a-f]{24})$/);
  if (!m) return tg('answerCallbackQuery', { callback_query_id: cq.id });
  const removed = await removeExpense(m[1], m[2]);
  await tg('answerCallbackQuery', { callback_query_id: cq.id, text: removed ? 'انحذف' : 'محذوف من قبل' });
  if (removed) {
    await tg('editMessageText', {
      chat_id: cq.message.chat.id, message_id: cq.message.message_id, parse_mode: 'Markdown',
      text: `~ملغي~ ↩️ ${money(removed.amount)} · ${categoryName(removed.categoryId)} · ${removed.note}\n(ألغاه ${who(cq.from)})`,
    });
  }
}
