import { DESSERTS, SUPPLIES, GROUP_DESSERTS, GROUP_SUPPLIES, groupOf } from './categories.js';

export const money = (n) => `${Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 })} ر.س`;

/** يجمع السحوبات حسب الفئة. */
export function totals(expenses) {
  const byCat = {};
  let all = 0;
  for (const e of expenses) {
    byCat[e.categoryId] = (byCat[e.categoryId] ?? 0) + e.amount;
    all += e.amount;
  }
  const desserts = DESSERTS.reduce((s, d) => s + (byCat[d.id] ?? 0), 0);
  return { byCat, all, desserts, supplies: byCat[SUPPLIES.id] ?? 0 };
}

function categoryLines(t) {
  const lines = [`🍰 *${GROUP_DESSERTS}*: ${money(t.desserts)}`];
  for (const d of [...DESSERTS].sort((a, b) => (t.byCat[b.id] ?? 0) - (t.byCat[a.id] ?? 0))) {
    if (t.byCat[d.id]) lines.push(`   • ${d.name}: ${money(t.byCat[d.id])}`);
  }
  lines.push(`🧰 *${GROUP_SUPPLIES}*: ${money(t.supplies)}`);
  return lines;
}

const incomeLine = (income) =>
  income == null ? '💰 الدخل: غير متوفر (اكتب: دخل 10000)' : `💰 الدخل: ${money(income)}`;

export function dayReport(date, income, expenses) {
  const t = totals(expenses);
  const lines = [`📅 *${date}*`, incomeLine(income), `💸 السحوبات: ${money(t.all)} (${expenses.length})`];
  if (income != null) lines.push(`✅ الصافي: ${money(income - t.all)}`);
  lines.push('', ...categoryLines(t));
  if (expenses.length) {
    lines.push('', '*التفاصيل:*');
    for (const e of expenses) lines.push(`• ${money(e.amount)} — ${e.note} (${e.by})`);
  }
  return lines.join('\n');
}

export function monthReport(month, incomeDays, expenses) {
  const t = totals(expenses);
  const days = Object.keys(incomeDays).filter((d) => d.startsWith(month));
  const income = days.length ? days.reduce((s, d) => s + incomeDays[d], 0) : null;
  const lines = [`🗓 *شهر ${month}*`, incomeLine(income)];
  if (income != null) lines.push(`   (${days.length} يوم مسجل)`);
  lines.push(`💸 السحوبات: ${money(t.all)} (${expenses.length})`);
  if (income != null) lines.push(`✅ الصافي: ${money(income - t.all)}`);
  lines.push('', ...categoryLines(t));

  // أكثر بنود المستلزمات صرفاً، حسب الوصف
  const notes = {};
  for (const e of expenses) if (groupOf(e.categoryId) === GROUP_SUPPLIES) notes[e.note] = (notes[e.note] ?? 0) + e.amount;
  const top = Object.entries(notes).sort((a, b) => b[1] - a[1]).slice(0, 10);
  if (top.length) {
    lines.push('', '*أكثر المستلزمات:*');
    for (const [n, a] of top) lines.push(`• ${n}: ${money(a)}`);
  }

  // من سحب كم
  const byWho = {};
  for (const e of expenses) byWho[e.by] = (byWho[e.by] ?? 0) + e.amount;
  if (Object.keys(byWho).length > 1) {
    lines.push('', '*حسب الشخص:*');
    for (const [w, a] of Object.entries(byWho)) lines.push(`• ${w}: ${money(a)}`);
  }
  return lines.join('\n');
}

export const HELP = [
  '*بوت مصاريف أكاتشا* ☕',
  '',
  '*تسجيل سحب* (كلمة سحب اختيارية):',
  '`سحب 350 غيمة`',
  '`120 بلاستيك أكواب وملاعق`',
  '',
  '*الحلويات* تنفرز تلقائياً: مدريد بيكان، غيمة، بسبوسة، مقلوبة التشيز كيك.',
  'أي شي ثاني ينسجل في *مستلزمات*.',
  '',
  '*التقارير:*',
  '`اليوم` — دخل اليوم والسحوبات والصافي',
  '`الشهر` — مجموع الشهر حسب الفئة',
  '`الشهر 2026-10` — شهر معيّن',
  '',
  '*الدخل:* ينسحب تلقائياً من الكاشير. لتصحيحه يدوياً: `دخل 10000`',
].join('\n');
