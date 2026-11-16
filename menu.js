// منيو BNY — عدّل الأسعار والأصناف من هنا (أو من الإعدادات داخل النظام)
// الصور في مجلد img/ — استبدل الملف بنفس الاسم لتغيير الصورة لاحقاً
window.CATEGORIES = [
  { id: 'hot', name: 'حار' },
  { id: 'cold', name: 'بارد' },
  { id: 'sweet', name: 'حلا' },
  { id: 'food', name: 'أكل' },
];

window.MENU = [
  // HOT
  { id: 'h-espresso', icon: '☕', cat: 'hot', name: 'إسبريسو', price: 10 },
  { id: 'h-americano', icon: '☕', cat: 'hot', name: 'أمريكانو', price: 10 },
  { id: 'h-cortado', icon: '☕', cat: 'hot', name: 'كورتادو', price: 12 },
  { id: 'h-flatwhite', icon: '☕', cat: 'hot', name: 'فلات وايت', price: 13 },
  { id: 'h-cappuccino', icon: '☕', cat: 'hot', name: 'كابوتشينو', price: 14 },
  { id: 'h-latte', icon: '☕', cat: 'hot', name: 'لاتيه', price: 13 },
  { id: 'h-turkish', icon: '🫖', cat: 'hot', name: 'قهوة تركية', price: 8 },
  { id: 'h-italian', icon: '☕', cat: 'hot', name: 'ايطالي', price: 10 },
  { id: 'h-hotchoc', icon: '🍫', cat: 'hot', name: 'هوت تشوكليت', price: 10 },
  { id: 'h-v60', icon: '⏳', cat: 'hot', name: 'V60 حار', price: 14 },
  // COLD
  { id: 'c-freddo', icon: '🧊', cat: 'cold', name: 'إسبريسو فريدو', price: 11 },
  { id: 'c-spanish', icon: '🥛', cat: 'cold', name: 'سبانش لاتيه', price: 15 },
  { id: 'c-latte', icon: '🧋', cat: 'cold', name: 'آيس لاتيه', price: 13 },
  { id: 'c-americano', icon: '🥤', cat: 'cold', name: 'آيس أمريكانو', price: 11 },
  { id: 'c-matcha', icon: '🍵', cat: 'cold', name: 'ماتشا', price: 14 },
  { id: 'c-mojito', icon: '🍹', cat: 'cold', name: 'موهيتو', price: 10 },
  { id: 'c-karkade', icon: '🌺', cat: 'cold', name: 'كركديه', price: 8 },
  { id: 'c-v60', icon: '⏳', cat: 'cold', name: 'Iced V60', price: 15 },
  { id: 'c-today', icon: '🥤', cat: 'cold', name: 'قهوة اليوم', price: 8 },
  { id: 'c-redeye', icon: '⚡', cat: 'cold', name: 'ريد آي', price: 22 },
  // SWEETS
  { id: 's-brownie-madrid', cat: 'sweet', name: 'حلا براوني مدريد', price: 15, img: 'brownie-madrid.jpg' },
  { id: 's-goldest', cat: 'sweet', name: 'جولدست', price: 15, img: 'goldest.jpg' },
  { id: 's-cheese-madrid', cat: 'sweet', name: 'تشيز مدريد', price: 15, img: 'cheese-madrid.jpg' },
  { id: 's-oreo', cat: 'sweet', name: 'حلا الأوريو', price: 15, img: 'oreo.jpg' },
  { id: 's-nutella', cat: 'sweet', name: 'حلا النوتيلا', price: 15, img: 'nutella.jpg' },
  { id: 's-pecan', cat: 'sweet', name: 'حلا البيكان', price: 15, img: 'pecan.jpg' },
  { id: 's-cloud', cat: 'sweet', name: 'حلا السحابة', price: 15, img: 'cloud.jpg' },
  { id: 's-milk-cake', cat: 'sweet', name: 'كيكة حليب', price: 15, img: 'milk-cake.jpg' },
  { id: 's-basbousa', cat: 'sweet', name: 'بسبوسة', price: 15, img: 'basbousa.jpg' },
  { id: 's-crunchy', cat: 'sweet', name: 'كرانشي تشوكليت', price: 15, img: 'crunchy-chocolate.jpg' },
  { id: 's-ivy', cat: 'sweet', name: 'إيفاي سويت', price: 14, img: 'ivy-sweet.jpg' },
  { id: 's-jawza', cat: 'sweet', name: 'حلا الجوزاء', price: 14, img: 'jawza.jpg' },
  { id: 's-glory', cat: 'sweet', name: 'قلوري كلاسيك', price: 14, img: 'glory-classic.jpg' },
  { id: 's-koja', cat: 'sweet', name: 'سويت كوجا', price: 14, img: 'sweet-koja.jpg' },
  { id: 's-kinder', cat: 'sweet', name: 'كوكيز كندر', price: 9, img: 'cookies-kinder.jpg' },
  { id: 's-cookies', cat: 'sweet', name: 'كوكيز', price: 8, img: 'cookies.jpg' },
  { id: 's-brownie', cat: 'sweet', name: 'براوني', price: 8, img: 'brownie.jpg' },
  // FOOD
  { id: 'f-benibrik', cat: 'food', name: 'بني بريك', price: 18, img: 'beni-brik.jpg' },
  { id: 'f-granola', cat: 'food', name: 'جرانولا', price: 11, img: 'granola.jpg' },
  { id: 'f-sandwich', cat: 'food', name: 'ساندويش', price: 12, img: 'sandwich.jpg' },
];
