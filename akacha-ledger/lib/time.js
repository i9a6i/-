// كل التواريخ بتوقيت الرياض.
const TZ = 'Asia/Riyadh';

export function riyadhDate(d = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

export function riyadhTime(d = new Date()) {
  return new Intl.DateTimeFormat('ar-SA-u-nu-latn', { timeZone: TZ, hour: 'numeric', minute: '2-digit' }).format(d);
}

export const monthOf = (date) => date.slice(0, 7);
