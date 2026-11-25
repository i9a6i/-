// منيو BNY (الحقل en هو الاسم بالإنجليزية عند تحويل لغة الواجهة) — عدّل الأسعار والأصناف من هنا (أو من الإعدادات داخل النظام)
// الصور في مجلد img/ — استبدل الملف بنفس الاسم لتغيير الصورة لاحقاً
window.CATEGORIES = [
  { id: 'hot', en: 'Hot', name: 'حار' },
  { id: 'cold', en: 'Cold', name: 'بارد' },
  { id: 'sweet', en: 'Desserts', name: 'حلا' },
  { id: 'food', en: 'Food', name: 'أكل' },
];

window.MENU = [
  // HOT
  { id: 'h-espresso', en: 'Espresso', icon: '☕', cat: 'hot', name: 'إسبريسو', price: 10, img: 'illus/h-espresso.jpg' },
  { id: 'h-americano', en: 'Americano', icon: '☕', cat: 'hot', name: 'أمريكانو', price: 10, img: 'illus/h-americano.jpg' },
  { id: 'h-cortado', en: 'Cortado', icon: '☕', cat: 'hot', name: 'كورتادو', price: 12, img: 'illus/h-cortado.jpg' },
  { id: 'h-flatwhite', en: 'Flat White', icon: '☕', cat: 'hot', name: 'فلات وايت', price: 13, img: 'illus/h-flatwhite.jpg' },
  { id: 'h-cappuccino', en: 'Cappuccino', icon: '☕', cat: 'hot', name: 'كابوتشينو', price: 14, img: 'illus/h-cappuccino.jpg' },
  { id: 'h-latte', en: 'Latte', icon: '☕', cat: 'hot', name: 'لاتيه', price: 13, img: 'illus/h-latte.jpg' },
  { id: 'h-turkish', en: 'Turkish Coffee', icon: '🫖', cat: 'hot', name: 'قهوة تركية', price: 8, img: 'illus/h-turkish.jpg' },
  { id: 'h-italian', en: 'Italian', icon: '☕', cat: 'hot', name: 'ايطالي', price: 10, img: 'illus/h-italian.jpg' },
  { id: 'h-hotchoc', en: 'Hot Chocolate', icon: '🍫', cat: 'hot', name: 'هوت تشوكليت', price: 10, img: 'illus/h-hotchoc.jpg' },
  { id: 'h-v60', en: 'Hot V60', icon: '⏳', cat: 'hot', name: 'V60 حار', price: 14, img: 'illus/h-v60.jpg' },
  { id: 'h-spanish', en: 'Hot Spanish Latte', icon: '☕', cat: 'hot', name: 'سبانش لاتيه حار', price: 14 },
  // COLD
  { id: 'c-freddo', en: 'Espresso Freddo', icon: '🧊', cat: 'cold', name: 'إسبريسو فريدو', price: 11, img: 'illus/c-freddo.jpg' },
  { id: 'c-spanish', en: 'Iced Spanish Latte', icon: '🥛', cat: 'cold', name: 'سبانش لاتيه بارد', price: 15, img: 'illus/c-spanish.jpg' },
  { id: 'c-latte', en: 'Iced Latte', icon: '🧋', cat: 'cold', name: 'آيس لاتيه', price: 13, img: 'illus/c-latte.jpg' },
  { id: 'c-americano', en: 'Iced Americano', icon: '🥤', cat: 'cold', name: 'آيس أمريكانو', price: 11, img: 'illus/c-americano.jpg' },
  { id: 'c-matcha', en: 'Matcha', icon: '🍵', cat: 'cold', name: 'ماتشا', price: 14, img: 'illus/c-matcha.jpg' },
  { id: 'c-mojito', en: 'Mojito', icon: '🍹', cat: 'cold', name: 'موهيتو', price: 10, img: 'illus/c-mojito.jpg' },
  { id: 'c-karkade', en: 'Hibiscus', icon: '🌺', cat: 'cold', name: 'كركديه', price: 8, img: 'illus/c-karkade.jpg' },
  { id: 'c-v60', en: 'Iced V60', icon: '⏳', cat: 'cold', name: 'Iced V60', price: 15, img: 'illus/c-v60.jpg' },
  { id: 'c-today', en: 'Coffee of the Day', icon: '🥤', cat: 'cold', name: 'قهوة اليوم', price: 8, img: 'illus/c-today.jpg' },
  { id: 'c-redeye', en: 'Red Eye', icon: '⚡', cat: 'cold', name: 'ريد آي', price: 22, img: 'illus/c-redeye.jpg' },
  { id: 'c-water', en: 'Water', icon: '💧', cat: 'cold', name: 'موية', price: 1 },
  // SWEETS
  { id: 's-brownie-madrid', en: 'Brownie Madrid', cat: 'sweet', name: 'حلا براوني مدريد', price: 15, img: 'brownie-madrid.jpg' },
  { id: 's-goldest', en: 'Goldest', cat: 'sweet', name: 'جولدست', price: 15, img: 'illus/s-goldest.jpg' },
  { id: 's-cheese-madrid', en: 'Cheese Madrid', cat: 'sweet', name: 'تشيز مدريد', price: 15, img: 'cheese-madrid.jpg' },
  { id: 's-oreo', en: 'Oreo Dessert', cat: 'sweet', name: 'حلا الأوريو', price: 15, img: 'oreo.jpg' },
  { id: 's-nutella', en: 'Nutella Dessert', cat: 'sweet', name: 'حلا النوتيلا', price: 15, img: 'illus/s-nutella.jpg' },
  { id: 's-pecan', en: 'Pecan Dessert', cat: 'sweet', name: 'حلا البيكان', price: 15, img: 'illus/s-pecan.jpg' },
  { id: 's-cloud', en: 'Cloud Dessert', cat: 'sweet', name: 'حلا السحابة', price: 15, img: 'illus/s-cloud.jpg' },
  { id: 's-milk-cake', en: 'Milk Cake', cat: 'sweet', name: 'كيكة حليب', price: 15, img: 'illus/s-milk-cake.jpg' },
  { id: 's-basbousa', en: 'Basbousa', cat: 'sweet', name: 'بسبوسة', price: 15, img: 'illus/s-basbousa.jpg' },
  { id: 's-crunchy', en: 'Crunchy Chocolate', cat: 'sweet', name: 'كرانشي تشوكليت', price: 15, img: 'illus/s-crunchy.jpg' },
  { id: 's-ivy', en: 'Ivy Sweet', cat: 'sweet', name: 'إيفاي سويت', price: 14, img: 'illus/s-ivy.jpg' },
  { id: 's-jawza', en: 'Jawza Dessert', cat: 'sweet', name: 'حلا الجوزاء', price: 14, img: 'jawza.jpg' },
  { id: 's-glory', en: 'Glory Classic', cat: 'sweet', name: 'قلوري كلاسيك', price: 14, img: 'illus/s-glory.jpg' },
  { id: 's-koja', en: 'Sweet Koja', cat: 'sweet', name: 'سويت كوجا', price: 14, img: 'illus/s-koja.jpg' },
  { id: 's-kinder', en: 'Kinder Cookies', cat: 'sweet', name: 'كوكيز كندر', price: 9, img: 'illus/s-kinder.jpg' },
  { id: 's-cookies', en: 'Cookies', cat: 'sweet', name: 'كوكيز', price: 8, img: 'illus/s-cookies.jpg' },
  { id: 's-brownie', en: 'Brownie', cat: 'sweet', name: 'براوني', price: 8, img: 'illus/s-brownie.jpg' },
  // FOOD
  { id: 'f-benibrik', en: 'Bunni Brik', cat: 'food', name: 'بني بريك', price: 18, img: 'illus/f-benibrik.jpg' },
  { id: 'f-granola', en: 'Granola', cat: 'food', name: 'جرانولا', price: 11, img: 'illus/f-granola.jpg' },
  { id: 'f-sandwich', en: 'Sandwich', cat: 'food', name: 'ساندويش', price: 12, img: 'illus/f-sandwich.jpg' },
];
