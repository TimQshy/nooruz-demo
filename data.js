// Demo data. The seed is not typed in by hand: it replays July 1 – October 19
// day by day through the same logic the app uses (charges, payments, reminders),
// so balances and message history are consistent with each other.
import * as L from './logic.js';

export const TODAY = '2026-10-19';

const GROUPS = [
  { id: 'g1', name: 'Английский Kids 7–10', price: 3500, teacher: 'Айгерим С.', schedule: 'Пн, Ср 15:00', color: '#5e6ad2' },
  { id: 'g2', name: 'IELTS', price: 6000, teacher: 'Daniel R.', schedule: 'Вт, Чт 18:30', color: '#26b5ce' },
  { id: 'g3', name: 'Математика 5–6 кл', price: 3000, teacher: 'Нурлан Т.', schedule: 'Пн, Ср, Пт 14:00', color: '#f2994a' },
  { id: 'g4', name: 'Подготовка к ОРТ', price: 4500, teacher: 'Гульмира А.', schedule: 'Вт, Чт, Сб 16:00', color: '#eb5757' },
  { id: 'g5', name: 'Корейский A1', price: 4000, teacher: 'Мин Чжи', schedule: 'Сб, Вс 11:00', color: '#bb87fc' },
  { id: 'g6', name: 'Робототехника', price: 5000, teacher: 'Эрмек К.', schedule: 'Сб 13:00', color: '#4cb782' },
];

// payer: name used in greetings, relation, phone, students, behaviour.
// behaviour.offset: pays N days after the due date (negative = early)
// behaviour.stop: last period the payer pays for in the replay
const ROSTER = [
  { name: 'Гульнара', rel: 'мама', phone: '+996 700 412 118', method: 'transfer', offset: 0, kids: [['Айбек Жумабеков', 'g1', '2026-07-03'], ['Алия Жумабекова', 'g3', '2026-07-03', 10]] },
  { name: 'Алина', rel: 'сама', phone: '+996 555 230 774', offset: 1, kids: [['Алина Ким', 'g2', '2026-07-22']] },
  { name: 'Нурлан', rel: 'папа', phone: '+996 770 118 902', offset: 2, stop: '2026-09', kids: [['Эмир Садыков', 'g3', '2026-07-12']] },
  { name: 'Елена', rel: 'мама', phone: '+996 701 556 340', offset: 0, stop: '2026-09', kids: [['София Иванова', 'g1', '2026-07-19']] },
  { name: 'Бекзат', rel: 'сам', phone: '+996 552 904 117', offset: -1, kids: [['Бекзат Токтосунов', 'g4', '2026-08-01']] },
  { name: 'Чолпон', rel: 'мама', phone: '+996 708 330 215', offset: 0, stop: '2026-09', kids: [['Айпери Маратова', 'g5', '2026-07-21']] },
  { name: 'Ирина', rel: 'мама', phone: '+996 555 671 409', offset: 1, stop: '2026-09', kids: [['Даниэль Пак', 'g6', '2026-07-16']] },
  { name: 'Мээрим', rel: 'сама', phone: '+996 777 205 663', offset: 0, kids: [['Мээрим Абдыкадырова', 'g2', '2026-07-10']] },
  { name: 'Виктор', rel: 'папа', phone: '+996 700 889 021', offset: 3, kids: [['Тимур Ли', 'g6', '2026-07-25']] },
  { name: 'Айгуль', rel: 'мама', phone: '+996 559 412 870', offset: 2, stop: '2026-08', kids: [['Нурислам Осмонов', 'g3', '2026-07-28']] },
  { name: 'Динара', rel: 'мама', phone: '+996 703 117 554', offset: 2, stop: '2026-09', kids: [['Камила Бекова', 'g1', '2026-07-22']] },
  { name: 'Арсен', rel: 'сам', phone: '+996 551 660 238', offset: 0, stop: '2026-09', kids: [['Арсен Мамытов', 'g4', '2026-07-20']] },
  { name: 'Марина', rel: 'мама', phone: '+996 700 345 990', offset: 0, stop: '2026-09', kids: [['Элина Цой', 'g5', '2026-08-07']] },
  { name: 'Улан', rel: 'папа', phone: '+996 772 018 463', offset: 1, stop: '2026-09', kids: [['Адилет Касымов', 'g3', '2026-07-14']] },
  { name: 'Зарина', rel: 'мама', phone: '+996 708 902 341', offset: 0, kids: [['Ясмина Рахимова', 'g1', '2026-07-15']], freeze: { from: '2026-10-10', to: '2026-11-10', note: 'Болеет' } },
  { name: 'Илья', rel: 'сам', phone: '+996 555 784 120', offset: 0, kids: [['Илья Смирнов', 'g2', '2026-08-02']] },
  { name: 'Бактыгуль', rel: 'мама', phone: '+996 700 671 885', offset: 0, kids: [['Айжан Турдубаева', 'g4', '2026-07-30']] },
  { name: 'Рустам', rel: 'папа', phone: '+996 559 231 076', offset: 1, kids: [['Марсель Ахмедов', 'g6', '2026-08-04'], ['Амир Ахмедов', 'g1', '2026-08-04', 10]] },
  { name: 'Бермет', rel: 'сама', phone: '+996 777 450 312', offset: 0, stop: '2026-09', kids: [['Бермет Шаршеева', 'g5', '2026-07-09']] },
  { name: 'Светлана', rel: 'мама', phone: '+996 701 908 664', offset: 0, kids: [['Кирилл Юн', 'g1', '2026-08-08'], ['Кирилл Юн', 'g6', '2026-08-08']] },
  { name: 'Жылдыз', rel: 'мама', phone: '+996 552 337 819', offset: -2, kids: [['Асель Нурланова', 'g3', '2026-07-27']] },
  { name: 'Эрлан', rel: 'сам', phone: '+996 700 560 447', offset: 0, kids: [['Эрлан Байматов', 'g4', '2026-08-06']] },
];

const dayOf = s => Number(s.slice(8, 10));
const pad = n => String(n).padStart(2, '0');

export function buildSeed() {
  const st = {
    version: 2, seq: 0, today: '2026-07-01',
    center: { name: 'Нооруз', bank: 'MBank', account: '+996 700 123 456', recipient: 'Назира А.' },
    settings: { reminders: { ...L.DEFAULT_REMINDERS }, templates: { ...L.TEMPLATES } },
    groups: GROUPS.map(g => ({ ...g })),
    payers: [], students: [], ledger: [], receipts: [], promises: [], messages: [], bank: [], sentDays: [],
  };

  ROSTER.forEach((r, i) => {
    const pid = 'p' + (i + 1);
    const self = r.rel === 'сам' || r.rel === 'сама';
    st.payers.push({ id: pid, name: r.name, relation: r.rel, self, phone: r.phone, muted: false, label: self ? r.kids[0][0] : `${r.name} (${r.rel})` });
    const byName = new Map();
    r.kids.forEach(([name, g, start, disc]) => {
      const group = GROUPS.find(x => x.id === g);
      let s = byName.get(name);
      if (!s) { s = { id: 's' + (st.students.length + 1), name, payerId: pid, enrollments: [] }; byName.set(name, s); st.students.push(s); }
      s.enrollments.push({ groupId: g, price: Math.round(group.price * (1 - (disc || 0) / 100)), discount: disc || 0, billingDay: dayOf(start), start, freezes: r.freeze ? [{ ...r.freeze }] : [] });
    });
  });

  const ix = pid => Number(pid.slice(1));
  const bankOf = pid => (ix(pid) % 4 === 0 ? 'Optima' : 'MBank');
  const txnOf = (pid, n) => (bankOf(pid) === 'MBank' ? 'MB-' : 'OP-') + (51000000 + ix(pid) * 7919 + n * 104729);

  for (let d = st.today; d <= TODAY; d = L.addDays(d, 1)) {
    st.today = d;
    L.runBilling(st);
    if (d < TODAY) L.sendReminders(st);

    const view = L.ledgerView(st);
    ROSTER.forEach((r, i) => {
      const pid = 'p' + (i + 1);
      const v = view.get(pid);
      const dueToday = v.charges.filter(c => c.left > 0 && L.addDays(c.due, r.offset) === d && (!r.stop || c.period <= r.stop));
      if (!dueToday.length) return;
      const amount = dueToday.reduce((a, c) => a + c.left, 0);
      const n = st.ledger.filter(e => e.type === 'payment' && e.payerId === pid).length;
      const cash = r.method !== 'transfer' && (i + n) % 3 === 0;
      const time = `${pad(11 + (i % 8))}:${pad((i * 7) % 60)}`;
      if (cash) { L.addPayment(st, { payerId: pid, amount, method: 'Наличные', date: d, time: '' }); return; }
      const rc = L.addReceipt(st, pid, { amount, date: d, time, recipient: 'Назира А.', bank: bankOf(pid), txn: txnOf(pid, n), confidence: 0.95 });
      L.confirmReceipt(st, rc.id, `${pad(11 + (i % 8) + 1)}:05`);
    });

    // Scenario events
    if (d === '2026-10-10') {
      L.addPayment(st, { payerId: 'p19', amount: 2000, method: 'Наличные', date: d, time: '16:20' });
      L.setPromise(st, 'p10', '2026-10-25', 'После зарплаты, сказала по телефону');
    }
    if (d === '2026-10-07') {
      const rc = L.addReceipt(st, 'p13', { amount: 8000, date: d, time: '13:40', recipient: 'Назира А.', bank: 'MBank', txn: 'MB-57731940', confidence: 0.96 });
      L.confirmReceipt(st, rc.id, '14:02');
    }
    if (d === '2026-10-17') {
      const dup = st.ledger.filter(e => e.type === 'payment' && e.payerId === 'p1' && e.txn).pop();
      L.addReceipt(st, 'p14', { amount: 3000, date: '2026-10-17', time: '14:03', recipient: 'Назира А.', bank: 'MBank', txn: dup.txn, confidence: 0.91 });
    }
    if (d === '2026-10-18') {
      L.addReceipt(st, 'p12', { amount: 4000, date: d, time: '21:15', recipient: 'Назира А.', bank: 'Optima', txn: 'OP-77301225', confidence: 0.94 });
    }
    if (d === TODAY) {
      L.addReceipt(st, 'p6', { amount: 4000, date: d, time: '09:12', recipient: 'Назира А.', bank: 'MBank', txn: 'MB-58210934', confidence: 0.97 });
      L.pushMessage(st, { payerId: 'p9', dir: 'in', kind: 'text', text: 'Здравствуйте! Можно в этом месяце оплатить 30-го? Зарплату задерживают.', time: '08:51' });
    }
    L.updatePromises(st);
  }
  return st;
}

// A sample MBank-style statement for October: every transfer the center really
// received, two of the pending receipts, and one transfer nobody claimed.
export function sampleBankCSV(st) {
  const fmt = s => s.split('-').reverse().join('.');
  const lines = ['Дата;Номер операции;Отправитель;Назначение;Сумма'];
  const payments = st.ledger.filter(e => e.type === 'payment' && e.txn && e.date >= '2026-10-01');
  for (const p of payments) {
    const payer = st.payers.find(x => x.id === p.payerId);
    lines.push(`${fmt(p.date)};${p.txn};${payer.name.toUpperCase()} ${payer.phone.slice(-3)};Перевод по номеру телефона;${p.amount.toFixed(2).replace('.', ',')}`);
  }
  // The duplicate receipt (p14) has no bank row: that money never arrived.
  for (const r of st.receipts.filter(x => x.status === 'pending' && x.payerId !== 'p14')) {
    const payer = st.payers.find(x => x.id === r.payerId);
    lines.push(`${fmt(r.date)};${r.txn};${payer.name.toUpperCase()};Перевод по номеру телефона;${r.amount.toFixed(2).replace('.', ',')}`);
  }
  lines.push('16.10.2026;MB-56610042;АСАНОВ Т.;за учебу;3000,00');
  return lines.join('\n');
}
