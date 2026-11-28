// الدخل التلقائي: يقرأ آخر ملخص أرسله الكاشير إلى akacha-pulse (GET /api/data).
//
// ⚠️ شكل البيانات داخل الملخص ما شفته (مخزن في Blob مشروع akacha-pulse). الكود يدوّر في
// snapshot.daily على صف تاريخه = اليوم، ويأخذ أول حقل رقمي من القائمة INCOME_KEYS.
// أول ما تشغّل البوت جرّب «اليوم»؛ إذا الدخل طلع «غير متوفر» عدّل INCOME_KEYS / DATE_KEYS
// حسب أسماء الحقول الحقيقية، أو اكتب الدخل يدوياً بأمر «دخل 10000».
const DATE_KEYS = ['date', 'day', 'd', 'businessDate'];
const INCOME_KEYS = ['net', 'netSales', 'total', 'sales', 'revenue', 'gross', 'amount'];

export async function fetchSnapshot() {
  const base = process.env.PULSE_URL;
  const key = process.env.PULSE_DASH_KEY;
  if (!base || !key) return null;
  try {
    const r = await fetch(`${base.replace(/\/$/, '')}/api/data`, {
      headers: { 'x-dash-key': key }, cache: 'no-store', signal: AbortSignal.timeout(5000),
    });
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
}

/** { 'YYYY-MM-DD': amount } لكل الأيام الموجودة في الملخص. */
export function incomeByDate(snapshot) {
  const out = {};
  if (!snapshot || !Array.isArray(snapshot.daily)) return out;
  for (const row of snapshot.daily) {
    if (!row || typeof row !== 'object') continue;
    const date = DATE_KEYS.map((k) => row[k]).find((v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v));
    const amount = INCOME_KEYS.map((k) => row[k]).find((v) => typeof v === 'number' && Number.isFinite(v));
    if (date && amount !== undefined) out[date.slice(0, 10)] = amount;
  }
  return out;
}
