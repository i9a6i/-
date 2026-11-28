// الفئات. أي سحب ما يطابق حلى من الحلويات ينسجل في «مستلزمات».
// لإضافة حلى جديد: أضف سطر هنا بكلمات البحث اللي تكتبونها عادةً.

export const DESSERTS = [
  { id: 'madrid', name: 'تشيز مدريد بيكان', words: ['مدريد', 'بيكان', 'madrid', 'pecan'] },
  { id: 'ghaima', name: 'حلا غيمة', words: ['غيمة', 'غيمه', 'ghaima'] },
  { id: 'basbousa', name: 'بسبوسة أكاتشا', words: ['بسبوسة', 'بسبوسه', 'basbousa'] },
  { id: 'maqlouba', name: 'مقلوبة التشيز كيك', words: ['مقلوبة', 'مقلوبه', 'تشيز كيك', 'تشيزكيك', 'cheesecake'] },
];

export const SUPPLIES = { id: 'supplies', name: 'مستلزمات' };

export const GROUP_DESSERTS = 'حلويات';
export const GROUP_SUPPLIES = 'مستلزمات';

const norm = (s) =>
  s.toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/\s+/g, ' ').trim();

/** يرجع { id, name, group } للنص المكتوب. */
export function categorize(text) {
  const t = norm(text);
  for (const d of DESSERTS) {
    if (d.words.some((w) => t.includes(norm(w)))) return { id: d.id, name: d.name, group: GROUP_DESSERTS };
  }
  return { id: SUPPLIES.id, name: SUPPLIES.name, group: GROUP_SUPPLIES };
}

export function categoryName(id) {
  return DESSERTS.find((d) => d.id === id)?.name ?? SUPPLIES.name;
}

export function groupOf(id) {
  return DESSERTS.some((d) => d.id === id) ? GROUP_DESSERTS : GROUP_SUPPLIES;
}
