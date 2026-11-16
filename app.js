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
    { shop: 'BNY', footer: 'شكراً لزيارتكم', vat: false, vatNo: '', printMode: 'airprint', paper: '80', ip: '', pagers: 20, cloudKey: '' },
    load('bunni.settings', {})
  );
  const overrides = load('bunni.menu', {}); // { id: { price, hidden } }
  let orders = load('bunni.orders', []);
  let cart = []; // { id, name, price, qty }
  let cat = 'all';
  let pay = 'cash';

  // ---------- السحابة ----------
  // كل حدث (طلب، إلغاء، تعديل منيو) يُضاف إلى صندوق صادر محفوظ على الجهاز،
  // ثم يُرسل إلى /api/sync. إن انقطع الإنترنت يبقى في الصندوق ويُرسل لاحقاً.
  let outbox = load('bunni.outbox', []);
  let cloudState = { last: 0, error: '' };
  let flushing = false;

  function queue(type, data) {
    outbox.push({ id: `${type}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`, type, ts: Date.now(), data });
    save('bunni.outbox', outbox);
    flush();
  }

  async function cloudFetch(url, opts = {}) {
    const res = await fetch(url, { ...opts, headers: { 'Content-Type': 'application/json', 'x-pos-key': settings.cloudKey, ...(opts.headers || {}) } });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = { bad_key: 'رمز السحابة غير صحيح', storage_not_configured: 'التخزين السحابي غير مفعّل بعد', pos_key_not_configured: 'رمز السحابة غير مضبوط على الخادم' }[body.error];
      throw new Error(msg || 'تعذّر الاتصال بالسحابة');
    }
    return body;
  }

  async function flush() {
    if (flushing || !settings.cloudKey || !outbox.length) { renderCloudStatus(); return; }
    flushing = true;
    try {
      while (outbox.length) {
        const batch = outbox.slice(0, 100);
        const r = await cloudFetch('api/sync', { method: 'POST', body: JSON.stringify({ events: batch }) });
        const done = new Set(r.saved || []);
        outbox = outbox.filter((e) => !done.has(e.id));
        save('bunni.outbox', outbox);
        if (!done.size) break;
      }
      cloudState = { last: Date.now(), error: '' };
    } catch (e) {
      cloudState.error = e.message;
    } finally {
      flushing = false; renderCloudStatus();
    }
  }

  function renderCloudStatus() {
    const box = $('#cloudStatus'); if (!box) return;
    box.textContent = !settings.cloudKey
      ? 'غير مفعّل — أدخل رمز السحابة.'
      : cloudState.error
      ? `⚠️ ${cloudState.error}. بانتظار الإرسال: ${outbox.length}`
      : outbox.length
      ? `بانتظار الإرسال: ${outbox.length}`
      : cloudState.last ? `✅ كل شيء محفوظ في السحابة (آخر مزامنة ${timeStr(cloudState.last)})` : 'جاهز.';
  }

  // يجلب طلبات اليوم وسجل التحديثات من السحابة، ويدمج الطلبات الناقصة في هذا الجهاز
  async function pullCloud(day) {
    const r = await cloudFetch('api/sync?day=' + encodeURIComponent(day));
    const have = new Map(orders.map((o) => [o.id, o]));
    let added = 0;
    for (const o of r.orders || []) {
      const mine = have.get(o.id);
      if (!mine) { orders.push(o); added++; } else if (o.void && !mine.void) mine.void = true;
    }
    if (added) save('bunni.orders', orders);
    if (r.menu && !outbox.some((e) => e.type === 'menu')) {
      for (const k of Object.keys(overrides)) delete overrides[k];
      Object.assign(overrides, r.menu); save('bunni.menu', overrides);
    }
    return { added, log: r.log || [] };
  }

  function renderLog(log) {
    const box = $('#cloudLog'); box.replaceChildren();
    if (!log.length) { box.append(el('div', { class: 'empty', text: 'لا توجد تحديثات بعد' })); return; }
    for (const l of log) {
      const d = new Date(l.ts);
      box.append(el('div', { class: 'log-row ' + l.type }, [el('small', { text: `${dayKey(d)} ${timeStr(l.ts)}` }), el('span', { text: l.text })]));
    }
  }

  // شعار الفاتورة (أبيض وأسود) يُحمَّل مسبقاً ليُرسم على صورة الفاتورة
  const receiptLogo = new Image();
  receiptLogo.src = 'img/receipt-logo.png';

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
        : el('div', { class: 'pic ph ' + m.cat }, [
            el('span', { class: 'gfx', text: m.icon || (m.cat === 'cold' ? '🧊' : '☕') }),
            el('img', { src: 'img/logo.png', alt: '' }),
            el('small', { text: m.cat === 'cold' ? 'بارد' : 'حار' }),
          ]);
      grid.append(
        el('button', { class: 'tile', onclick: () => addToCart(m) }, [
          pic,
          inCart ? el('span', { class: 'badge', text: inCart.qty }) : null,
          el('div', { class: 'meta' }, [el('span', { class: 'name', text: m.name }), el('span', { class: 'price', text: money(m.price) + ' ر.س' })]),
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

  function renderPagers() {
    const sel = $('#pager'), cur = sel.value;
    const n = Math.min(99, Math.max(0, parseInt(settings.pagers, 10) || 0));
    sel.replaceChildren(el('option', { value: '', text: 'بدون بيجر' }));
    for (let i = 1; i <= n; i++) sel.append(el('option', { value: String(i), text: 'بيجر ' + i }));
    sel.value = cur && +cur <= n ? cur : '';
    $('#pagerRow').hidden = n === 0;
  }

  function resetCart() {
    cart = []; $('#discount').value = ''; $('#orderNote').value = ''; $('#pager').value = '';
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
      pager: $('#pager').value || '',
    };
    orders.push(order);
    if (!save('bunni.orders', orders)) toast('تعذّر حفظ الطلب على الجهاز — تحقق من مساحة التخزين');
    queue('order', order);
    resetCart();
    await printOrder(order);
  }

  // ---------- الطباعة ----------
  const vatOf = (total) => total * 15 / 115;

  function buildReceiptDom(o) {
    const r = $('#receipt'); r.replaceChildren();
    r.style.setProperty('--paper', settings.paper === '58' ? '48mm' : '72mm');
    const d = new Date(o.ts);
    r.append(el('img', { class: 'logo', src: 'img/receipt-logo.png', alt: '' }), el('h1', { text: settings.shop }));
    if (settings.vat && settings.vatNo) r.append(el('div', { class: 'c', text: 'الرقم الضريبي: ' + settings.vatNo }));
    r.append(
      el('div', { class: 'c', text: 'طلب رقم' }),
      el('div', { class: 'big', text: '#' + o.no }),
      o.pager ? el('div', { class: 'pager', text: 'بيجر ' + o.pager }) : null,
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
    if (receiptLogo.complete && receiptLogo.naturalWidth) rows.push({ type: 'img', img: receiptLogo, h: 210 });
    T(settings.shop, 36, true);
    if (settings.vat && settings.vatNo) T('الرقم الضريبي: ' + settings.vatNo, 22);
    T('طلب رقم', 24); T('#' + o.no, 60, true);
    if (o.pager) rows.push({ type: 'box', a: 'بيجر ' + o.pager, size: 52 });
    T(`${o.day}  ${pad(d.getHours())}:${pad(d.getMinutes())}`, 24); HR();
    for (const l of o.items) LR(`${l.name}  ×${l.qty}`, money(l.price * l.qty), 30, true);
    HR();
    if (o.disc) { LR('المجموع', money(o.sub)); LR('خصم', '-' + money(o.disc)); }
    LR('الإجمالي', money(o.total) + ' ر.س', 32, true);
    if (settings.vat) LR('شامل ضريبة 15%', money(+vatOf(o.total).toFixed(2)), 22);
    LR('الدفع', PAY[o.pay] || o.pay, 22);
    if (o.note) { HR(); rows.push({ type: 'r', a: 'ملاحظة: ' + o.note, size: 22 }); }
    if (o.void) { HR(); T('ملغي', 44, true); }
    HR(); T(settings.footer, 22);

    const lh = (r) => r.type === 'img' ? r.h + 12 : r.type === 'box' ? Math.round(r.size * 1.9) : Math.round(r.size * 1.5);
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
      if (r.type === 'img') {
        const iw = r.img.naturalWidth * (r.h / r.img.naturalHeight);
        ctx.drawImage(r.img, (W - iw) / 2, y, iw, r.h);
      } else if (r.type === 'box') {
        // رقم البيجر: نص أبيض داخل مستطيل أسود ليكون واضحاً من بعيد
        ctx.font = `bold ${r.size}px -apple-system, "Segoe UI", Tahoma, sans-serif`;
        const bw = Math.min(W - 2 * M, ctx.measureText(r.a).width + 60), bh = h - 12;
        ctx.fillRect((W - bw) / 2, y + 6, bw, bh);
        ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(r.a, W / 2, cy, bw - 20); ctx.fillStyle = '#000';
      } else if (r.type === 'hr') {
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
            el('b', { text: `#${o.no} — ${timeStr(o.ts)}` + (o.pager ? ` — بيجر ${o.pager}` : '') }),
            el('span', {}, [el('span', { class: 'tag', text: o.void ? 'ملغي' : PAY[o.pay] }), ' ', el('b', { text: money(o.total) + ' ر.س' })]),
          ]),
          el('div', { class: 'oi', text: o.items.map((l) => `${l.name} ×${l.qty}`).join('، ') + (o.note ? ` — ${o.note}` : '') }),
          el('div', { class: 'oa' }, [
            el('button', { class: 'secondary', text: 'إعادة طباعة', onclick: () => printOrder(o) }),
            o.void ? null : el('button', { class: 'link danger', text: 'إلغاء الطلب', onclick: () => {
              if (!confirm(`إلغاء الطلب #${o.no}؟ سيُستبعد من المبيعات.`)) return;
              o.void = true; save('bunni.orders', orders); renderOrders();
              queue('void', o);
            } }),
          ]),
        ])
      );
    }
  }

  function exportCsv() {
    const day = $('#ordersDate').value || dayKey();
    const q = (s) => '"' + String(s).replace(/"/g, '""') + '"';
    const rows = [['رقم', 'البيجر', 'الوقت', 'الأصناف', 'المجموع', 'الخصم', 'الإجمالي', 'الدفع', 'الحالة', 'ملاحظة']];
    for (const o of orders.filter((x) => x.day === day)) {
      rows.push([o.no, o.pager || '', timeStr(o.ts), o.items.map((l) => `${l.name} x${l.qty}`).join(' | '), o.sub, o.disc, o.total, PAY[o.pay], o.void ? 'ملغي' : '', o.note || '']);
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
    $('#setPagers').value = settings.pagers;
    $('#setCloudKey').value = settings.cloudKey;
    renderCloudStatus();
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
        const now = items().find((x) => x.id === m.id);
        queue('menu', { overrides: { ...overrides }, text: `${m.name}: ${now.hidden ? 'مخفي' : 'ظاهر'}، السعر ${money(now.price)} ر.س` });
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
    $('#setCloudKey').addEventListener('change', (e) => {
      settings.cloudKey = e.target.value.trim(); save('bunni.settings', settings); cloudState.error = ''; flush();
    });
    $('#cloudSync').addEventListener('click', async () => {
      if (!settings.cloudKey) { toast('أدخل رمز السحابة أولاً'); return; }
      await flush();
      try { const r = await pullCloud(dayKey()); renderLog(r.log); toast(r.added ? `تمت المزامنة — أُضيف ${r.added} طلب من السحابة` : 'تمت المزامنة'); }
      catch (err) { toast(err.message); }
    });
    $('#setPagers').addEventListener('change', (e) => {
      settings.pagers = Math.min(99, Math.max(0, parseInt(e.target.value, 10) || 0));
      e.target.value = settings.pagers; save('bunni.settings', settings); renderPagers();
    });
    $('#testPrint').addEventListener('click', () => {
      if (settings.printMode === 'none') { toast('اختر طريقة طباعة أولاً'); return; }
      printOrder({ no: 0, ts: Date.now(), day: dayKey(), items: [{ name: 'طباعة تجريبية', price: 0, qty: 1 }], sub: 0, disc: 0, total: 0, pay: 'cash', note: '', pager: '1' });
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
  $('#ordersCloud').addEventListener('click', async () => {
    if (!settings.cloudKey) { toast('فعّل السحابة من الإعدادات أولاً'); return; }
    try { const r = await pullCloud($('#ordersDate').value || dayKey()); renderOrders(); toast(r.added ? `أُضيف ${r.added} طلب من السحابة` : 'الطلبات مطابقة للسحابة'); }
    catch (err) { toast(err.message); }
  });
  window.addEventListener('online', flush);
  setInterval(flush, 60000);
  bindSettings();

  const tick = () => { const d = new Date(); $('#clock').textContent = `${dayKey(d)}  ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  tick(); setInterval(tick, 20000);

  renderPagers(); renderCats(); renderGrid(); renderCart(); flush();

  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
