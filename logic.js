// Business logic of the Nooruz demo. Pure functions over a plain state object,
// no DOM access, so the same code runs in the browser and in node tests.
//
// Model
// - payer: who pays and receives WhatsApp messages (a parent, or the student).
//   Siblings share one payer, so one message covers both children.
// - student.enrollments[]: a group with a monthly price and a billing day.
// - ledger: charges (one per enrollment per month) and payments.
//   Payments are allocated to the payer's charges oldest-first (FIFO).
//   Money left over after all charges is the payer's credit.
// - receipts: photos of bank transfers from WhatsApp, read by Gemini,
//   confirmed or rejected by the admin.
// - promises: "will pay on <date>". Reminders stay silent until that date.

export const DAY_MS = 864e5;

export const parse = s => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); };
export const iso = t => new Date(t).toISOString().slice(0, 10);
export const addDays = (s, n) => iso(parse(s) + n * DAY_MS);
export const diffDays = (a, b) => Math.round((parse(a) - parse(b)) / DAY_MS);

export function addMonths(s, n, day) {
  const [y, m] = s.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1 + n, 1));
  const last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate();
  t.setUTCDate(Math.min(day, last));
  return iso(t.getTime());
}

const MONTHS = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
export const fmtDate = s => { const [, m, d] = s.split('-').map(Number); return `${d} ${MONTHS[m - 1]}`; };
export const money = n => Math.round(n).toLocaleString('ru-RU').replace(/ /g, ' ') + ' сом';

export function uid(state, prefix) { state.seq = (state.seq || 0) + 1; return `${prefix}${state.seq}`; }

export const DEFAULT_REMINDERS = {
  beforeOn: true, before: 3,   // N days before the due date
  dayOn: true,                 // on the due date
  lateOn: true, after: 3,      // N days after the due date...
  repeat: 3, lateCount: 2,     // ...then every `repeat` days, at most `lateCount` times
  time: '10:00',
};

export const TEMPLATES = {
  before: 'Здравствуйте, {имя}! Напоминаем: {дата} оплата за {за_что} — {сумма}.\nРеквизиты: {реквизиты}\nПосле оплаты пришлите, пожалуйста, фото чека в этот чат.',
  day: 'Здравствуйте, {имя}! Сегодня день оплаты за {за_что} — {сумма}.\nРеквизиты: {реквизиты}\nПосле перевода пришлите чек в этот чат.',
  late: 'Здравствуйте, {имя}! Оплата за {за_что} просрочена на {дней} дн. К оплате — {сумма}. Если вы уже оплатили, пришлите чек, мы проверим.',
  promise: 'Здравствуйте, {имя}! Как договаривались, сегодня ждём оплату {сумма} за {за_что}.\nРеквизиты: {реквизиты}',
  ack: 'Спасибо, чек получили! Администратор подтвердит оплату в течение дня.',
  thanks: 'Оплата {сумма} получена. Спасибо!{остаток}',
  reject: 'Не получилось подтвердить чек: {причина}. Пришлите, пожалуйста, другой чек или напишите нам.',
};

// ---------- billing

export const isFrozen = (enr, date) => (enr.freezes || []).some(f => date >= f.from && date <= f.to);
export const isActive = (enr, date) => enr.start <= date && (!enr.end || enr.end >= date);

// First charge on the start date, then every month on billingDay.
export function billingDates(enr, until) {
  const out = [];
  const end = enr.end && enr.end < until ? enr.end : until;
  if (enr.start > end) return out;
  out.push(enr.start);
  let next = addMonths(enr.start, 0, enr.billingDay);
  if (next <= enr.start) next = addMonths(enr.start, 1, enr.billingDay);
  while (next <= end) { out.push(next); next = addMonths(next, 1, enr.billingDay); }
  return out;
}

// Creates charges up to `today + before`, so the "N days before" reminder
// already has a charge to talk about. A billing date inside a freeze is skipped.
export function runBilling(state) {
  const until = addDays(state.today, state.settings.reminders.before);
  const have = new Set(state.ledger.filter(e => e.type === 'charge').map(e => e.id));
  let created = 0;
  for (const s of state.students) {
    for (const e of s.enrollments) {
      for (const d of billingDates(e, until)) {
        const id = `ch:${s.id}:${e.groupId}:${d}`;
        if (have.has(id) || isFrozen(e, d)) continue;
        state.ledger.push({ id, type: 'charge', payerId: s.payerId, studentId: s.id, groupId: e.groupId, amount: e.price, due: d, period: d.slice(0, 7) });
        have.add(id); created++;
      }
    }
  }
  return created;
}

// ---------- balances

export function ledgerView(state) {
  const today = state.today;
  const by = new Map(state.payers.map(p => [p.id, { payerId: p.id, charges: [], payments: [], paid: 0, credit: 0, overdue: 0, dueSoon: 0, toPay: 0 }]));
  for (const e of state.ledger) {
    const v = by.get(e.payerId); if (!v) continue;
    if (e.type === 'charge') v.charges.push({ ...e, left: e.amount });
    else if (e.type === 'payment') { v.paid += e.amount; v.payments.push(e); }
  }
  for (const v of by.values()) {
    v.charges.sort((a, b) => (a.due < b.due ? -1 : a.due > b.due ? 1 : a.id < b.id ? -1 : 1));
    let pool = v.paid;
    for (const c of v.charges) { const x = Math.min(pool, c.amount); c.left = c.amount - x; pool -= x; }
    v.credit = pool;
    for (const c of v.charges) {
      if (!c.left) continue;
      if (c.due < today) v.overdue += c.left; else v.dueSoon += c.left;
    }
    v.toPay = v.overdue + v.dueSoon;
    const first = v.charges.find(c => c.left > 0 && c.due < today);
    v.daysOverdue = first ? diffDays(today, first.due) : 0;
  }
  return by;
}

export const pendingReceipt = (state, payerId) => state.receipts.find(r => r.payerId === payerId && r.status === 'pending');
export const activePromise = (state, payerId) => state.promises.find(p => p.payerId === payerId && p.status === 'active');

export const STATUS_ORDER = ['review', 'overdue', 'promised', 'due', 'frozen', 'paid'];
export const STATUS_LABEL = { review: 'Чек на проверке', overdue: 'Просрочено', promised: 'Обещали оплатить', due: 'Скоро оплата', frozen: 'Заморозка', paid: 'Оплачено' };

export function studentInfo(state, view, s) {
  const today = state.today;
  const v = view.get(s.payerId);
  const mine = v.charges.filter(c => c.studentId === s.id);
  const unpaid = mine.filter(c => c.left > 0);
  const overdue = unpaid.filter(c => c.due < today);
  const owe = unpaid.reduce((a, c) => a + c.left, 0);
  const active = s.enrollments.filter(e => isActive(e, today) || e.start > today);
  const frozen = active.length > 0 && active.every(e => isFrozen(e, today));
  const promise = activePromise(state, s.payerId);
  let status;
  if (pendingReceipt(state, s.payerId)) status = 'review';
  else if (overdue.length) status = promise ? 'promised' : 'overdue';
  else if (unpaid.length) status = 'due';
  else if (frozen) status = 'frozen';
  else status = 'paid';
  return { status, owe, unpaid, overdue, frozen, promise, daysOverdue: overdue.length ? diffDays(today, overdue[0].due) : 0, nextDue: unpaid.length ? unpaid[0].due : nextBilling(s, today), credit: v.credit };
}

export function nextBilling(s, today) {
  let best = null;
  for (const e of s.enrollments) {
    const d = billingDates(e, addDays(today, 70)).find(x => x > today && !isFrozen(e, x));
    if (d && (!best || d < best)) best = d;
  }
  return best;
}

// ---------- promises

export function setPromise(state, payerId, date, note) {
  for (const p of state.promises) if (p.payerId === payerId && p.status === 'active') p.status = 'replaced';
  const p = { id: uid(state, 'pr'), payerId, date, note: note || '', created: state.today, status: 'active' };
  state.promises.push(p);
  return p;
}

// active -> kept when nothing is overdue any more, -> broken when the date passed.
export function updatePromises(state, view = ledgerView(state)) {
  for (const p of state.promises) {
    if (p.status !== 'active') continue;
    if (view.get(p.payerId).overdue === 0) p.status = 'kept';
    else if (p.date < state.today) { p.status = 'broken'; p.seen = false; }
  }
}

// ---------- messages

export function payerItems(state, payerId, charges) {
  const payer = state.payers.find(p => p.id === payerId);
  const seen = new Set(); const out = [];
  for (const c of charges) {
    const key = c.studentId + ':' + c.groupId; if (seen.has(key)) continue; seen.add(key);
    const s = state.students.find(x => x.id === c.studentId);
    const g = state.groups.find(x => x.id === c.groupId);
    out.push(payer.self ? `«${g.name}»` : `${s.name.split(' ')[0]} — «${g.name}»`);
  }
  return out.join(', ');
}

export const requisites = state => `${state.center.bank} · ${state.center.account} · ${state.center.recipient}`;

export function renderTemplate(state, kind, payerId, extra = {}) {
  const payer = state.payers.find(p => p.id === payerId);
  const v = extra.view ? extra.view.get(payerId) : ledgerView(state).get(payerId);
  const unpaid = v.charges.filter(c => c.left > 0);
  const vars = {
    'имя': payer.name,
    'сумма': money(extra.amount != null ? extra.amount : v.toPay),
    'дата': unpaid.length ? fmtDate(unpaid[0].due) : '',
    'за_что': payerItems(state, payerId, unpaid.length ? unpaid : v.charges.slice(-1)),
    'реквизиты': requisites(state),
    'дней': String(extra.days != null ? extra.days : v.daysOverdue),
    'причина': extra.reason || '',
    'остаток': extra.rest || '',
    'центр': state.center.name,
  };
  const tpl = (state.settings.templates || TEMPLATES)[kind] || TEMPLATES[kind];
  return tpl.replace(/\{([^{}]+)\}/g, (m, k) => (k in vars ? vars[k] : m));
}

export function pushMessage(state, m) {
  const msg = { id: uid(state, 'm'), date: state.today, ...m };
  state.messages.push(msg);
  return msg;
}

// Which payers get a reminder today, and which kind. One message per payer per day.
export function dueReminders(state, view = ledgerView(state)) {
  const r = state.settings.reminders, today = state.today, out = [];
  for (const p of state.payers) {
    if (p.muted || pendingReceipt(state, p.id)) continue;
    const unpaid = view.get(p.id).charges.filter(c => c.left > 0);
    if (!unpaid.length) continue;
    const pr = activePromise(state, p.id);
    if (pr) { if (pr.date === today) out.push({ payerId: p.id, kind: 'promise' }); continue; }
    const delta = diffDays(today, unpaid[0].due);
    let kind = null;
    if (r.beforeOn && delta === -r.before) kind = 'before';
    else if (r.dayOn && delta === 0) kind = 'day';
    else if (r.lateOn && delta >= r.after && (delta - r.after) % r.repeat === 0 && (delta - r.after) / r.repeat < r.lateCount) kind = 'late';
    if (kind) out.push({ payerId: p.id, kind, days: Math.max(0, delta) });
  }
  return out;
}

export const remindersSentToday = state => (state.sentDays || []).includes(state.today);

export function sendReminders(state, time) {
  if (remindersSentToday(state)) return [];
  const view = ledgerView(state);
  const list = dueReminders(state, view);
  for (const x of list) pushMessage(state, { payerId: x.payerId, dir: 'out', kind: x.kind, text: renderTemplate(state, x.kind, x.payerId, { view, days: x.days }), time: time || state.settings.reminders.time });
  (state.sentDays = state.sentDays || []).push(state.today);
  return list;
}

// Moves the demo clock: sends today's reminders if they were not sent yet,
// then starts the next day and creates its charges.
export function advanceDay(state) {
  const sent = sendReminders(state);
  state.today = addDays(state.today, 1);
  const charges = runBilling(state);
  updatePromises(state);
  return { sent, charges, today: state.today };
}

// ---------- payments and receipts

export function addPayment(state, { payerId, amount, method, txn = '', receiptId = null, date = state.today, notify = true, time = '' }) {
  const p = { id: uid(state, 'pm'), type: 'payment', payerId, amount, date, method, txn, receiptId };
  state.ledger.push(p);
  const view = ledgerView(state);
  updatePromises(state, view);
  if (notify) {
    const v = view.get(payerId);
    const rest = v.toPay > 0 ? ` Осталось оплатить ${money(v.toPay)}.` : v.credit > 0 ? ` На балансе ${money(v.credit)}, зачтём в следующий месяц.` : '';
    pushMessage(state, { payerId, dir: 'out', kind: 'thanks', text: renderTemplate(state, 'thanks', payerId, { view, amount, rest }), time, date });
  }
  return p;
}

export function addReceipt(state, payerId, data, { ack = true } = {}) {
  const r = { id: uid(state, 'rc'), payerId, status: 'pending', received: state.today, ...data };
  state.receipts.push(r);
  pushMessage(state, { payerId, dir: 'in', kind: 'receipt', receiptId: r.id, time: data.time, date: data.date || state.today });
  if (ack) pushMessage(state, { payerId, dir: 'out', kind: 'ack', text: renderTemplate(state, 'ack', payerId), time: data.time, date: data.date || state.today });
  return r;
}

const norm = s => String(s || '').toLowerCase().replace(/[\s.]/g, '');

export function matchBank(state, r) {
  const usedByPayment = new Set(state.ledger.filter(e => e.type === 'payment' && e.txn).map(e => e.txn));
  return state.bank.find(b => b.txn && b.txn === r.txn) ||
    state.bank.find(b => b.amount === r.amount && b.date === r.date && !usedByPayment.has(b.txn));
}

// What the admin sees next to a receipt. level: ok | warn | bad | info | none
export function checkReceipt(state, r, view = ledgerView(state)) {
  const v = view.get(r.payerId);
  const expected = v.toPay;
  const checks = [];
  if (expected === 0) checks.push({ key: 'amount', level: 'info', label: 'Сумма', text: `${money(r.amount)} — долга нет, уйдёт на баланс` });
  else if (r.amount === expected) checks.push({ key: 'amount', level: 'ok', label: 'Сумма', text: `${money(r.amount)} — совпадает с суммой к оплате` });
  else if (r.amount < expected) checks.push({ key: 'amount', level: 'warn', label: 'Сумма', text: `${money(r.amount)} — меньше на ${money(expected - r.amount)}, останется долг` });
  else checks.push({ key: 'amount', level: 'info', label: 'Сумма', text: `${money(r.amount)} — больше на ${money(r.amount - expected)}, уйдёт на баланс` });

  const ourName = norm(state.center.recipient) === norm(r.recipient);
  checks.push({ key: 'recipient', level: ourName ? 'ok' : 'bad', label: 'Получатель', text: ourName ? `${r.recipient} — наши реквизиты` : `${r.recipient} — не наши реквизиты` });

  const age = diffDays(state.today, r.date);
  checks.push(age < 0 ? { key: 'date', level: 'bad', label: 'Дата', text: `${fmtDate(r.date)} — дата в будущем` }
    : age > 7 ? { key: 'date', level: 'bad', label: 'Дата', text: `${fmtDate(r.date)} — чеку ${age} дн.` }
    : { key: 'date', level: 'ok', label: 'Дата', text: `${fmtDate(r.date)}, ${r.time} — свежий` });

  const dupPay = state.ledger.find(e => e.type === 'payment' && e.txn && e.txn === r.txn);
  const dupRec = state.receipts.find(x => x.id !== r.id && x.txn === r.txn && x.status !== 'rejected' && !(dupPay && x.id === dupPay.receiptId));
  if (dupPay) {
    const who = state.payers.find(p => p.id === dupPay.payerId);
    checks.push({ key: 'txn', level: 'bad', label: '№ операции', text: `${r.txn} — уже засчитан: ${who.label}, ${fmtDate(dupPay.date)}` });
  } else if (dupRec) checks.push({ key: 'txn', level: 'bad', label: '№ операции', text: `${r.txn} — этот чек уже присылали` });
  else checks.push({ key: 'txn', level: 'ok', label: '№ операции', text: `${r.txn} — встречается впервые` });

  if (!state.bank.length) checks.push({ key: 'bank', level: 'none', label: 'Выписка', text: 'не загружена — сверьте в банке вручную' });
  else checks.push(matchBank(state, r) ? { key: 'bank', level: 'ok', label: 'Выписка', text: 'деньги есть в выписке банка' } : { key: 'bank', level: 'warn', label: 'Выписка', text: 'в выписке такой операции нет' });

  if (r.confidence < 0.8) checks.push({ key: 'conf', level: 'warn', label: 'Распознавание', text: `уверенность ${Math.round(r.confidence * 100)}% — чек плохо видно` });

  const levels = checks.map(c => c.level);
  const verdict = levels.includes('bad') ? 'bad' : levels.includes('warn') ? 'warn' : levels.includes('none') ? 'ok' : 'strong';
  return { checks, verdict, expected };
}

export function confirmReceipt(state, id, time = '') {
  const r = state.receipts.find(x => x.id === id);
  if (!r || r.status !== 'pending') return null;
  r.status = 'confirmed'; r.decided = state.today;
  return addPayment(state, { payerId: r.payerId, amount: r.amount, method: `Перевод · ${r.bank}`, txn: r.txn, receiptId: r.id, date: r.date, time });
}

export function rejectReceipt(state, id, reason, time = '') {
  const r = state.receipts.find(x => x.id === id);
  if (!r || r.status !== 'pending') return null;
  r.status = 'rejected'; r.reason = reason; r.decided = state.today;
  pushMessage(state, { payerId: r.payerId, dir: 'out', kind: 'reject', text: renderTemplate(state, 'reject', r.payerId, { reason }), time });
  return r;
}

export function unansweredQuestions(state) {
  return state.messages.filter(m => m.dir === 'in' && m.kind === 'text' && !m.answered);
}

export function reply(state, payerId, text, time = '') {
  for (const m of state.messages) if (m.payerId === payerId && m.dir === 'in' && m.kind === 'text') m.answered = true;
  return pushMessage(state, { payerId, dir: 'out', kind: 'admin', text, time });
}

// ---------- bank statement

export function parseAmount(s) { return Number(String(s).replace(/[\s ]/g, '').replace(',', '.')) || 0; }
export function parseDateCell(s) {
  s = String(s).trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})/); if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return '';
}

function splitCSVLine(line, sep) {
  const out = []; let cur = ''; let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) { if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; }
    else if (ch === '"') q = true;
    else if (ch === sep) { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out.map(x => x.trim());
}

// Accepts a bank CSV export with a header row. Columns are found by name:
// date (дата), amount (сумма / приход), payer (отправитель / плательщик),
// purpose (назначение / комментарий), operation number (номер / операц / id).
export function parseBankCSV(text) {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { rows: [], error: 'В файле нет строк с операциями' };
  const sep = (lines[0].match(/;/g) || []).length >= (lines[0].match(/,/g) || []).length ? ';' : ',';
  const head = splitCSVLine(lines[0], sep).map(h => h.toLowerCase());
  const col = re => head.findIndex(h => re.test(h));
  const ci = { date: col(/дата|date/), amount: col(/сумм|приход|amount/), from: col(/отправ|плательщ|from|payer/), note: col(/назнач|коммент|описан|note/), txn: col(/номер|операц|id|txn/) };
  if (ci.date < 0 || ci.amount < 0) return { rows: [], error: 'Не нашли колонки «Дата» и «Сумма»' };
  const rows = [];
  for (const line of lines.slice(1)) {
    const c = splitCSVLine(line, sep);
    const date = parseDateCell(c[ci.date]); const amount = parseAmount(c[ci.amount]);
    if (!date || amount <= 0) continue;
    rows.push({ date, amount, from: ci.from >= 0 ? c[ci.from] : '', note: ci.note >= 0 ? c[ci.note] : '', txn: ci.txn >= 0 ? c[ci.txn] : '' });
  }
  return { rows, error: rows.length ? '' : 'Не нашли входящих операций' };
}

// Each bank row is: a payment already in CRM, a pending receipt waiting for it, or unknown.
// Transfers in CRM within the statement dates that are missing in the bank are listed too.
export function reconcile(state) {
  if (!state.bank.length) return { rows: [], crmOnly: [], counts: { payment: 0, receipt: 0, unknown: 0, crmOnly: 0 } };
  const payments = state.ledger.filter(e => e.type === 'payment' && e.txn);
  const pending = state.receipts.filter(r => r.status === 'pending');
  const used = new Set();
  const rows = state.bank.map(b => {
    const p = payments.find(x => x.txn === b.txn);
    if (p) { used.add(p.id); return { ...b, kind: 'payment', ref: p }; }
    const r = pending.find(x => x.txn === b.txn) || pending.find(x => x.amount === b.amount && x.date === b.date);
    if (r) return { ...b, kind: 'receipt', ref: r };
    return { ...b, kind: 'unknown' };
  });
  const from = state.bank.reduce((a, b) => (b.date < a ? b.date : a), state.bank[0].date);
  const to = state.bank.reduce((a, b) => (b.date > a ? b.date : a), state.bank[0].date);
  const crmOnly = payments.filter(p => !used.has(p.id) && p.date >= from && p.date <= to);
  const counts = { payment: 0, receipt: 0, unknown: 0, crmOnly: crmOnly.length };
  rows.forEach(r => counts[r.kind]++);
  return { rows, crmOnly, counts, from, to };
}

// ---------- reports

export function monthReport(state, period) {
  const charges = state.ledger.filter(e => e.type === 'charge' && e.period === period);
  const payments = state.ledger.filter(e => e.type === 'payment' && e.date.slice(0, 7) === period);
  return {
    charged: charges.reduce((a, c) => a + c.amount, 0),
    collected: payments.reduce((a, p) => a + p.amount, 0),
    cash: payments.filter(p => !p.txn).reduce((a, p) => a + p.amount, 0),
    payments: payments.slice().sort((a, b) => (a.date < b.date ? 1 : -1)),
  };
}

export function debtors(state, view = ledgerView(state)) {
  return state.payers.map(p => ({ payer: p, v: view.get(p.id), promise: activePromise(state, p.id), last: [...state.messages].reverse().find(m => m.payerId === p.id && m.dir === 'out' && ['before', 'day', 'late', 'promise'].includes(m.kind)) }))
    .filter(x => x.v.overdue > 0)
    .sort((a, b) => b.v.daysOverdue - a.v.daysOverdue);
}

// ---------- students

// Freezes every current group of a student. Charges inside the freeze that
// were already created for upcoming dates are removed, past ones stay.
export function freezeStudent(state, studentId, from, to, note = '') {
  const s = state.students.find(x => x.id === studentId);
  for (const e of s.enrollments) if (!e.end || e.end >= from) (e.freezes = e.freezes || []).push({ from, to, note });
  state.ledger = state.ledger.filter(c => !(c.type === 'charge' && c.studentId === studentId && c.due >= state.today && c.due >= from && c.due <= to));
}

export function unfreezeStudent(state, studentId) {
  const s = state.students.find(x => x.id === studentId);
  const y = addDays(state.today, -1);
  for (const e of s.enrollments) e.freezes = (e.freezes || []).filter(f => f.to < state.today || f.from <= y).map(f => (f.to >= state.today ? { ...f, to: y } : f));
  runBilling(state);
}

export function addStudent(state, { name, payerId, payer, groupId, start, discount = 0 }) {
  if (!payerId) {
    payerId = uid(state, 'p');
    const self = payer.relation === 'сам' || payer.relation === 'сама';
    state.payers.push({ id: payerId, name: self ? name.split(' ')[0] : payer.name, relation: payer.relation, self, phone: payer.phone, muted: false, label: self ? name : `${payer.name} (${payer.relation})` });
  }
  const g = state.groups.find(x => x.id === groupId);
  const s = { id: uid(state, 's'), name, payerId, enrollments: [{ groupId, price: Math.round(g.price * (1 - discount / 100)), discount, billingDay: Number(start.slice(8, 10)), start, freezes: [] }] };
  state.students.push(s);
  runBilling(state);
  return s;
}
