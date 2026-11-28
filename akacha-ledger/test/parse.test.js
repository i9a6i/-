import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMessage } from '../lib/parse.js';
import { incomeByDate } from '../lib/income.js';
import { totals, dayReport, monthReport } from '../lib/report.js';

test('withdrawal with dessert keyword', () => {
  const p = parseMessage('سحب 350 غيمة');
  assert.equal(p.kind, 'expense');
  assert.equal(p.amount, 350);
  assert.equal(p.category.id, 'ghaima');
  assert.equal(p.note, 'غيمة');
});

test('each dessert is recognised', () => {
  assert.equal(parseMessage('سحب 200 تشيز مدريد بيكان').category.id, 'madrid');
  assert.equal(parseMessage('صرف 90 بسبوسه اكاتشا').category.id, 'basbousa');
  assert.equal(parseMessage('سحب 400 مقلوبة التشيز كيك').category.id, 'maqlouba');
  assert.equal(parseMessage('سحب 150 تشيزكيك').category.id, 'maqlouba');
});

test('anything else is supplies; keyword سحب optional; Arabic digits', () => {
  const p = parseMessage('١٢٠ بلاستيك أكواب وملاعق');
  assert.equal(p.kind, 'expense');
  assert.equal(p.amount, 120);
  assert.equal(p.category.id, 'supplies');
  assert.equal(p.note, 'بلاستيك أكواب وملاعق');
  assert.equal(parseMessage('سحب 1,500 كراسي').amount, 1500);
  assert.equal(parseMessage('سحب كراسي 800 ريال').note, 'كراسي');
});

test('errors and commands', () => {
  assert.equal(parseMessage('سحب 350').reason, 'no_note');
  assert.equal(parseMessage('سحب غيمة').kind, 'bad');
  assert.equal(parseMessage('مرحبا').kind, 'unknown');
  assert.equal(parseMessage('اليوم').kind, 'today');
  assert.equal(parseMessage('/today@AkachaBot').kind, 'today');
  assert.deepEqual(parseMessage('الشهر 2026-9'), { kind: 'month', month: '2026-09' });
  assert.deepEqual(parseMessage('دخل 10000'), { kind: 'income', amount: 10000 });
});

test('income from till snapshot', () => {
  const snap = { v: 1, today: '2026-11-28', daily: [{ date: '2026-11-27', net: 9800 }, { day: '2026-11-28', total: 7200 }] };
  assert.deepEqual(incomeByDate(snap), { '2026-11-27': 9800, '2026-11-28': 7200 });
  assert.deepEqual(incomeByDate(null), {});
});

test('reports add up', () => {
  const ex = [
    { amount: 350, note: 'غيمة', categoryId: 'ghaima', by: 'أ', at: '1' },
    { amount: 120, note: 'بلاستيك', categoryId: 'supplies', by: 'ب', at: '2' },
  ];
  const t = totals(ex);
  assert.equal(t.all, 470);
  assert.equal(t.desserts, 350);
  assert.equal(t.supplies, 120);
  assert.match(dayReport('2026-11-28', 7000, ex), /6,530/);
  assert.match(monthReport('2026-11', { '2026-11-28': 7000 }, ex), /أكثر المستلزمات/);
});
