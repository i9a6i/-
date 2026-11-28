import { categorize } from './categories.js';

const AR_DIGITS = { '٠': 0, '١': 1, '٢': 2, '٣': 3, '٤': 4, '٥': 5, '٦': 6, '٧': 7, '٨': 8, '٩': 9,
  '۰': 0, '۱': 1, '۲': 2, '۳': 3, '۴': 4, '۵': 5, '۶': 6, '۷': 7, '۸': 8, '۹': 9 };

/** يحوّل الأرقام العربية إلى إنجليزية ويشيل فواصل الآلاف. */
export function normalizeDigits(s) {
  return s
    .replace(/[٠-٩۰-۹]/g, (c) => String(AR_DIGITS[c]))
    .replace(/٫/g, '.')
    .replace(/(\d)[,٬](?=\d{3}\b)/g, '$1');
}

const WITHDRAW = /^(سحب|صرف|مصروف|خصم)\s*/;
const INCOME = /^(دخل|ايراد|إيراد)\s*/;

/**
 * يفهم رسالة واحدة من تيليجرام.
 *  "سحب 350 غيمة"            → { kind:'expense', amount:350, category, note:'غيمة' }
 *  "350 بلاستيك أكواب"        → { kind:'expense', ... }   (كلمة سحب اختيارية)
 *  "دخل 10000"                → { kind:'income', amount:10000 }
 *  "اليوم" أو /today          → { kind:'today' }
 *  "الشهر" أو /month          → { kind:'month' }
 *  "الشهر 2026-10" أو /month 2026-10 → { kind:'month', month:'2026-10' }
 */
export function parseMessage(raw) {
  const text = normalizeDigits(String(raw ?? '')).trim();
  if (!text) return { kind: 'unknown' };

  const cmd = text.replace(/@\w+/, ''); // /today@MyBot
  if (/^\/start\b/.test(cmd) || /^(\/help|مساعدة|مساعده)$/.test(cmd)) return { kind: 'help' };
  if (/^(\/today|اليوم)$/.test(cmd)) return { kind: 'today' };
  const m = cmd.match(/^(\/month|الشهر)(?:\s+(\d{4})-(\d{1,2}))?$/);
  if (m) return { kind: 'month', month: m[2] ? `${m[2]}-${m[3].padStart(2, '0')}` : undefined };

  if (INCOME.test(text)) {
    const amount = firstNumber(text.replace(INCOME, ''));
    return amount ? { kind: 'income', amount } : { kind: 'bad', reason: 'no_amount' };
  }

  const body = text.replace(WITHDRAW, '');
  const num = body.match(/\d+(?:\.\d+)?/);
  if (!num) return { kind: WITHDRAW.test(text) ? 'bad' : 'unknown', reason: 'no_amount' };
  const amount = Number(num[0]);
  if (!(amount > 0) || amount > 1_000_000) return { kind: 'bad', reason: 'amount_range' };
  const note = (body.slice(0, num.index) + ' ' + body.slice(num.index + num[0].length))
    .replace(/(^|\s)(ريال|ر\.س|رس|sar|rs)(?=\s|$)/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!note) return { kind: 'bad', reason: 'no_note' };
  return { kind: 'expense', amount, note, category: categorize(note) };
}

function firstNumber(s) {
  const n = s.match(/\d+(?:\.\d+)?/);
  return n ? Number(n[0]) : null;
}
