import test from 'node:test';
import assert from 'node:assert/strict';
import * as L from '../logic.js';
import { buildSeed, sampleBankCSV, TODAY } from '../data.js';

function mini(today = '2026-10-01') {
  return {
    seq: 0, today,
    center: { name: 'Т', bank: 'MBank', account: '+996', recipient: 'Назира А.' },
    settings: { reminders: { ...L.DEFAULT_REMINDERS }, templates: { ...L.TEMPLATES } },
    groups: [{ id: 'g', name: 'Курс', price: 3000 }],
    payers: [{ id: 'p', name: 'Мама', self: false, label: 'Мама' }],
    students: [{ id: 's', name: 'Аян Б', payerId: 'p', enrollments: [{ groupId: 'g', price: 3000, billingDay: 5, start: '2026-09-05', freezes: [] }] }],
    ledger: [], receipts: [], promises: [], messages: [], bank: [], sentDays: [],
  };
}

test('billing dates: start, then monthly on billing day, clamped to month end', () => {
  assert.deepEqual(L.billingDates({ start: '2026-01-31', billingDay: 31 }, '2026-04-30'), ['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30']);
  assert.deepEqual(L.billingDates({ start: '2026-09-20', billingDay: 5 }, '2026-11-05'), ['2026-09-20', '2026-10-05', '2026-11-05']);
});

test('charges are created up to today + before, once, and skipped inside a freeze', () => {
  const st = mini('2026-10-02');
  L.runBilling(st); L.runBilling(st);
  assert.deepEqual(st.ledger.map(c => c.due), ['2026-09-05', '2026-10-05']);
  const st2 = mini('2026-10-02');
  st2.students[0].enrollments[0].freezes = [{ from: '2026-10-01', to: '2026-10-31' }];
  L.runBilling(st2);
  assert.deepEqual(st2.ledger.map(c => c.due), ['2026-09-05']);
});

test('payments close the oldest charge first; leftover becomes credit', () => {
  const st = mini('2026-10-06');
  L.runBilling(st);
  L.addPayment(st, { payerId: 'p', amount: 4000, method: 'Наличные', notify: false });
  let v = L.ledgerView(st).get('p');
  assert.deepEqual(v.charges.map(c => c.left), [0, 2000]);
  assert.equal(v.overdue, 2000);
  L.addPayment(st, { payerId: 'p', amount: 3000, method: 'Наличные', notify: false });
  v = L.ledgerView(st).get('p');
  assert.equal(v.toPay, 0); assert.equal(v.credit, 1000);
});

test('reminder schedule: 3 days before, on the day, after 3 days, repeat every 3 days, at most 2 times', () => {
  const st = mini('2026-09-05');
  L.runBilling(st);
  L.addPayment(st, { payerId: 'p', amount: 3000, method: 'Наличные', notify: false });
  const sent = [];
  while (st.today < '2026-10-25') { const r = L.advanceDay(st); r.sent.forEach(x => sent.push(st.today + ' ' + x.kind)); }
  // advanceDay reports reminders of the day it leaves, after moving: shift back one day
  const days = sent.map(s => L.addDays(s.slice(0, 10), -1) + ' ' + s.slice(11));
  assert.deepEqual(days, ['2026-10-02 before', '2026-10-05 day', '2026-10-08 late', '2026-10-11 late']);
});

test('a pending receipt or an active promise silences reminders; the promise date fires one', () => {
  const st = mini('2026-10-08');
  L.runBilling(st);
  L.addPayment(st, { payerId: 'p', amount: 3000, method: 'Наличные', notify: false });
  assert.equal(L.dueReminders(st)[0].kind, 'late');
  L.addReceipt(st, 'p', { amount: 3000, date: st.today, time: '10:00', recipient: 'Назира А.', bank: 'MBank', txn: 'X1', confidence: 0.9 });
  assert.equal(L.dueReminders(st).length, 0);
  st.receipts[0].status = 'rejected';
  L.setPromise(st, 'p', '2026-10-12', '');
  assert.equal(L.dueReminders(st).length, 0);
  st.today = '2026-10-12';
  assert.equal(L.dueReminders(st)[0].kind, 'promise');
  st.today = '2026-10-13'; L.updatePromises(st);
  assert.equal(st.promises[0].status, 'broken');
});

test('receipt checks: partial amount, foreign recipient, duplicate operation number', () => {
  const st = mini('2026-10-06');
  L.runBilling(st);
  const a = L.addReceipt(st, 'p', { amount: 5000, date: st.today, time: '10:00', recipient: 'Назира А.', bank: 'MBank', txn: 'T1', confidence: 0.95 });
  let c = L.checkReceipt(st, a);
  assert.equal(c.checks.find(x => x.key === 'amount').level, 'warn');
  assert.equal(c.verdict, 'warn');
  L.confirmReceipt(st, a.id);
  const b = L.addReceipt(st, 'p', { amount: 1000, date: st.today, time: '11:00', recipient: 'Иван П.', bank: 'MBank', txn: 'T1', confidence: 0.95 });
  c = L.checkReceipt(st, b);
  assert.equal(c.checks.find(x => x.key === 'recipient').level, 'bad');
  assert.equal(c.checks.find(x => x.key === 'txn').level, 'bad');
  assert.equal(c.verdict, 'bad');
});

test('confirming the remaining debt sends thanks and keeps the promise', () => {
  const st = mini('2026-10-08');
  L.runBilling(st);
  L.setPromise(st, 'p', '2026-10-10', '');
  L.addPayment(st, { payerId: 'p', amount: 6000, method: 'Наличные' });
  assert.equal(st.promises[0].status, 'kept');
  assert.match(st.messages.at(-1).text, /Оплата 6 000 сом получена/);
});

test('bank CSV parsing and reconciliation', () => {
  const { rows } = L.parseBankCSV('Дата;Номер операции;Отправитель;Сумма\n01.10.2026;A1;X;3 000,00\n02.10.2026;B2;Y;1500\nmusor');
  assert.deepEqual(rows.map(r => [r.date, r.txn, r.amount]), [['2026-10-01', 'A1', 3000], ['2026-10-02', 'B2', 1500]]);
  const st = mini('2026-10-06');
  L.runBilling(st);
  L.addPayment(st, { payerId: 'p', amount: 3000, method: 'Перевод', txn: 'A1', date: '2026-10-01', notify: false });
  L.addReceipt(st, 'p', { amount: 1500, date: '2026-10-02', time: '10:00', recipient: 'Назира А.', bank: 'MBank', txn: 'B2', confidence: 0.9 });
  st.bank = rows.concat([{ date: '2026-10-03', amount: 999, txn: 'Z', from: '', note: '' }]);
  const r = L.reconcile(st);
  assert.deepEqual(r.counts, { payment: 1, receipt: 1, unknown: 1, crmOnly: 0 });
  assert.equal(L.checkReceipt(st, st.receipts[0]).checks.find(x => x.key === 'bank').level, 'ok');
});

test('seed: statuses on Oct 19 match the demo scenarios', () => {
  const st = buildSeed();
  assert.equal(st.today, TODAY);
  const view = L.ledgerView(st);
  const by = {};
  for (const s of st.students) (by[L.studentInfo(st, view, s).status] ||= []).push(s.name);
  assert.deepEqual(by.review.sort(), ['Адилет Касымов', 'Айпери Маратова', 'Арсен Мамытов']);
  assert.deepEqual(by.overdue.sort(), ['Бермет Шаршеева', 'Даниэль Пак', 'Эмир Садыков']);
  assert.deepEqual(by.promised, ['Нурислам Осмонов']);
  assert.deepEqual(by.due.sort(), ['Алина Ким', 'Камила Бекова', 'София Иванова']);
  assert.deepEqual(by.frozen, ['Ясмина Рахимова']);
  assert.equal(by.paid.length, 13);
  assert.equal(view.get('p13').credit, 4000);
  assert.deepEqual(L.dueReminders(st, view).map(x => x.payerId + ':' + x.kind).sort(), ['p11:before', 'p2:before', 'p4:day', 'p7:late'].sort());
  const dup = st.receipts.find(r => r.payerId === 'p14' && r.status === 'pending');
  assert.equal(L.checkReceipt(st, dup).checks.find(x => x.key === 'txn').level, 'bad');
  st.bank = L.parseBankCSV(sampleBankCSV(st)).rows;
  const rec = L.reconcile(st);
  assert.equal(rec.counts.receipt, 2); assert.equal(rec.counts.unknown, 1); assert.equal(rec.counts.crmOnly, 0);
});

test('freeze removes upcoming charges inside it and skips new ones; unfreeze bills again', () => {
  const st = mini('2026-10-03');
  L.runBilling(st);
  assert.deepEqual(st.ledger.map(c => c.due), ['2026-09-05', '2026-10-05']);
  L.freezeStudent(st, 's', '2026-10-03', '2026-11-20');
  assert.deepEqual(st.ledger.map(c => c.due), ['2026-09-05']);
  assert.equal(L.studentInfo(st, L.ledgerView(st), st.students[0]).status, 'overdue');
  // unfrozen before the Oct 5 billing date: Oct 5 is billed again
  st.today = '2026-10-04';
  L.unfreezeStudent(st, 's');
  assert.deepEqual(st.ledger.map(c => c.due), ['2026-09-05', '2026-10-05']);
});

test('new student gets a charge on the start date', () => {
  const st = mini('2026-10-03');
  const s = L.addStudent(st, { name: 'Нур Ай', payer: { name: 'Айгуль', relation: 'мама', phone: '+996' }, groupId: 'g', start: '2026-10-03', discount: 10 });
  assert.equal(st.ledger.find(c => c.studentId === s.id).amount, 2700);
});
