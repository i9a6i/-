(() => {
  'use strict';

  // ---------- أدوات ----------
  const $ = (s) => document.querySelector(s);
  const el = (tag, props = {}, kids = []) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else if (v !== false && v != null) n.setAttribute(k, v === true ? '' : v);
    }
    for (const c of [].concat(kids)) if (c != null) n.append(c);
    return n;
  };
  const money = (n) => (Math.round(n * 100) % 100 ? n.toFixed(2) : String(Math.round(n)));
  const pad = (n) => String(n).padStart(2, '0');
  const dayKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const timeStr = (ts) => { const d = new Date(ts); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const load = (k, def) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? def; } catch { return def; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };
  let toastTimer;
  const toast = (msg) => {
    const t = $('#toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => (t.hidden = true), 3200);
  };

  // ---------- الحالة ----------
  const PAY = { cash: 'كاش', card: 'شبكة' };
  const settings = Object.assign(
    { shop: 'BNY', footer: 'شكراً لزيارتكم', vat: false, vatNo: '', printMode: 'airprint', paper: '80', ip: '' },
    load('bunni.settings', {})
  );
  const overrides = load('bunni.menu', {}); // { id: { price, hidden } }
  let orders = load('bunni.orders', []);
  let cart = []; // { id, name, price, qty }
  let cat = 'all';
  let pay = 'cash';

  const items = () => window.MENU.map((m) => ({ ...m, ...(overrides[m.id] || {}) }));
  const visibleItems = () => items().filter((m) => !m.hidden && (cat === 'all' || m.cat === cat));

  const nextSeq = (commit) => {
    const s = load('bunni.seq', { day: '', n: 0 });
    const today = dayKey();
    const n = s.day === today ? s.n + 1 : 1;
    if (commit) save('bunni.seq', { day: today, n });
    return n;
  };

  // ---------- الكاشير ----------
  function renderCats() {
    const box = $('#cats'); box.replaceChildren();
    for (const c of [{ id: 'all', name: 'الكل' }, ...window.CATEGORIES]) {
      box.append(el('button', { class: c.id === cat ? 'active' : '', text: c.name, onclick: () => { cat = c.id; renderCats(); renderGrid(); } }));
    }
  }

  function renderGrid() {
    const grid = $('#grid'); grid.replaceChildren();
    for (const m of visibleItems()) {
      const inCart = cart.find((l) => l.id === m.id);
      const pic = m.img
        ? el('img', { class: 'pic', src: 'img/' + m.img, alt: '', loading: 'lazy' })
        : el('div', { class: 'pic ph ' + m.cat }, [el('div', {}, ['BNY', el('small', { text: m.cat === 'cold' ? 'COLD' : 'HOT' })])]);
      grid.append(
        el('button', { class: 'tile', onclick: () => addToCart(m) }, [
          pic,
          inCart ? el('span', { class: 'badge', text: inCart.qty }) : null,
          el('div', { class: 'meta' }, [el('span', { class: 'name', text: m.name }), el('span', { class: 'price', text: money(m.price) })]),
        ])
      );
    }
  }

  function addToCart(m) {
    const line = cart.find((l) => l.id === m.id);
    if (line) line.qty++;
    else cart.push({ id: m.id, name: m.name, price: m.price, qty: 1 });
    renderCart(); renderGrid();
  }

  function changeQty(id, d) {
    const line = cart.find((l) => l.id === id);
    if (!line) return;
    line.qty += d;
    if (line.qty <= 0) cart = cart.filter((l) => l !== line);
    renderCart(); renderGrid();
  }

  const totals = () => {
    const sub = cart.reduce((s, l) => s + l.price * l.qty, 0);
    const disc = Math.min(sub, Math.max(0, parseFloat($('#discount').value) || 0));
    return { sub, disc, total: sub - disc };
  };

  function renderCart() {
    const box = $('#cartLines'); box.replaceChildren();
    if (!cart.length) box.append(el('div', { class: 'empty', text: 'اضغط على صنف لإضافته' }));
    for (const l of cart) {
      box.append(
        el('div', { class: 'line' }, [
          el('div', { class: 'ln' }, [el('b', { text: l.name }), el('small', { text: money(l.price) + ' ر.س' })]),
          el('div', { class: 'qty' }, [
            el('button', { text: '−', 'aria-label': 'إنقاص', onclick: () => changeQty(l.id, -1) }),
            el('span', { text: l.qty }),
            el('button', { text: '+', 'aria-label': 'زيادة', onclick: () => changeQty(l.id, 1) }),
          ]),
          el('div', { class: 'lt', text: money(l.price * l.qty) }),
        ])
      );
    }
    const t = totals();
    $('#subTotal').textContent = money(t.sub) + ' ر.س';
    $('#grandTotal').textContent = money(t.total) + ' ر.س';
    $('#checkout').disabled = !cart.length;
    $('#orderNo').textContent = '#' + nextSeq(false);
  }

  function resetCart() {
    cart = []; $('#discount').value = ''; $('#orderNote').value = '';
    renderCart(); renderGrid();
  }

  async function checkout() {
    if (!cart.length) return;
    const t = totals();
    const order = {
      id: Date.now().toString(36),
      no: nextSeq(true),
      ts: Date.now(),
      day: dayKey(),
      items: cart.map((l) => ({ ...l })),
      sub: t.sub, disc: t.disc, total: t.total,
      pay, note: $('#orderNote').value.trim(),
    };
    orders.push(order);
    if (!save('bunni.orders', orders)) toast('تعذّر حفظ الطلب على الجهاز — تحقق من مساحة التخزين');
    resetCart();
    await printOrder(order);
  }

  // ---------- الطباعة ----------
  const vatOf = (total) => total * 15 / 115;

  function buildReceiptDom(o) {
    const r = $('#receipt'); r.replaceChildren();
    r.style.setProperty('--paper', settings.paper === '58' ? '48mm' : '72mm');
    const d = new Date(o.ts);
    r.append(el('h1', { text: settings.shop }));
    if (settings.vat && settings.vatNo) r.append(el('div', { class: 'c', text: 'الرقم الضريبي: ' + settings.vatNo }));
    r.append(
      el('div', { class: 'c', text: 'طلب رقم' }),
      el('div', { class: 'big', text: '#' + o.no }),
      el('div', { class: 'c', text: `${o.day}  ${pad(d.getHours())}:${pad(d.getMinutes())}` }),
      el('hr')
    );
    const tb = el('table');
    for (const l of o.items) {
      tb.append(el('tr', {}, [el('td', { text: l.name }), el('td', { class: 'q', text: '×' + l.qty }), el('td', { class: 'p', text: money(l.price * l.qty) })]));
    }
    r.append(tb, el('hr'));
    const tt = el('table');
    if (o.disc) {
      tt.append(el('tr', {}, [el('td', { text: 'المجموع' }), el('td', { class: 'p', text: money(o.sub) })]));
      tt.append(el('tr', {}, [el('td', { text: 'خصم' }), el('td', { class: 'p', text: '-' + money(o.disc) })]));
    }
    tt.append(el('tr', { class: 't' }, [el('td', { text: 'الإجمالي' }), el('td', { class: 'p', text: money(o.total) + ' ر.س' })]));
    if (settings.vat) tt.append(el('tr', {}, [el('td', { text: 'شامل ضريبة 15%' }), el('td', { class: 'p', text: money(+vatOf(o.total).toFixed(2)) })]));
    tt.append(el('tr', {}, [el('td', { text: 'الدفع' }), el('td', { class: 'p', text: PAY[o.pay] || o.pay })]));
    r.append(tt);
    if (o.note) r.append(el('hr'), el('div', { text: 'ملاحظة: ' + o.note }));
    if (o.void) r.append(el('hr'), el('div', { class: 'big', text: 'ملغي' }));
    r.append(el('hr'), el('div', { class: 'c', text: settings.footer }));
  }

  // رسم الفاتورة كصورة (للطابعات الحرارية التي لا تدعم العربية نصياً)
  function receiptCanvas(o) {
    const W = settings.paper === '58' ? 384 : 576;
    const rows = []; // { type, a, b, size, bold }
    const d = new Date(o.ts);
    const T = (a, size = 24, bold = false) => rows.push({ type: 'c', a, size, bold });
    const LR = (a, b, size = 24, bold = false) => rows.push({ type: 'lr', a, b, size, bold });
    const HR = () => rows.push({ type: 'hr', size: 16 });
    T(settings.shop, 40, true);
    if (settings.vat && settings.vatNo) T('الرقم الضريبي: ' + settings.vatNo, 20);
    T('طلب رقم', 22); T('#' + o.no, 56, true);
    T(`${o.day}  ${pad(d.getHours())}:${pad(d.getMinutes())}`, 22); HR();
    for (const l of o.items) LR(`${l.name}  ×${l.qty}`, money(l.price * l.qty));
    HR();
    if (o.disc) { LR('المجموع', money(o.sub)); LR('خصم', '-' + money(o.disc)); }
    LR('الإجمالي', money(o.total) + ' ر.س', 32, true);
    if (settings.vat) LR('شامل ضريبة 15%', money(+vatOf(o.total).toFixed(2)), 22);
    LR('الدفع', PAY[o.pay] || o.pay, 22);
    if (o.note) { HR(); rows.push({ type: 'r', a: 'ملاحظة: ' + o.note, size: 22 }); }
    if (o.void) { HR(); T('ملغي', 44, true); }
    HR(); T(settings.footer, 22);

    const lh = (r) => Math.round(r.size * 1.5);
    const H = rows.reduce((s, r) => s + lh(r), 0) + 24;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#000'; ctx.textBaseline = 'middle'; ctx.direction = 'rtl';
    let y = 12;
    const M = 8;
    for (const r of rows) {
      const h = lh(r), cy = y + h / 2;
      ctx.font = `${r.bold ? 'bold ' : ''}${r.size}px -apple-system, "Segoe UI", Tahoma, sans-serif`;
      if (r.type === 'hr') {
        ctx.setLineDash([8, 6]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(M, cy); ctx.lineTo(W - M, cy); ctx.stroke();
      } else if (r.type === 'c') {
        ctx.textAlign = 'center'; ctx.fillText(r.a, W / 2, cy, W - 2 * M);
      } else if (r.type === 'r') {
        ctx.textAlign = 'right'; ctx.fillText(r.a, W - M, cy, W - 2 * M);
      } else {
        ctx.textAlign = 'left'; ctx.fillText(r.b, M, cy);
        const bw = ctx.measureText(r.b).width;
        ctx.textAlign = 'right'; ctx.fillText(r.a, W - M, cy, W - 3 * M - bw);
      }
      y += h;
    }
    return cv;
  }

  function canvasToMonoBase64(cv) {
    const { width: W, height: H } = cv;
    const px = cv.getContext('2d').getImageData(0, 0, W, H).data;
    const bpr = Math.ceil(W / 8);
    const out = new Uint8Array(bpr * H);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        const lum = px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114;
        if (lum < 140) out[y * bpr + (x >> 3)] |= 0x80 >> (x & 7);
      }
    }
    let bin = '';
    for (let i = 0; i < out.length; i += 0x8000) bin += String.fromCharCode.apply(null, out.subarray(i, i + 0x8000));
    return btoa(bin);
  }

  // جسم ePOS-Print XML: الفاتورة كصورة نقطية ثم قص الورق
  function eposPrintXml(o) {
    const cv = receiptCanvas(o);
    return '<epos-print xmlns="http://www.epson-pos.com/schemas/2011/03/epos-print">' +
      `<image width="${cv.width}" height="${cv.height}" color="color_1" mode="mono">${canvasToMonoBase64(cv)}</image>` +
      '<feed line="3"/><cut type="feed"/>' +
      '</epos-print>';
  }

  // عبر تطبيق Epson TM Print Assistant على الآيباد (يطبع على الطابعة عبر الشبكة المحلية)
  function printTmAssistant(o) {
    const q = new URLSearchParams({
      ver: '1',
      'data-type': 'eposprintxml',
      data: '<?xml version="1.0" encoding="utf-8"?>' + eposPrintXml(o),
      reselect: 'no',
      'paper-width': settings.paper,
      success: location.origin + location.pathname,
    });
    location.href = 'tmprintassistant://tmprintassistant.epson.com/print?' + q.toString().replace(/\+/g, '%20');
  }

  async function printEpson(o) {
    const ip = settings.ip.trim();
    if (!/^[\w.\-:]+$/.test(ip)) throw new Error('أدخل عنوان IP للطابعة في الإعدادات');
    const xml =
      '<?xml version="1.0" encoding="utf-8"?>' +
      '<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body>' +
      eposPrintXml(o) +
      '</s:Body></s:Envelope>';
    const proto = location.protocol === 'https:' ? 'https' : 'http';
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 12000);
    try {
      const res = await fetch(`${proto}://${ip}/cgi-bin/epos/service.cgi?devid=local_printer&timeout=10000`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/xml; charset=utf-8', SOAPAction: '""' },
        body: xml, signal: ctl.signal,
      });
      const txt = await res.text();
      if (!res.ok || !/success="(true|1)"/.test(txt)) {
        const code = (txt.match(/code="([^"]*)"/) || [])[1];
        throw new Error('الطابعة رفضت الطلب' + (code ? ` (${code})` : ''));
      }
    } finally { clearTimeout(timer); }
  }

  async function printOrder(o) {
    if (settings.printMode === 'none') { toast(`تم حفظ الطلب #${o.no}`); return; }
    if (settings.printMode === 'tmassist') { printTmAssistant(o); return; }
    if (settings.printMode === 'epson') {
      try { await printEpson(o); toast(`تمت طباعة الطلب #${o.no}`); }
      catch (e) {
        const msg = e.name === 'AbortError' || e instanceof TypeError ? 'تعذّر الاتصال بالطابعة — تحقق من الشبكة وعنوان IP' : e.message;
        toast(`الطلب #${o.no} محفوظ، لكن: ${msg}`);
      }
      return;
    }
    buildReceiptDom(o);
    // مهلة قصيرة حتى يُرسم محتوى الفاتورة قبل فتح نافذة الطباعة
    setTimeout(() => window.print(), 60);
  }

  // ---------- الطلبات ----------
  function renderOrders() {
    const day = $('#ordersDate').value || dayKey();
    const list = orders.filter((o) => o.day === day).sort((a, b) => b.ts - a.ts);
    const ok = list.filter((o) => !o.void);
    const sum = (arr) => arr.reduce((s, o) => s + o.total, 0);
    const stats = $('#stats'); stats.replaceChildren();
    const stat = (label, val) => stats.append(el('div', { class: 'stat' }, [el('small', { text: label }), el('b', { text: val })]));
    stat('عدد الطلبات', ok.length);
    stat('إجمالي المبيعات', money(sum(ok)) + ' ر.س');
    stat('كاش', money(sum(ok.filter((o) => o.pay === 'cash'))) + ' ر.س');
    stat('شبكة', money(sum(ok.filter((o) => o.pay === 'card'))) + ' ر.س');

    const box = $('#ordersList'); box.replaceChildren();
    if (!list.length) box.append(el('div', { class: 'empty', text: 'لا توجد طلبات في هذا اليوم' }));
    for (const o of list) {
      box.append(
        el('div', { class: 'order' + (o.void ? ' void' : '') }, [
          el('div', { class: 'oh' }, [
            el('b', { text: `#${o.no} — ${timeStr(o.ts)}` }),
            el('span', {}, [el('span', { class: 'tag', text: o.void ? 'ملغي' : PAY[o.pay] }), ' ', el('b', { text: money(o.total) + ' ر.س' })]),
          ]),
          el('div', { class: 'oi', text: o.items.map((l) => `${l.name} ×${l.qty}`).join('، ') + (o.note ? ` — ${o.note}` : '') }),
          el('div', { class: 'oa' }, [
            el('button', { class: 'secondary', text: 'إعادة طباعة', onclick: () => printOrder(o) }),
            o.void ? null : el('button', { class: 'link danger', text: 'إلغاء الطلب', onclick: () => {
              if (!confirm(`إلغاء الطلب #${o.no}؟ سيُستبعد من المبيعات.`)) return;
              o.void = true; save('bunni.orders', orders); renderOrders();
            } }),
          ]),
        ])
      );
    }
  }

  function exportCsv() {
    const day = $('#ordersDate').value || dayKey();
    const q = (s) => '"' + String(s).replace(/"/g, '""') + '"';
    const rows = [['رقم', 'الوقت', 'الأصناف', 'المجموع', 'الخصم', 'الإجمالي', 'الدفع', 'الحالة', 'ملاحظة']];
    for (const o of orders.filter((x) => x.day === day)) {
      rows.push([o.no, timeStr(o.ts), o.items.map((l) => `${l.name} x${l.qty}`).join(' | '), o.sub, o.disc, o.total, PAY[o.pay], o.void ? 'ملغي' : '', o.note || '']);
    }
    const blob = new Blob(['﻿' + rows.map((r) => r.map(q).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = el('a', { href: URL.createObjectURL(blob), download: `bunni-orders-${day}.csv` });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }

  // ---------- الإعدادات ----------
  function renderSettings() {
    $('#setShop').value = settings.shop; $('#setFooter').value = settings.footer;
    $('#setVat').checked = settings.vat; $('#setVatNo').value = settings.vatNo;
    $('#setPrintMode').value = settings.printMode; $('#setPaper').value = settings.paper; $('#setIp').value = settings.ip;
    updatePrintHint();
    const box = $('#menuEdit'); box.replaceChildren();
    const catName = Object.fromEntries(window.CATEGORIES.map((c) => [c.id, c.name]));
    for (const m of items()) {
      const price = el('input', { class: 'input', type: 'number', min: '0', step: '0.5', inputmode: 'decimal', value: m.price, 'aria-label': 'السعر' });
      const shown = el('input', { type: 'checkbox', 'aria-label': 'ظاهر' }); shown.checked = !m.hidden;
      const commit = () => {
        const base = window.MENU.find((x) => x.id === m.id);
        const p = parseFloat(price.value);
        const o = {};
        if (p >= 0 && p !== base.price) o.price = p;
        if (!shown.checked) o.hidden = true;
        if (Object.keys(o).length) overrides[m.id] = o; else delete overrides[m.id];
        save('bunni.menu', overrides); renderGrid();
      };
      price.addEventListener('change', commit); shown.addEventListener('change', commit);
      box.append(el('div', { class: 'me-row' }, [el('span', { class: 'n' }, [m.name + ' ', el('small', { text: catName[m.cat] })]), price, shown]));
    }
  }

  function updatePrintHint() {
    const mode = $('#setPrintMode').value;
    $('#ipRow').hidden = mode !== 'epson';
    $('#printHint').textContent =
      mode === 'airprint'
        ? 'تظهر نافذة الطباعة في الآيباد بعد كل طلب. تحتاج طابعة تدعم AirPrint على نفس شبكة الواي فاي.'
        : mode === 'epson'
        ? 'لطابعات Epson TM التي تدعم ePOS-Print (مثل TM-m30 / TM-T88VI). فعّل ePOS-Print من صفحة إعدادات الطابعة، وافتح https://عنوان-الطابعة مرة واحدة من سفاري واقبل الشهادة قبل أول طباعة.'
        : mode === 'tmassist'
        ? 'يفتح تطبيق Epson TM Print Assistant ويطبع الفاتورة على الطابعة المحددة فيه، ثم ارجع للكاشير. ثبّت التطبيق واختر الطابعة فيه أولاً.'
        : 'يُحفظ الطلب فقط دون طباعة.';
  }

  function bindSettings() {
    const bind = (sel, key, prop = 'value') => $(sel).addEventListener('change', (e) => {
      settings[key] = prop === 'checked' ? e.target.checked : e.target.value.trim();
      save('bunni.settings', settings); updatePrintHint();
    });
    bind('#setShop', 'shop'); bind('#setFooter', 'footer'); bind('#setVat', 'vat', 'checked'); bind('#setVatNo', 'vatNo');
    bind('#setPrintMode', 'printMode'); bind('#setPaper', 'paper'); bind('#setIp', 'ip');
    $('#testPrint').addEventListener('click', () => {
      if (settings.printMode === 'none') { toast('اختر طريقة طباعة أولاً'); return; }
      printOrder({ no: 0, ts: Date.now(), day: dayKey(), items: [{ name: 'طباعة تجريبية', price: 0, qty: 1 }], sub: 0, disc: 0, total: 0, pay: 'cash', note: '' });
    });
  }

  // ---------- التنقل والتهيئة ----------
  function show(view) {
    for (const v of ['pos', 'orders', 'settings']) $('#view-' + v).hidden = v !== view;
    document.querySelectorAll('.tabs button').forEach((b) => b.classList.toggle('active', b.dataset.view === view));
    if (view === 'orders') renderOrders();
    if (view === 'settings') renderSettings();
    if (view === 'pos') { renderGrid(); renderCart(); }
  }

  document.querySelectorAll('.tabs button').forEach((b) => b.addEventListener('click', () => show(b.dataset.view)));
  document.querySelectorAll('#payMethods button').forEach((b) => b.addEventListener('click', () => {
    pay = b.dataset.pay;
    document.querySelectorAll('#payMethods button').forEach((x) => x.classList.toggle('active', x === b));
  }));
  $('#discount').addEventListener('input', renderCart);
  $('#clearCart').addEventListener('click', () => { if (cart.length && confirm('تفريغ الطلب الحالي؟')) resetCart(); });
  $('#checkout').addEventListener('click', checkout);
  $('#ordersDate').value = dayKey();
  $('#ordersDate').addEventListener('change', renderOrders);
  $('#exportCsv').addEventListener('click', exportCsv);
  bindSettings();

  const tick = () => { const d = new Date(); $('#clock').textContent = `${dayKey(d)}  ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  tick(); setInterval(tick, 20000);

  renderCats(); renderGrid(); renderCart();

  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
