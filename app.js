import * as L from './logic.js';
import { buildSeed, sampleBankCSV } from './data.js';

const KEY = 'nooruz-demo-v2';
const load = () => { try { const s = JSON.parse(localStorage.getItem(KEY)); return s && s.version === 2 ? s : null; } catch { return null; } };
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* private mode */ } };
const remember = (k, v) => { try { localStorage.setItem(KEY + ':' + k, v); } catch { /* ignore */ } };
const recall = k => { try { return localStorage.getItem(KEY + ':' + k); } catch { return null; } };

let S = load() || buildSeed();
const ui = { page: recall('page') || 'inbox', sel: null, peek: null, tab: 'charges', form: null, q: '', group: '', collapsed: { paid: true }, more: false, month: S.today.slice(0, 7), pal: null, typing: {}, bankCollapsed: { payment: true } };
let V = null;
const view = () => V || (V = L.ledgerView(S));
const commit = () => { V = null; save(); render(); };

// ---------- helpers
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = L.money;
const fd = L.fmtDate;
const WD = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
const MONTH_FULL = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const weekday = s => WD[new Date(L.parse(s)).getUTCDay()];
const pad = n => String(n).padStart(2, '0');
const now = () => { const d = new Date(); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
const payer = id => S.payers.find(p => p.id === id);
const student = id => S.students.find(s => s.id === id);
const group = id => S.groups.find(g => g.id === id);
const kids = pid => S.students.filter(s => s.payerId === pid);
const plural = (n, a, b, c) => { const m10 = n % 10, m100 = n % 100; return m10 === 1 && m100 !== 11 ? a : m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20) ? b : c; };

const IC = {
  inbox: '<path d="M2 9.5h3l1 2h4l1-2h3"/><path d="M3.6 3h8.8L14 9.5V13H2V9.5z"/>',
  students: '<circle cx="6" cy="5.5" r="2.5"/><path d="M1.5 13.5c.6-2.6 2.3-4 4.5-4s3.9 1.4 4.5 4"/><path d="M11 3.2a2.5 2.5 0 0 1 0 4.6M12.5 9.8c1.2.5 1.8 1.6 2 3.7"/>',
  debtors: '<path d="M8 1.8 14.5 13.5h-13z"/><path d="M8 6.5v3M8 11.5v.01"/>',
  payments: '<rect x="1.5" y="3.5" width="13" height="9" rx="1.5"/><path d="M1.5 6.5h13M4 10h3"/>',
  bank: '<path d="M2 6 8 2.5 14 6"/><path d="M3 6.5v5M6.3 6.5v5M9.7 6.5v5M13 6.5v5M2 13.5h12"/>',
  settings: '<circle cx="8" cy="8" r="2.2"/><path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4"/>',
  search: '<circle cx="7" cy="7" r="4.5"/><path d="m10.5 10.5 3 3"/>',
  close: '<path d="M4 4l8 8M12 4l-8 8"/>',
  chev: '<path d="M4 6l4 4 4-4"/>',
  more: '<path d="M3 8h.01M8 8h.01M13 8h.01" stroke-width="2.4"/>',
  next: '<path d="M3 8h10M9 4l4 4-4 4"/>',
  chat: '<path d="M2.5 13.5l.9-2.6A5.5 5.5 0 1 1 5.6 13z"/>',
  back: '<path d="M10 3 5 8l5 5"/>',
  plus: '<path d="M8 3v10M3 8h10"/>',
  send: '<path d="M2 8h11M9 4l4 4-4 4"/>',
};
const icon = (k, cls = '') => `<svg class="${cls}" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[k]}</svg>`;

const SI = {
  paid: '<circle cx="7" cy="7" r="6" fill="var(--st-paid)"/><path d="M4.3 7.2l1.8 1.8 3.6-3.8" stroke="#fff" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  due: '<circle cx="7" cy="7" r="5.4" stroke="var(--st-due)" stroke-width="1.5" fill="none"/><path d="M7 3.6a3.4 3.4 0 0 1 0 6.8z" fill="var(--st-due)"/>',
  overdue: '<circle cx="7" cy="7" r="6" fill="var(--st-over)"/><path d="M7 3.9v3.5M7 9.8v.1" stroke="#fff" stroke-width="1.7" stroke-linecap="round"/>',
  review: '<circle cx="7" cy="7" r="5.4" stroke="var(--st-rev)" stroke-width="1.5" fill="none"/><circle cx="7" cy="7" r="2.3" fill="var(--st-rev)"/>',
  promised: '<circle cx="7" cy="7" r="5.4" stroke="var(--st-prom)" stroke-width="1.5" fill="none"/><path d="M7 4.3V7l1.9 1.2" stroke="var(--st-prom)" stroke-width="1.5" fill="none" stroke-linecap="round"/>',
  frozen: '<circle cx="7" cy="7" r="5.4" stroke="var(--st-frozen)" stroke-width="1.5" stroke-dasharray="2.1 1.9" fill="none"/>',
  question: '<path d="M2 12.5l.8-2.3A5.3 5.3 0 1 1 4.9 12z" stroke="var(--accent)" stroke-width="1.5" fill="none" stroke-linejoin="round"/>',
  upcoming: '<circle cx="7" cy="7" r="5.4" stroke="var(--text-3)" stroke-width="1.5" fill="none"/>',
};
const si = k => `<svg class="si" viewBox="0 0 14 14" aria-hidden="true">${SI[k]}</svg>`;
const label = g => `<span class="label"><i style="background:${g.color}"></i>${esc(g.name)}</span>`;

const KIND = { before: () => `За ${S.settings.reminders.before} дн.`, day: () => 'День оплаты', late: () => 'Просрочка', promise: () => 'Обещание' };

function info(s) { return L.studentInfo(S, view(), s); }
function whenText(i) {
  if (i.status === 'overdue' || i.status === 'promised') return { t: `${i.daysOverdue} дн.`, bad: i.status === 'overdue' };
  if (i.status === 'frozen') return { t: 'пауза' };
  if (!i.nextDue) return { t: '—' };
  const d = L.diffDays(i.nextDue, S.today);
  if (i.status === 'paid') return { t: fd(i.nextDue) };
  return { t: d === 0 ? 'сегодня' : d === 1 ? 'завтра' : d > 0 ? `через ${d} дн.` : `${-d} дн.`, bad: d < 0 };
}
function amtText(i) {
  if (i.owe > 0) return money(i.owe);
  if (i.credit > 0) return `<span class="t3">+${money(i.credit)}</span>`;
  return '<span class="t3">—</span>';
}

// ---------- inbox
function inboxItems() {
  const v = view();
  const items = [];
  for (const r of S.receipts.filter(x => x.status === 'pending')) {
    const c = L.checkReceipt(S, r, v);
    items.push({ id: r.id, type: 'receipt', payerId: r.payerId, date: r.date, time: r.time, icon: 'review', title: payer(r.payerId).label, sub: `Чек на ${money(r.amount)} · ${c.verdict === 'bad' ? 'есть ошибки' : c.verdict === 'warn' ? 'есть расхождения' : 'всё сходится'}` });
  }
  for (const m of L.unansweredQuestions(S)) items.push({ id: m.id, type: 'question', payerId: m.payerId, date: m.date, time: m.time, icon: 'question', title: payer(m.payerId).label, sub: m.text });
  for (const p of S.promises.filter(x => x.status === 'broken' && !x.seen)) items.push({ id: p.id, type: 'broken', payerId: p.payerId, date: p.date, time: '', icon: 'overdue', title: payer(p.payerId).label, sub: `Обещали оплатить ${fd(p.date)} и не оплатили` });
  for (const p of S.promises.filter(x => x.status === 'active' && x.date === S.today)) items.push({ id: p.id, type: 'promiseToday', payerId: p.payerId, date: p.date, time: '', icon: 'promised', title: payer(p.payerId).label, sub: `Сегодня обещали оплатить ${money(v.get(p.payerId).toPay)}` });
  return items.sort((a, b) => (a.date + a.time < b.date + b.time ? 1 : -1));
}

function todayCard() {
  if (L.remindersSentToday(S)) {
    const n = S.messages.filter(m => m.date === S.today && ['before', 'day', 'late', 'promise'].includes(m.kind)).length;
    return `<div class="today-card"><div class="h">${si('paid')} Напоминания за сегодня отправлены: ${n}</div><small class="t3">Следующие уйдут завтра в ${esc(S.settings.reminders.time)}. Нажмите «Следующий день», чтобы проверить.</small></div>`;
  }
  const list = L.dueReminders(S, view());
  if (!list.length) return `<div class="today-card"><div class="h">${si('upcoming')} Сегодня напоминать некому</div></div>`;
  return `<div class="today-card"><div class="h">${icon('chat', 'si')} Сегодня в ${esc(S.settings.reminders.time)} бот напомнит ${list.length} ${plural(list.length, 'семье', 'семьям', 'семьям')}</div>
    <ul>${list.map(x => `<li><span class="k">${KIND[x.kind]()}</span>${esc(payer(x.payerId).label)}</li>`).join('')}</ul>
    <div class="acts"><button class="btn" data-act="send-now">Отправить сейчас</button></div></div>`;
}

function pageInbox() {
  const items = inboxItems();
  const desktop = matchMedia('(min-width: 761px)').matches;
  if (ui.sel && !items.find(i => i.id === ui.sel)) ui.sel = null;
  const selId = ui.sel || (desktop && items[0] ? items[0].id : null);
  const sel = items.find(i => i.id === selId);
  return {
    title: 'Входящие', crumb: items.length ? `${items.length} ${plural(items.length, 'задача', 'задачи', 'задач')}` : '',
    body: `<div class="split ${ui.sel ? 'has-sel' : ''}"><div class="list" id="scroll">${todayCard()}
      ${items.length ? items.map(i => `<button class="inbox-row ${i.id === selId ? 'sel' : ''}" data-act="inbox-sel" data-id="${i.id}">${si(i.icon)}<span class="t">${esc(i.title)}</span><span class="d">${i.date === S.today ? (i.time || 'сегодня') : fd(i.date)}</span><span class="s">${esc(i.sub)}</span></button>`).join('')
      : `<div class="empty"><b>Всё разобрано</b>Новые чеки и вопросы родителей появятся здесь.</div>`}
    </div><div class="detail">${sel ? inboxDetail(sel) : `<div class="empty"><b>Нет задач</b>Попробуйте прислать чек от имени родителя в карточке ученика, вкладка «Симуляция».</div>`}</div></div>`,
  };
}

function receiptPic(r, sm) {
  return `<div class="receipt ${sm ? 'sm' : ''}" role="img" aria-label="Фото чека"><span class="wm">демо</span><div class="ck">✓</div><div class="t">Перевод выполнен</div><div class="a">${money(r.amount)}</div>
    <div class="r"><span>Получатель</span><span>${esc(r.recipient)}</span></div><div class="r"><span>Банк</span><span>${esc(r.bank)}</span></div>
    <div class="r"><span>Дата</span><span>${r.date.split('-').reverse().join('.')} ${esc(r.time)}</span></div><div class="r"><span>№ операции</span><span>${esc(r.txn)}</span></div></div>`;
}

function inboxDetail(it) {
  const p = payer(it.payerId);
  const ks = kids(p.id);
  const kidsLine = ks.map(s => `${esc(s.name)} · ${s.enrollments.map(e => esc(group(e.groupId).name)).join(', ')}`).join('<br>');
  const back = `<button class="btn ghost show-m" data-act="inbox-back">${icon('back')} Входящие</button>`;
  if (it.type === 'receipt') {
    const r = S.receipts.find(x => x.id === it.id);
    const c = L.checkReceipt(S, r, view());
    const v = view().get(p.id);
    const rest = v.toPay - r.amount;
    const ICON = { ok: '✓', bad: '✕', warn: '!', info: 'i', none: '–' };
    const verdict = { strong: 'Всё сходится, деньги есть в выписке. Можно подтверждать.', ok: 'Всё сходится. Проверьте поступление в банке и подтвердите.', warn: 'Есть расхождения. Посмотрите внимательно перед подтверждением.', bad: 'Есть ошибки. Скорее всего, чек нужно отклонить.' }[c.verdict];
    return `<div class="doc">${back}
      <div><h2>Чек от ${esc(p.label)}</h2><div class="lead">${kidsLine}</div></div>
      <div class="receipt-wrap">${receiptPic(r)}
        <div style="display:grid;gap:10px;min-width:0">
          <div class="verdict ${c.verdict}">${verdict}</div>
          <div class="box checks">${c.checks.map(x => `<div class="check ${x.level}"><span class="ic">${ICON[x.level]}</span><span class="k">${x.label}</span><span class="v">${esc(x.text)}</span></div>`).join('')}</div>
          <details class="json"><summary>Что вернул Gemini</summary><pre>${esc(JSON.stringify({ amount: r.amount, currency: 'KGS', recipient: r.recipient, bank: r.bank, datetime: `${r.date}T${r.time}`, transaction_id: r.txn, confidence: r.confidence }, null, 2))}</pre></details>
        </div></div>
      ${ui.form === 'reject:' + r.id ? `<form class="form" data-form="reject" data-id="${r.id}"><label>Причина. Родитель получит её в WhatsApp
          <select class="select" name="reason"><option>сумма не совпадает с суммой к оплате</option><option>этот чек уже присылали</option><option>на чеке не наши реквизиты</option><option>чек плохо видно</option><option>деньги не поступили на счёт</option></select></label>
          <div class="acts"><button class="btn danger" type="submit">Отклонить и написать</button><button class="btn ghost" type="button" data-act="form-close">Отмена</button></div></form>`
      : `<div class="acts"><button class="btn primary" data-act="confirm" data-id="${r.id}">Подтвердить ${money(r.amount)}</button><button class="btn" data-act="form" data-form="reject:${r.id}">Отклонить</button><button class="btn ghost" data-act="peek" data-id="${ks[0].id}">Карточка</button></div>
        <small class="t3">${rest > 0 ? `После подтверждения останется долг ${money(rest)}.` : rest < 0 ? `Переплата ${money(-rest)} останется на балансе и закроет следующий месяц.` : 'После подтверждения долг будет закрыт, бот поблагодарит родителя.'}</small>`}
    </div>`;
  }
  if (it.type === 'question') {
    const m = S.messages.find(x => x.id === it.id);
    const v = view().get(p.id);
    return `<div class="doc">${back}
      <div><h2>Вопрос от ${esc(p.label)}</h2><div class="lead">${kidsLine}</div></div>
      <div class="wa"><div class="bub in">${esc(m.text)}<time>${fd(m.date)}, ${esc(m.time)}</time></div></div>
      <div class="props"><dt>К оплате</dt><dd>${v.toPay ? money(v.toPay) : 'ничего'}</dd><dt>Телефон</dt><dd class="mono">${esc(p.phone)}</dd></div>
      <div><div class="sec-t">Быстрый ответ</div><div class="acts">
        <button class="btn" data-act="quick" data-payer="${p.id}" data-text="Здравствуйте! Да, можно. Записали, ждём оплату.">Да, можно</button>
        <button class="btn" data-act="quick" data-payer="${p.id}" data-text="Здравствуйте! Позвоните нам, пожалуйста, обсудим.">Позвоните нам</button></div></div>
      <form class="form" data-form="promise" data-payer="${p.id}" data-reply="1"><div class="sec-t" style="margin:0">Договориться о дате. Бот замолчит до этого дня и напомнит в этот день</div>
        <div class="two"><label>Оплатит до<input class="input" type="date" name="date" value="${L.addDays(S.today, 7)}" required></label><label>Заметка<input class="input" name="note" value="${esc(m.text.slice(0, 60))}"></label></div>
        <div class="acts"><button class="btn primary" type="submit">Записать и ответить «Да»</button></div></form>
      <form class="compose" data-form="reply" data-payer="${p.id}"><input class="input" name="text" placeholder="Свой ответ…" autocomplete="off" aria-label="Ответ"><button class="btn" type="submit">${icon('send')}</button></form>
    </div>`;
  }
  const pr = S.promises.find(x => x.id === it.id);
  const v = view().get(p.id);
  return `<div class="doc">${back}
    <div><h2>${it.type === 'broken' ? 'Не оплатили в обещанный день' : 'Сегодня обещали оплатить'}</h2><div class="lead">${esc(p.label)} · ${kidsLine}</div></div>
    <div class="props"><dt>Обещали</dt><dd>${fd(pr.date)}${pr.note ? ` · <span class="t3">${esc(pr.note)}</span>` : ''}</dd><dt>Долг</dt><dd>${money(v.toPay)} · ${v.daysOverdue} дн. просрочки</dd><dt>Телефон</dt><dd class="mono">${esc(p.phone)}</dd></div>
    <div class="acts">${it.type === 'broken' ? `<button class="btn primary" data-act="dismiss" data-id="${pr.id}">Позвонил, скрыть</button>` : ''}<button class="btn" data-act="peek" data-id="${kids(p.id)[0].id}" data-form-open="promise">Новая договорённость</button><button class="btn ghost" data-act="peek" data-id="${kids(p.id)[0].id}">Карточка</button></div>
  </div>`;
}

// ---------- students
function pageStudents() {
  const q = ui.q.trim().toLowerCase();
  const list = S.students.filter(s => (!ui.group || s.enrollments.some(e => e.groupId === ui.group)) && (!q || (s.name + ' ' + payer(s.payerId).label + ' ' + payer(s.payerId).phone).toLowerCase().includes(q)))
    .map(s => ({ s, i: info(s) }));
  const groups = L.STATUS_ORDER.map(k => ({ k, rows: list.filter(x => x.i.status === k).sort((a, b) => b.i.daysOverdue - a.i.daysOverdue || a.s.name.localeCompare(b.s.name)) })).filter(g => g.rows.length);
  return {
    title: 'Ученики', crumb: `${S.students.length}`,
    actions: `<button class="btn" data-act="new-student">${icon('plus')}<span class="hide-m">Ученик</span></button>`,
    sub: `<label class="search">${icon('search')}<input class="input" id="q" type="search" placeholder="Имя, родитель или телефон" value="${esc(ui.q)}" aria-label="Поиск"></label>
      <select class="select" id="grp" aria-label="Группа"><option value="">Все группы</option>${S.groups.map(g => `<option value="${g.id}" ${ui.group === g.id ? 'selected' : ''}>${esc(g.name)}</option>`).join('')}</select>`,
    body: `<div class="scroll" id="scroll">${groups.length ? groups.map(g => {
      const open = !ui.collapsed[g.k];
      const sum = g.rows.reduce((a, x) => a + x.i.owe, 0);
      return `<button class="group-h" data-act="collapse" data-k="${g.k}" aria-expanded="${open}">${icon('chev', 'chev')}${si(g.k)} ${L.STATUS_LABEL[g.k]} <span class="n">${g.rows.length}</span>${sum ? `<span class="sum">${money(sum)}</span>` : ''}</button>
        ${open ? g.rows.map(({ s, i }) => studentRow(s, i)).join('') : ''}`;
    }).join('') : `<div class="empty"><b>Никого не нашли</b>Попробуйте другой запрос или группу.</div>`}</div>`,
  };
}
function studentRow(s, i) {
  const p = payer(s.payerId); const w = whenText(i);
  return `<button class="row ${ui.peek === s.id ? 'sel' : ''}" data-act="peek" data-id="${s.id}">${si(i.status)}
    <span class="main-col"><span class="name">${esc(s.name)}</span><span class="sub">${p.self ? esc(p.phone) : esc(p.label)}</span></span>
    <span class="labels">${s.enrollments.map(e => label(group(e.groupId))).join('')}</span>
    <span class="meta"><span class="amt">${amtText(i)}</span><span class="when ${w.bad ? 'bad' : ''}">${w.t}</span></span></button>`;
}

// ---------- debtors
function pageDebtors() {
  const list = L.debtors(S, view());
  const total = list.reduce((a, x) => a + x.v.overdue, 0);
  const promised = list.filter(x => x.promise).length;
  return {
    title: 'Должники', crumb: list.length ? `${list.length}` : '',
    actions: list.length ? `<button class="btn" data-act="export-debtors">Скачать CSV</button>` : '',
    body: `<div class="stats"><div class="stat"><span class="k">Просрочено всего</span><span class="v">${money(total)}</span></div><div class="stat"><span class="k">Семей с долгом</span><span class="v">${list.length}</span></div><div class="stat"><span class="k">Обещали оплатить</span><span class="v">${promised}</span></div><div class="stat"><span class="k">Самая долгая просрочка</span><span class="v">${list[0] ? list[0].v.daysOverdue + ' дн.' : '—'}</span></div></div>
    <div class="scroll" id="scroll">${list.length ? list.map(x => {
      const ks = kids(x.payer.id);
      return `<button class="row" data-act="peek" data-id="${ks[0].id}">${si(x.promise ? 'promised' : 'overdue')}
        <span class="main-col"><span class="name">${esc(x.payer.label)}</span><span class="sub">${x.promise ? `обещали ${fd(x.promise.date)}` : ks.map(s => esc(s.name)).join(', ')}</span></span>
        <span class="labels t3 hide-m">${x.last ? `напоминали ${fd(x.last.date)}` : 'не напоминали'}</span>
        <span class="meta"><span class="amt">${money(x.v.overdue)}</span><span class="when ${x.promise ? '' : 'bad'}">${x.v.daysOverdue} дн.</span></span></button>`;
    }).join('') : `<div class="empty"><b>Должников нет</b>Все оплатили вовремя.</div>`}</div>`,
  };
}

// ---------- payments
function pagePayments() {
  const months = [...new Set(S.ledger.filter(e => e.type === 'charge').map(e => e.period))].filter(m => m <= S.today.slice(0, 7)).sort();
  if (!months.includes(ui.month)) ui.month = months.at(-1);
  const r = L.monthReport(S, ui.month);
  const pct = r.charged ? Math.min(100, Math.round(r.collected / r.charged * 100)) : 0;
  return {
    title: 'Оплаты', crumb: MONTH_FULL[Number(ui.month.slice(5)) - 1],
    sub: months.map(m => `<button class="chip" data-act="month" data-m="${m}" aria-pressed="${m === ui.month}">${MONTH_FULL[Number(m.slice(5)) - 1]}</button>`).join(''),
    body: `<div class="stats"><div class="stat"><span class="k">Начислено за месяц</span><span class="v">${money(r.charged)}</span></div><div class="stat"><span class="k">Поступило</span><span class="v">${money(r.collected)}</span><div class="bar"><i style="width:${pct}%"></i></div></div><div class="stat"><span class="k">Наличными</span><span class="v">${money(r.cash)}</span></div><div class="stat"><span class="k">Переводом</span><span class="v">${money(r.collected - r.cash)}</span></div></div>
    <div class="scroll" id="scroll">${r.payments.length ? r.payments.map(p => `<button class="row" data-act="peek" data-id="${kids(p.payerId)[0].id}">${si('paid')}
      <span class="main-col"><span class="name">${esc(payer(p.payerId).label)}</span><span class="sub">${esc(p.method)}${p.txn ? ' · ' + esc(p.txn) : ''}</span></span>
      <span class="meta"><span class="amt">${money(p.amount)}</span><span class="when">${fd(p.date)}</span></span></button>`).join('') : '<div class="empty"><b>Оплат нет</b></div>'}</div>`,
  };
}

// ---------- bank
function pageBank() {
  if (!S.bank.length) return {
    title: 'Сверка с банком', crumb: '',
    body: `<div class="scroll" id="scroll"><div class="doc">
      <div><h2>Сверка с выпиской</h2><p class="lead">Скриншот чека легко подделать. Выписка из банка показывает, пришли ли деньги на самом деле. Загрузите CSV из MBank Business или Optima, и система сопоставит каждую операцию с чеками и оплатами по номеру операции, сумме и дате.</p></div>
      <div class="acts"><button class="btn primary" data-act="bank-sample">Загрузить пример выписки</button><label class="btn">Загрузить свой CSV<input type="file" accept=".csv,text/csv" id="bank-file" hidden></label></div>
      <div class="box"><div class="box-row"><div class="grow"><b>Формат</b><br><span class="t3">Первая строка — заголовки. Нужны колонки <code>Дата</code> и <code>Сумма</code>, желательно <code>Номер операции</code> и <code>Отправитель</code>. Разделитель — точка с запятой или запятая.</span></div></div></div>
    </div></div>`,
  };
  const rc = L.reconcile(S);
  const ready = rc.rows.filter(x => x.kind === 'receipt' && L.checkReceipt(S, x.ref, view()).verdict !== 'bad');
  const sections = [
    ['receipt', 'Деньги пришли, чек ждёт подтверждения', 'review'],
    ['unknown', 'Есть в банке, нет в CRM', 'overdue'],
    ['payment', 'Совпало с оплатами', 'paid'],
  ];
  return {
    title: 'Сверка с банком', crumb: `${fd(rc.from)} – ${fd(rc.to)}`,
    actions: `<button class="btn ghost" data-act="bank-clear">Убрать выписку</button>`,
    body: `<div class="stats"><div class="stat"><span class="k">Совпало с оплатами</span><span class="v">${rc.counts.payment}</span></div><div class="stat"><span class="k">Чеки, деньги пришли</span><span class="v">${rc.counts.receipt}</span></div><div class="stat"><span class="k">Нет в CRM</span><span class="v">${rc.counts.unknown}</span></div><div class="stat"><span class="k">Нет в выписке</span><span class="v">${rc.counts.crmOnly}</span></div></div>
    <div class="scroll" id="scroll">
      ${ready.length ? `<div class="today-card"><div class="h">${si('review')} ${ready.length} ${plural(ready.length, 'чек подтверждён', 'чека подтверждены', 'чеков подтверждены')} выпиской</div><div class="acts"><button class="btn primary" data-act="bank-confirm">Подтвердить ${ready.length}</button></div></div>` : ''}
      ${sections.map(([k, t, ic]) => {
        const rows = rc.rows.filter(x => x.kind === k); if (!rows.length) return '';
        const open = !ui.bankCollapsed[k];
        return `<button class="group-h" data-act="bank-collapse" data-k="${k}" aria-expanded="${open}">${icon('chev', 'chev')}${si(ic)} ${t} <span class="n">${rows.length}</span><span class="sum">${money(rows.reduce((a, x) => a + x.amount, 0))}</span></button>
        ${open ? rows.map(x => `<div class="row">${si(ic)}<span class="main-col"><span class="name">${esc(x.ref ? payer(x.ref.payerId).label : x.from || 'Неизвестный отправитель')}</span><span class="sub">${esc(x.txn)} · ${esc(x.note || x.from)}</span></span><span class="meta"><span class="amt">${money(x.amount)}</span><span class="when">${fd(x.date)}</span></span></div>`).join('') : ''}`;
      }).join('')}
      ${rc.crmOnly.length ? `<div class="group-h">${si('overdue')} Есть в CRM, нет в выписке <span class="n">${rc.crmOnly.length}</span></div>${rc.crmOnly.map(p => `<div class="row">${si('overdue')}<span class="main-col"><span class="name">${esc(payer(p.payerId).label)}</span><span class="sub">${esc(p.txn)}</span></span><span class="meta"><span class="amt">${money(p.amount)}</span><span class="when">${fd(p.date)}</span></span></div>`).join('')}` : ''}
    </div>`,
  };
}

// ---------- settings
function pageSettings() {
  const r = S.settings.reminders;
  const sampleP = 'p1';
  const sw = (k, on) => `<input type="checkbox" class="switch" data-rem="${k}" ${on ? 'checked' : ''} aria-label="${k}">`;
  const num = (k, v) => `<input type="number" min="1" max="30" class="input" data-rem="${k}" value="${v}" aria-label="${k}">`;
  const TPL = [['before', 'Перед оплатой'], ['day', 'В день оплаты'], ['late', 'Просрочка'], ['promise', 'День обещания'], ['ack', 'Чек получен'], ['thanks', 'Оплата подтверждена'], ['reject', 'Чек отклонён']];
  return {
    title: 'Настройки', crumb: '',
    body: `<div class="scroll" id="scroll"><div class="doc">
      <section><div class="sec-t">Когда напоминать</div><div class="box">
        <div class="set-row"><div class="grow"><b>Перед датой оплаты</b><span>За сколько дней</span></div>${num('before', r.before)}${sw('beforeOn', r.beforeOn)}</div>
        <div class="set-row"><div class="grow"><b>В день оплаты</b><span>Если ещё не оплатили</span></div>${sw('dayOn', r.dayOn)}</div>
        <div class="set-row"><div class="grow"><b>После просрочки</b><span>Через сколько дней</span></div>${num('after', r.after)}${sw('lateOn', r.lateOn)}</div>
        <div class="set-row"><div class="grow"><b>Повторять просрочку</b><span>Каждые N дней, не больше M раз, дальше только в «Должниках»</span></div>${num('repeat', r.repeat)}${num('lateCount', r.lateCount)}</div>
        <div class="set-row"><div class="grow"><b>Время отправки</b><span>По Бишкеку</span></div><input type="time" class="input" data-rem="time" value="${esc(r.time)}" aria-label="Время"></div>
      </div><small class="t3">Бот молчит, если чек на проверке или есть договорённость о дате. Одна семья получает одно сообщение в день, даже если детей двое.</small></section>
      <section><div class="sec-t">Реквизиты для оплаты</div><div class="box">
        <div class="set-row"><div class="grow"><b>Банк</b></div><input class="input" data-center="bank" value="${esc(S.center.bank)}" aria-label="Банк"></div>
        <div class="set-row"><div class="grow"><b>Номер или счёт</b></div><input class="input" data-center="account" value="${esc(S.center.account)}" aria-label="Счёт"></div>
        <div class="set-row"><div class="grow"><b>Получатель</b><span>Gemini сверяет его с получателем на чеке</span></div><input class="input" data-center="recipient" value="${esc(S.center.recipient)}" aria-label="Получатель"></div>
      </div></section>
      <section><div class="sec-t">Тексты сообщений · пример для ${esc(payer(sampleP).label)}</div><div class="box">
        <div class="tpl t3">Подставляется само: <code>{имя}</code> <code>{сумма}</code> <code>{дата}</code> <code>{за_что}</code> <code>{реквизиты}</code> <code>{дней}</code> <code>{причина}</code> <code>{остаток}</code>. Шаблоны для сообщений вне 24-часового окна заранее проверяет Meta.</div>
        ${TPL.map(([k, t]) => `<div class="tpl"><b>${t}</b><textarea class="textarea" rows="3" data-tpl="${k}" aria-label="${t}">${esc(S.settings.templates[k])}</textarea><div class="pv" id="pv-${k}">${esc(L.renderTemplate(S, k, sampleP, { reason: 'сумма не совпадает', rest: ' Осталось оплатить 500 сом.', days: 3 }))}</div></div>`).join('')}
      </div></section>
      <section><div class="sec-t">Группы</div><div class="box">${S.groups.map(g => `<div class="box-row">${label(g)}<span class="grow t3">${esc(g.teacher)} · ${esc(g.schedule)}</span><span class="num">${money(g.price)}</span></div>`).join('')}</div></section>
      <section><div class="sec-t">Демо</div><div class="box">
        <div class="set-row"><div class="grow"><b>Тема</b></div><select class="select" id="theme">${[['', 'Как в системе'], ['light', 'Светлая'], ['dark', 'Тёмная']].map(([v, t]) => `<option value="${v}" ${(recall('theme') || '') === v ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
        <div class="set-row"><div class="grow"><b>Сбросить демо</b><span>Вернуть всех учеников и дату 19 октября</span></div><button class="btn danger" data-act="reset">Сбросить</button></div>
      </div></section>
    </div></div>`,
  };
}

// ---------- peek: student card
function peekStudent(s) {
  const p = payer(s.payerId);
  const i = info(s);
  const v = view().get(p.id);
  const sibs = kids(p.id);
  const w = whenText(i);
  const statusExtra = i.status === 'overdue' ? ` · ${i.daysOverdue} дн.` : i.status === 'promised' ? ` до ${fd(i.promise.date)}` : '';
  const forms = {
    pay: `<form class="form" data-form="pay" data-payer="${p.id}"><div class="two"><label>Сумма, сом<input class="input num" type="number" name="amount" min="1" step="50" value="${v.toPay || s.enrollments[0].price}" required></label>
      <label>Способ<select class="select" name="method"><option>Наличные</option><option>Перевод · MBank</option><option>Перевод · Optima</option></select></label></div>
      <div class="acts"><button class="btn primary" type="submit">Записать оплату</button><button class="btn ghost" type="button" data-act="form-close">Отмена</button></div></form>`,
    promise: `<form class="form" data-form="promise" data-payer="${p.id}"><div class="two"><label>Оплатит до<input class="input" type="date" name="date" value="${L.addDays(S.today, 5)}" required></label><label>Заметка<input class="input" name="note" placeholder="Например, после зарплаты"></label></div>
      <div class="acts"><button class="btn primary" type="submit">Записать</button><button class="btn ghost" type="button" data-act="form-close">Отмена</button></div><small class="t3">До этой даты бот не напоминает, в этот день напомнит.</small></form>`,
    freeze: `<form class="form" data-form="freeze" data-id="${s.id}"><div class="two"><label>С<input class="input" type="date" name="from" value="${S.today}" required></label><label>По<input class="input" type="date" name="to" value="${L.addDays(S.today, 30)}" required></label></div>
      <label>Причина<input class="input" name="note" placeholder="Болеет, каникулы"></label>
      <div class="acts"><button class="btn primary" type="submit">Заморозить</button><button class="btn ghost" type="button" data-act="form-close">Отмена</button></div><small class="t3">Если дата оплаты попадает в заморозку, начисления не будет.</small></form>`,
  };
  const frozenNow = s.enrollments.some(e => L.isFrozen(e, S.today));
  const tabs = [['charges', 'Начисления'], ['wa', 'WhatsApp'], ['sim', 'Симуляция']];
  return `<div class="peek-h">${si(i.status)}<h2>${esc(s.name)}</h2><span style="flex:1"></span><button class="icon-btn" data-act="peek-close" aria-label="Закрыть">${icon('close')}</button></div>
  <div class="peek-b">
    <dl class="props">
      <dt>Статус</dt><dd>${L.STATUS_LABEL[i.status]}${statusExtra}</dd>
      <dt>Кто платит</dt><dd>${esc(p.label)} · <span class="mono">${esc(p.phone)}</span></dd>
      <dt>Группы</dt><dd>${s.enrollments.map(e => `${label(group(e.groupId))}<span class="t3 num">${money(e.price)}${e.discount ? ` · −${e.discount}%` : ''}</span>`).join(' ')}</dd>
      ${sibs.length > 1 ? `<dt>В семье</dt><dd>${sibs.map(x => x.id === s.id ? esc(x.name) : `<button class="btn ghost" style="height:22px;padding:0 6px" data-act="peek" data-id="${x.id}">${esc(x.name)}</button>`).join(' ')}</dd>` : ''}
      <dt>Баланс семьи</dt><dd>${v.toPay ? `к оплате <b>${money(v.toPay)}</b>${v.overdue ? `, из них просрочено ${money(v.overdue)}` : ''}` : v.credit ? `переплата ${money(v.credit)}` : 'долгов нет'}</dd>
      <dt>Следующая оплата</dt><dd>${i.nextDue ? `${fd(i.nextDue)} · <span class="${w.bad ? 't2' : 't3'}">${w.t}</span>` : '—'}</dd>
      ${i.promise ? `<dt>Договорённость</dt><dd>оплатит до ${fd(i.promise.date)}${i.promise.note ? ` · <span class="t3">${esc(i.promise.note)}</span>` : ''}</dd>` : ''}
      ${frozenNow ? `<dt>Заморозка</dt><dd>${s.enrollments.flatMap(e => e.freezes || []).filter(f => S.today >= f.from && S.today <= f.to).slice(0, 1).map(f => `${fd(f.from)} – ${fd(f.to)}${f.note ? ` · <span class="t3">${esc(f.note)}</span>` : ''}`).join('')}</dd>` : ''}
      <dt>Напоминания</dt><dd><input type="checkbox" class="switch" data-act-change="mute" data-payer="${p.id}" ${p.muted ? '' : 'checked'} aria-label="Напоминания"> <span class="t3">${p.muted ? 'выключены' : 'включены'}</span></dd>
    </dl>
    ${ui.form && forms[ui.form] ? forms[ui.form] : `<div class="acts">
      <button class="btn primary" data-act="form" data-form="pay">Внести оплату</button>
      ${v.overdue ? `<button class="btn" data-act="form" data-form="promise">Договориться о дате</button>` : ''}
      ${frozenNow ? `<button class="btn" data-act="unfreeze" data-id="${s.id}">Снять заморозку</button>` : `<button class="btn" data-act="form" data-form="freeze">Заморозить</button>`}
    </div>`}
    <div><div class="tabs" role="tablist">${tabs.map(([k, t]) => `<button class="tab" role="tab" data-act="tab" data-tab="${k}" aria-selected="${ui.tab === k}">${t}</button>`).join('')}</div></div>
    ${ui.tab === 'charges' ? tabCharges(p, v, sibs) : ui.tab === 'wa' ? tabWA(p) : tabSim(p, v)}
  </div>`;
}

function tabCharges(p, v, sibs) {
  const today = S.today;
  const charges = v.charges.slice().reverse();
  return `<div class="box">${charges.map(c => {
    const st = c.left === 0 ? 'paid' : c.due < today ? 'overdue' : 'due';
    const txt = c.left === 0 ? 'оплачено' : c.left < c.amount ? `осталось ${money(c.left)}` : c.due < today ? 'долг' : `до ${fd(c.due)}`;
    return `<div class="charge">${si(st)}<span class="what">${MONTH_FULL[Number(c.period.slice(5)) - 1]} · ${esc(group(c.groupId).name)}${sibs.length > 1 ? ` · <span class="t3">${esc(student(c.studentId).name.split(' ')[0])}</span>` : ''}</span><span class="st">${txt}</span><span class="num">${money(c.amount)}</span></div>`;
  }).join('') || '<div class="empty">Начислений пока нет</div>'}</div>
  <div><div class="sec-t">Оплаты</div><div class="box">${v.payments.slice().reverse().map(x => `<div class="charge">${si('paid')}<span class="what">${fd(x.date)} · <span class="t3">${esc(x.method)}${x.txn ? ' · ' + esc(x.txn) : ''}</span></span><span></span><span class="num">${money(x.amount)}</span></div>`).join('') || '<div class="empty">Оплат пока нет</div>'}</div></div>`;
}

function tabWA(p) {
  const msgs = S.messages.filter(m => m.payerId === p.id);
  let last = '';
  const TAG = { before: 'Напоминание', day: 'Напоминание', late: 'Напоминание', promise: 'Напоминание', ack: 'Бот', thanks: 'Бот', reject: 'Бот', admin: 'Администратор' };
  const html = msgs.map(m => {
    const sep = m.date !== last ? `<div class="day-sep">${fd(m.date)}, ${weekday(m.date)}</div>` : ''; last = m.date;
    if (m.kind === 'receipt') { const r = S.receipts.find(x => x.id === m.receiptId); return sep + `<div class="bub in img">${receiptPic(r, true)}<time>${esc(m.time || '')}</time></div>`; }
    return sep + `<div class="bub ${m.dir}">${m.dir === 'out' ? `<span class="tg">${TAG[m.kind] || 'Бот'}</span>` : ''}${esc(m.text)}<time>${esc(m.time || '')}</time></div>`;
  }).join('');
  return `<div class="wa" id="wa">${html || '<div class="bub sys">Сообщений пока нет</div>'}${ui.typing[p.id] ? '<div class="bub sys"><span class="spin"></span>Gemini читает чек…</div>' : ''}</div>
  <form class="compose" data-form="reply" data-payer="${p.id}"><input class="input" name="text" placeholder="Написать от имени центра…" autocomplete="off" aria-label="Сообщение"><button class="btn" type="submit">${icon('send')}</button></form>`;
}

function tabSim(p, v) {
  const amt = v.toPay || kids(p.id)[0].enrollments[0].price;
  return `<div class="box"><div class="box-row"><div class="grow t2">Действия от имени родителя. Так можно проверить, что увидит администратор во «Входящих».</div></div>
    <div class="box-row"><div class="grow">Прислать чек на ${money(amt)}</div><button class="btn" data-act="sim" data-v="ok" data-payer="${p.id}">Прислать</button></div>
    <div class="box-row"><div class="grow">Прислать чек на меньшую сумму</div><button class="btn" data-act="sim" data-v="less" data-payer="${p.id}">Прислать</button></div>
    <div class="box-row"><div class="grow">Прислать старый чек ещё раз</div><button class="btn" data-act="sim" data-v="dup" data-payer="${p.id}">Прислать</button></div>
    <div class="box-row"><div class="grow">Чек с чужими реквизитами</div><button class="btn" data-act="sim" data-v="foreign" data-payer="${p.id}">Прислать</button></div>
    <div class="box-row"><div class="grow">Задать вопрос вместо оплаты</div><button class="btn" data-act="sim" data-v="question" data-payer="${p.id}">Написать</button></div></div>`;
}

function peekNew() {
  return `<div class="peek-h"><h2>Новый ученик</h2><span style="flex:1"></span><button class="icon-btn" data-act="peek-close" aria-label="Закрыть">${icon('close')}</button></div>
  <div class="peek-b"><form class="form" data-form="new-student" style="background:transparent;border:0;padding:0">
    <label>ФИО ученика<input class="input" name="name" required placeholder="Аружан Исакова"></label>
    <label>Брат или сестра уже учится?<select class="select" name="payerId"><option value="">Нет, новая семья</option>${S.payers.filter(p => !p.self).map(p => `<option value="${p.id}">Да, ${esc(p.label)}</option>`).join('')}</select></label>
    <div class="two"><label>Кому писать<select class="select" name="relation"><option>мама</option><option>папа</option><option>сам</option><option>сама</option></select></label><label>Имя контакта<input class="input" name="pname" placeholder="Айнура"></label></div>
    <label>WhatsApp<input class="input" name="phone" inputmode="tel" placeholder="+996 700 000 000"></label>
    <div class="two"><label>Группа<select class="select" name="groupId">${S.groups.map(g => `<option value="${g.id}">${esc(g.name)} · ${money(g.price)}</option>`).join('')}</select></label><label>Скидка, %<input class="input" type="number" name="discount" min="0" max="100" value="0"></label></div>
    <label>Первое занятие и первая оплата<input class="input" type="date" name="start" value="${S.today}" required></label>
    <div class="acts"><button class="btn primary" type="submit">Добавить</button><button class="btn ghost" type="button" data-act="peek-close">Отмена</button></div>
    <small class="t3">Дальше оплата каждый месяц в этот же день.</small>
  </form></div>`;
}

// ---------- shell
const PAGES = { inbox: pageInbox, students: pageStudents, debtors: pageDebtors, payments: pagePayments, bank: pageBank, settings: pageSettings };
const NAV = [['inbox', 'Входящие'], ['students', 'Ученики'], ['debtors', 'Должники'], ['payments', 'Оплаты'], ['bank', 'Сверка с банком'], ['settings', 'Настройки']];

function counts() {
  const v = view();
  return { inbox: inboxItems().length, students: S.students.length, debtors: L.debtors(S, v).length };
}

function render() {
  const keepScroll = document.getElementById('scroll')?.scrollTop || 0;
  const samePage = render.lastPage === ui.page;
  render.lastPage = ui.page;
  const c = counts();
  const pg = PAGES[ui.page]();
  const navBtn = ([k, t]) => `<button class="nav-item" data-act="go" data-page="${k}" ${ui.page === k ? 'aria-current="page"' : ''}>${icon(k)}<span>${t}</span>${c[k] ? `<span class="count ${k === 'inbox' ? 'hot' : ''}">${c[k]}</span>` : ''}</button>`;
  document.getElementById('app').innerHTML = `
  <aside class="side">
    <div class="ws"><span class="ws-logo">✓</span>${esc(S.center.name)}</div>
    <button class="search-btn" data-act="palette">${icon('search', 'si')}Поиск и команды<kbd>⌘K</kbd></button>
    ${NAV.slice(0, 1).map(navBtn).join('')}
    <div class="nav-label">Центр</div>
    ${NAV.slice(1).map(navBtn).join('')}
    <div class="clock"><div class="clock-date"><b>${fd(S.today)}, ${weekday(S.today)}</b><span class="t3">демо-время</span></div>
      <button class="btn" data-act="next-day">${icon('next')} Следующий день</button>
      <small>Бот разошлёт напоминания, выставит новые начисления. Так можно проверить логику.</small></div>
  </aside>
  <main class="main">
    <header class="topbar"><h1>${pg.title}</h1><span class="crumb">${esc(pg.crumb || '')}</span><span class="sp"></span>${pg.actions || ''}
      <button class="btn show-m" data-act="next-day" aria-label="Следующий день">${fd(S.today)} ${icon('next')}</button></header>
    ${pg.sub ? `<div class="subbar">${pg.sub}</div>` : ''}
    ${pg.body}
  </main>
  <nav class="tabbar">${[['inbox', 'Входящие'], ['students', 'Ученики'], ['debtors', 'Должники'], ['payments', 'Оплаты']].map(([k, t]) => `<button data-act="go" data-page="${k}" ${ui.page === k ? 'aria-current="page"' : ''}>${icon(k)}<span>${t}</span>${k === 'inbox' && c.inbox ? `<span class="dot">${c.inbox}</span>` : ''}</button>`).join('')}
    <button data-act="more" ${['bank', 'settings'].includes(ui.page) ? 'aria-current="page"' : ''}>${icon('more')}<span>Ещё</span></button></nav>`;
  if (samePage) { const el = document.getElementById('scroll'); if (el) el.scrollTop = keepScroll; }
  renderOverlay();
}

function renderOverlay() {
  const o = document.getElementById('overlay');
  let html = '';
  if (ui.peek) {
    const s = ui.peek === 'new' ? null : student(ui.peek);
    if (ui.peek !== 'new' && !s) ui.peek = null;
    else html += `<div class="scrim" data-act="peek-close"></div><aside class="peek" role="dialog" aria-modal="true">${s ? peekStudent(s) : peekNew()}</aside>`;
  }
  if (ui.more) html += `<div class="scrim" data-act="more-close"></div><div class="more-sheet">${[['bank', 'Сверка с банком'], ['settings', 'Настройки']].map(([k, t]) => `<button class="nav-item" data-act="go" data-page="${k}">${icon(k)}<span>${t}</span></button>`).join('')}<button class="nav-item" data-act="palette">${icon('search')}<span>Поиск</span></button></div>`;
  o.innerHTML = html;
  const wa = document.getElementById('wa'); if (wa) wa.scrollTop = wa.scrollHeight;
}

// ---------- toasts
function toast(text, action) {
  const box = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = 'toast'; el.setAttribute('role', 'status');
  el.innerHTML = `<span>${esc(text)}</span>${action ? `<button class="btn" data-act="go" data-page="${action[1]}">${esc(action[0])}</button>` : ''}`;
  box.appendChild(el);
  while (box.children.length > 3) box.firstElementChild.remove();
  setTimeout(() => el.remove(), 4500);
}

// ---------- palette
function paletteItems(q) {
  q = q.trim().toLowerCase();
  const items = [];
  items.push({ sec: 'Действия', t: 'Следующий день', hint: 'демо', run: () => nextDay() });
  if (!L.remindersSentToday(S)) items.push({ sec: 'Действия', t: 'Отправить сегодняшние напоминания', run: () => sendNow() });
  items.push({ sec: 'Действия', t: 'Добавить ученика', run: () => { ui.peek = 'new'; renderOverlay(); } });
  for (const [k, t] of NAV) items.push({ sec: 'Перейти', t, run: () => go(k) });
  for (const s of S.students) items.push({ sec: 'Ученики', t: s.name, hint: payer(s.payerId).label, run: () => openPeek(s.id) });
  return items.filter(i => !q || (i.t + ' ' + (i.hint || '')).toLowerCase().includes(q)).slice(0, 40);
}
function renderPalette() {
  const root = document.getElementById('pal');
  if (!ui.pal) { root.innerHTML = ''; return; }
  const items = paletteItems(ui.pal.q);
  ui.pal.items = items;
  ui.pal.i = Math.min(ui.pal.i, Math.max(0, items.length - 1));
  let sec = '';
  const list = items.map((it, n) => { const h = it.sec !== sec ? `<div class="pal-sec">${it.sec}</div>` : ''; sec = it.sec; return h + `<button class="pal-item" data-pal="${n}" aria-selected="${n === ui.pal.i}">${esc(it.t)}${it.hint ? `<span class="t3">${esc(it.hint)}</span>` : ''}</button>`; }).join('') || '<div class="empty">Ничего не нашли</div>';
  if (!root.querySelector('input')) {
    root.innerHTML = `<div class="pal-scrim" data-act="pal-close"></div><div class="pal" role="dialog" aria-label="Поиск"><input id="pal-q" placeholder="Ученик, раздел или команда…" autocomplete="off" aria-label="Поиск"><div class="pal-list" id="pal-list"></div></div>`;
    setTimeout(() => document.getElementById('pal-q')?.focus(), 0);
  }
  document.getElementById('pal-list').innerHTML = list;
  root.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
}
function openPalette() { ui.more = false; ui.pal = { q: '', i: 0 }; renderOverlay(); renderPalette(); }
function closePalette() { ui.pal = null; renderPalette(); }

// ---------- actions
function go(page) { ui.page = page; ui.sel = null; ui.more = false; ui.peek = null; ui.form = null; remember('page', page); closePalette(); render(); document.getElementById('scroll')?.scrollTo(0, 0); }
function openPeek(id, form = null) { if (ui.peek !== id) ui.tab = 'charges'; ui.peek = id; ui.form = form; closePalette(); render(); }
function nextDay() {
  const r = L.advanceDay(S); commit();
  const prev = L.addDays(r.today, -1);
  toast(`${fd(prev)}: ${r.sent.length ? `отправлено ${r.sent.length} ${plural(r.sent.length, 'напоминание', 'напоминания', 'напоминаний')}` : 'напоминать было некому'}. Теперь ${fd(r.today)}${r.charges ? `, выставлено ${r.charges} ${plural(r.charges, 'начисление', 'начисления', 'начислений')}` : ''}.`);
}
function sendNow() { const list = L.sendReminders(S, now()); commit(); toast(`Отправлено ${list.length} ${plural(list.length, 'напоминание', 'напоминания', 'напоминаний')}`); }

function simulate(pid, variant) {
  const v = view().get(pid);
  if (variant === 'question') {
    L.pushMessage(S, { payerId: pid, dir: 'in', kind: 'text', text: 'Здравствуйте! Можно оплатить на неделю позже?', time: now() });
    commit(); toast('Вопрос появился во входящих', ['Открыть', 'inbox']); return;
  }
  const amt = v.toPay || kids(pid)[0].enrollments[0].price;
  const lastTxn = [...S.ledger].reverse().find(e => e.type === 'payment' && e.txn && e.payerId === pid)?.txn || [...S.ledger].reverse().find(e => e.type === 'payment' && e.txn)?.txn;
  const data = {
    amount: variant === 'less' ? Math.max(500, amt - 1000) : amt,
    date: S.today, time: now(), bank: 'MBank',
    recipient: variant === 'foreign' ? 'Иван П.' : S.center.recipient,
    txn: variant === 'dup' && lastTxn ? lastTxn : 'MB-' + (58000000 + Math.floor(Math.random() * 999999)),
    confidence: 0.9 + Math.random() * 0.08,
  };
  ui.typing[pid] = true; ui.tab = 'wa'; renderOverlay();
  setTimeout(() => { delete ui.typing[pid]; L.addReceipt(S, pid, data); commit(); toast('Чек распознан и ждёт проверки', ['Во входящие', 'inbox']); }, 1300);
}

function downloadCSV(name, text) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿' + text], { type: 'text/csv' }));
  a.download = name; document.body.appendChild(a); a.click(); a.remove();
}

document.addEventListener('click', e => {
  const pi = e.target.closest('[data-pal]');
  if (pi) { const it = ui.pal.items[Number(pi.dataset.pal)]; closePalette(); it.run(); return; }
  const b = e.target.closest('[data-act]'); if (!b) return;
  const a = b.dataset.act, id = b.dataset.id;
  switch (a) {
    case 'go': go(b.dataset.page); break;
    case 'more': ui.more = true; renderOverlay(); break;
    case 'more-close': ui.more = false; renderOverlay(); break;
    case 'palette': openPalette(); break;
    case 'pal-close': closePalette(); break;
    case 'next-day': nextDay(); break;
    case 'send-now': sendNow(); break;
    case 'inbox-sel': ui.sel = id; ui.form = null; render(); break;
    case 'inbox-back': ui.sel = null; render(); break;
    case 'peek': openPeek(id, b.dataset.formOpen || null); break;
    case 'peek-close': ui.peek = null; ui.form = null; render(); break;
    case 'new-student': ui.peek = 'new'; renderOverlay(); setTimeout(() => document.querySelector('[name=name]')?.focus(), 0); break;
    case 'tab': ui.tab = b.dataset.tab; renderOverlay(); break;
    case 'form': ui.form = b.dataset.form; ui.peek ? renderOverlay() : render(); break;
    case 'form-close': ui.form = null; ui.peek ? renderOverlay() : render(); break;
    case 'collapse': ui.collapsed[b.dataset.k] = !ui.collapsed[b.dataset.k]; render(); break;
    case 'bank-collapse': ui.bankCollapsed[b.dataset.k] = !ui.bankCollapsed[b.dataset.k]; render(); break;
    case 'month': ui.month = b.dataset.m; render(); break;
    case 'confirm': { const r = S.receipts.find(x => x.id === id); L.confirmReceipt(S, id, now()); ui.sel = null; commit(); toast(`${payer(r.payerId).label}: оплата ${money(r.amount)} подтверждена, бот поблагодарил`); break; }
    case 'dismiss': { const p = S.promises.find(x => x.id === id); p.seen = true; ui.sel = null; commit(); break; }
    case 'quick': L.reply(S, b.dataset.payer, b.dataset.text, now()); ui.sel = null; commit(); toast('Ответ отправлен в WhatsApp'); break;
    case 'unfreeze': L.unfreezeStudent(S, id); commit(); toast('Заморозка снята'); break;
    case 'sim': simulate(b.dataset.payer, b.dataset.v); break;
    case 'bank-sample': S.bank = L.parseBankCSV(sampleBankCSV(S)).rows; commit(); toast(`Загружено ${S.bank.length} операций из примера выписки`); break;
    case 'bank-clear': S.bank = []; commit(); break;
    case 'bank-confirm': { const rc = L.reconcile(S); let n = 0; for (const x of rc.rows) if (x.kind === 'receipt' && L.checkReceipt(S, x.ref, L.ledgerView(S)).verdict !== 'bad') { L.confirmReceipt(S, x.ref.id, now()); n++; } commit(); toast(`Подтверждено ${n} ${plural(n, 'чек', 'чека', 'чеков')}, родители получили «спасибо»`); break; }
    case 'export-debtors': downloadCSV(`dolzhniki-${S.today}.csv`, 'Плательщик;Телефон;Ученики;Долг;Дней просрочки;Обещание\n' + L.debtors(S, view()).map(x => [x.payer.label, x.payer.phone, kids(x.payer.id).map(s => s.name).join(', '), x.v.overdue, x.v.daysOverdue, x.promise ? x.promise.date : ''].join(';')).join('\n')); break;
    case 'reset': S = buildSeed(); V = null; Object.assign(ui, { sel: null, peek: null, form: null, q: '', group: '', month: S.today.slice(0, 7) }); commit(); toast('Демо сброшено на 19 октября'); break;
  }
});

document.addEventListener('submit', e => {
  const f = e.target.closest('form[data-form]'); if (!f) return;
  e.preventDefault();
  const d = Object.fromEntries(new FormData(f));
  const kind = f.dataset.form;
  if (kind === 'pay') {
    const amount = Number(d.amount); if (!(amount > 0)) return toast('Введите сумму больше нуля');
    L.addPayment(S, { payerId: f.dataset.payer, amount, method: d.method, time: now() }); ui.form = null; commit();
    const v = view().get(f.dataset.payer);
    toast(v.toPay ? `Записано. Осталось ${money(v.toPay)}` : v.credit ? `Записано. Переплата ${money(v.credit)} на балансе` : 'Оплата записана, долгов нет');
  } else if (kind === 'promise') {
    if (d.date < S.today) return toast('Дата не может быть в прошлом');
    L.setPromise(S, f.dataset.payer, d.date, d.note);
    if (f.dataset.reply) L.reply(S, f.dataset.payer, `Здравствуйте! Да, можно до ${fd(d.date)}. Записали, ждём оплату.`, now());
    ui.form = null; ui.sel = null; commit(); toast(`Записали: оплатят до ${fd(d.date)}. До этого дня бот молчит`);
  } else if (kind === 'freeze') {
    if (d.to < d.from) return toast('Дата окончания раньше начала');
    L.freezeStudent(S, f.dataset.id, d.from, d.to, d.note); ui.form = null; commit(); toast(`Заморожено до ${fd(d.to)}`);
  } else if (kind === 'reject') {
    L.rejectReceipt(S, f.dataset.id, d.reason, now()); ui.form = null; ui.sel = null; commit(); toast('Чек отклонён, родитель получил причину');
  } else if (kind === 'reply') {
    const text = (d.text || '').trim(); if (!text) return;
    L.reply(S, f.dataset.payer, text, now()); commit();
    document.querySelector(`form[data-form=reply][data-payer="${f.dataset.payer}"] input`)?.focus();
  } else if (kind === 'new-student') {
    const name = d.name.trim(); if (!name) return;
    if (!d.payerId && !d.phone.trim()) return toast('Укажите номер WhatsApp');
    const self = d.relation === 'сам' || d.relation === 'сама';
    const s = L.addStudent(S, { name, payerId: d.payerId || null, payer: { name: self ? name.split(' ')[0] : (d.pname.trim() || d.relation), relation: d.relation, phone: d.phone.trim() }, groupId: d.groupId, start: d.start, discount: Number(d.discount) || 0 });
    ui.peek = s.id; ui.tab = 'charges'; commit(); toast('Ученик добавлен, первое начисление создано');
  }
});

document.addEventListener('input', e => {
  const t = e.target;
  if (t.id === 'q') {
    ui.q = t.value;
    const pg = pageStudents();
    const tmp = document.createElement('div'); tmp.innerHTML = pg.body;
    document.getElementById('scroll').replaceWith(tmp.firstElementChild);
  } else if (t.id === 'pal-q') { ui.pal.q = t.value; ui.pal.i = 0; renderPalette(); }
  else if (t.dataset.tpl) {
    S.settings.templates[t.dataset.tpl] = t.value; save();
    document.getElementById('pv-' + t.dataset.tpl).textContent = L.renderTemplate(S, t.dataset.tpl, 'p1', { reason: 'сумма не совпадает', rest: ' Осталось оплатить 500 сом.', days: 3 });
  } else if (t.dataset.center) { S.center[t.dataset.center] = t.value; save(); V = null; }
});

document.addEventListener('change', e => {
  const t = e.target;
  if (t.id === 'grp') { ui.group = t.value; render(); }
  else if (t.id === 'theme') { if (t.value) document.documentElement.dataset.theme = t.value; else delete document.documentElement.dataset.theme; remember('theme', t.value); }
  else if (t.dataset.rem) {
    const k = t.dataset.rem;
    S.settings.reminders[k] = t.type === 'checkbox' ? t.checked : t.type === 'number' ? Math.max(1, Number(t.value) || 1) : t.value;
    if (k === 'before') L.runBilling(S);
    commit();
  } else if (t.dataset.actChange === 'mute') { const p = payer(t.dataset.payer); p.muted = !t.checked; commit(); }
  else if (t.id === 'bank-file' && t.files[0]) {
    const fr = new FileReader();
    fr.onload = () => { const r = L.parseBankCSV(String(fr.result)); if (r.error) return toast(r.error); S.bank = r.rows; commit(); toast(`Загружено ${r.rows.length} операций`); };
    fr.readAsText(t.files[0]);
  }
});

document.addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); ui.pal ? closePalette() : openPalette(); return; }
  if (ui.pal) {
    if (e.key === 'Escape') { closePalette(); return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); ui.pal.i = Math.max(0, Math.min(ui.pal.items.length - 1, ui.pal.i + (e.key === 'ArrowDown' ? 1 : -1))); renderPalette(); }
    if (e.key === 'Enter') { e.preventDefault(); const it = ui.pal.items[ui.pal.i]; if (it) { closePalette(); it.run(); } }
    return;
  }
  if (e.key === 'Escape') { if (ui.peek) { ui.peek = null; ui.form = null; render(); } else if (ui.more) { ui.more = false; renderOverlay(); } }
});

const theme = recall('theme'); if (theme) document.documentElement.dataset.theme = theme;
render();
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('./sw.js').catch(() => {});
