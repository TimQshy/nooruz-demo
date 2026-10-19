// Interactive pitch for the client: one story (mum pays for Айпери's Korean course)
// told slide by slide on two phones, then the owner's report. Report numbers come
// from the same seed and logic as the full demo (app.html).
import * as L from './logic.js';
import { buildSeed } from './data.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = L.money;
const ck = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--st-paid)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7"/></svg>';
const SI = {
  paid: '<circle cx="7" cy="7" r="6" fill="var(--st-paid)"/><path d="M4.3 7.2l1.8 1.8 3.6-3.8" stroke="#fff" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  due: '<circle cx="7" cy="7" r="5.4" stroke="var(--st-due)" stroke-width="1.5" fill="none"/><path d="M7 3.6a3.4 3.4 0 0 1 0 6.8z" fill="var(--st-due)"/>',
  overdue: '<circle cx="7" cy="7" r="6" fill="var(--st-over)"/><path d="M7 3.9v3.5M7 9.8v.1" stroke="#fff" stroke-width="1.7" stroke-linecap="round"/>',
  review: '<circle cx="7" cy="7" r="5.4" stroke="var(--st-rev)" stroke-width="1.5" fill="none"/><circle cx="7" cy="7" r="2.3" fill="var(--st-rev)"/>',
  promised: '<circle cx="7" cy="7" r="5.4" stroke="var(--st-prom)" stroke-width="1.5" fill="none"/><path d="M7 4.3V7l1.9 1.2" stroke="var(--st-prom)" stroke-width="1.5" fill="none" stroke-linecap="round"/>',
  chat: '<path d="M2 12.5l.8-2.3A5.3 5.3 0 1 1 4.9 12z" stroke="var(--accent)" stroke-width="1.5" fill="none" stroke-linejoin="round"/>',
};
const si = k => `<svg class="si" viewBox="0 0 14 14" aria-hidden="true">${SI[k]}</svg>`;
const navIc = {
  pay: '<rect x="1.5" y="3.5" width="13" height="9" rx="1.5"/><path d="M1.5 6.5h13M4 10h3"/>',
  inbox: '<path d="M2 9.5h3l1 2h4l1-2h3"/><path d="M3.6 3h8.8L14 9.5V13H2V9.5z"/>',
  debt: '<path d="M8 1.8 14.5 13.5h-13z"/><path d="M8 6.5v3M8 11.5v.01"/>',
  report: '<path d="M2.5 13.5h11M4.5 11V7M8 11V3.5M11.5 11V8.5"/>',
};

// ---------- WhatsApp phone
const REQ = 'MBank · +996 700 123 456 · Назира А.';
const W = {
  before: { out: 'Здравствуйте, Чолпон! Напоминаем: 22 окт оплата за Айпери — «Корейский A1» — 4 000 сом.\nРеквизиты: ' + REQ + '\nПосле оплаты пришлите, пожалуйста, фото чека в этот чат.', t: '10:00' },
  ack: { out: 'Спасибо, чек получили! Администратор подтвердит оплату в течение дня.', t: '18:42' },
  thanks: { out: 'Оплата 4 000 сом получена. Спасибо!', t: '18:50' },
  partial: { out: 'Получили 3 500 сом, спасибо! Осталось доплатить 500 сом. Реквизиты те же.', t: '18:50' },
  day: { out: 'Здравствуйте, Чолпон! Сегодня день оплаты за Айпери — «Корейский A1» — 4 000 сом.\nПосле перевода пришлите чек в этот чат.', t: '10:00' },
  late: { out: 'Здравствуйте, Чолпон! Оплата за «Корейский A1» просрочена на 3 дн. К оплате — 4 000 сом. Если уже оплатили, пришлите чек.', t: '10:00' },
  ask: { in: 'Здравствуйте! Можно оплатить 30-го? Зарплату задерживают.', t: '11:20' },
  yes: { out: 'Да, можно до 30 окт. Записали, ждём оплату.', t: '11:34', tag: 'Администратор' },
};
const receiptPic = amount => `<div class="receipt sm" role="img" aria-label="Фото чека"><div class="ck">✓</div><div class="t">Перевод выполнен</div><div class="a">${money(amount)}</div>
  <div class="r"><span>Получатель</span><span>Назира А.</span></div><div class="r"><span>Банк</span><span>MBank</span></div>
  <div class="r"><span>Дата</span><span>19.10.2026 18:41</span></div><div class="r"><span>№ операции</span><span>MB-58210934</span></div></div>`;
const bub = (m, fresh, d = '') => {
  const cls = fresh ? `new ${d}` : '';
  if (m.sep) return `<div class="day-sep ${cls}">${m.sep}</div>`;
  if (m.img) return `<div class="bub in img ${cls}">${receiptPic(m.img)}<time>18:41</time></div>`;
  if (m.in) return `<div class="bub in ${cls}">${esc(m.in)}<time>${m.t}</time></div>`;
  return `<div class="bub out ${cls}"><span class="tg">${m.tag || 'Бот центра'}</span>${esc(m.out)}<time>${m.t}</time></div>`;
};
function waPhone(old, fresh) {
  const delays = ['', 'd1', 'd2', 'd3', 'd4'];
  return `<div class="phone"><div class="notch"></div><div class="screen wa-screen"><div class="sbar"><span>18:50</span><span>●●●</span></div>
    <div class="wa-top"><div class="av">УЦ</div><div><b>Ваш учебный центр</b><small>бизнес-аккаунт WhatsApp</small></div></div>
    <div class="wa-chat">${old.map(m => bub(m, false)).join('')}${fresh.map((m, i) => bub(m, true, delays[i] || 'd4')).join('')}</div>
    <div class="wa-in"><span></span><i></i></div></div></div>`;
}

// ---------- admin phone
function adPhone(title, body, on = 'pay') {
  const nav = [['pay', 'Оплаты'], ['inbox', 'Чеки'], ['debt', 'Должники'], ['report', 'Отчёт']];
  return `<div class="phone"><div class="notch"></div><div class="screen ad-screen"><div class="sbar"><span>18:50</span><span>●●●</span></div>
    <div class="ad-top"><span class="ws-logo">✓</span><b>${title}</b><span class="t3">19 окт</span></div>
    <div class="ad-body">${body}</div>
    <div class="ad-nav">${nav.map(([k, t]) => `<span class="${k === on ? 'on' : ''}"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${navIc[k]}</svg>${t}</span>`).join('')}</div></div></div>`;
}
const li = (icon, name, sub, amt, when, cls = '', whenCls = '') => `<div class="li ${cls}">${si(icon)}<div class="g"><b>${name}</b><small>${sub}</small></div><div class="r">${amt}<small class="${whenCls}">${when}</small></div></div>`;
const others = `${li('due', 'Алина Ким', 'IELTS', '5 400 сом', '22 окт')}${li('due', 'София Иванова', 'мама Елена', '3 500 сом', 'сегодня')}${li('overdue', 'Даниэль Пак', 'мама Ирина', '5 000 сом', '3 дн.', '', 'bad')}`;
const checks = (rows, fresh) => `<div class="ck-list">${rows.map(([lvl, k, v], i) => `<div class="ck-row ${lvl} ${fresh ? 'new d' + (i + 1) : ''}"><span class="ic">${lvl === 'ok' ? '✓' : '!'}</span><span><span class="k">${k}:</span> <span class="v">${v}</span></span></div>`).join('')}</div>`;
const checkCard = (amount, rows, verdict, fresh, btn) => `<div class="card"><div class="card-h"><span>Чек от Чолпон (мама)</span><span>18:41</span></div>
  <div class="mini-r">${receiptPic(amount).replace('receipt sm', 'receipt')}<div style="font-size:12px;display:grid;gap:3px"><b>Айпери Маратова</b><span class="t3">Корейский A1</span><span>К оплате: <b>4 000 сом</b></span></div></div>
  <div class="verd ${verdict[0]} ${fresh ? 'new d5' : ''}">${verdict[1]}</div>${checks(rows, fresh)}</div>${btn || ''}`;

// ---------- report data from the seed
const S = buildSeed();
const MONTHS = ['Июль', 'Август', 'Сентябрь', 'Октябрь'];
const periods = ['2026-07', '2026-08', '2026-09', '2026-10'];
const rep = periods.map(p => L.monthReport(S, p));
const view = L.ledgerView(S);
const debt = L.debtors(S, view);
const debtSum = debt.reduce((a, x) => a + x.v.overdue, 0);
const octReceipts = S.receipts.filter(r => r.date >= '2026-10-01').length;
const byGroup = S.groups.map(g => {
  let amount = 0, paid = 0;
  for (const v of view.values()) for (const c of v.charges) if (c.groupId === g.id && c.period === '2026-10' && c.due <= S.today) { amount += c.amount; paid += c.amount - c.left; }
  return { g, amount, paid, pct: amount ? Math.round(paid / amount * 100) : 100 };
}).sort((a, b) => a.pct - b.pct);
const thousand = n => (n / 1000).toLocaleString('ru-RU', { maximumFractionDigits: 1 }) + ' тыс';

function monthChart() {
  const w = 560, h = 230, left = 8, right = 8, top = 26, bottom = 28;
  const max = Math.max(...rep.map(r => Math.max(r.charged, r.collected))) * 1.05;
  const y = v => top + (h - top - bottom) * (1 - v / max);
  const band = (w - left - right) / rep.length, bw = Math.min(56, band * 0.5);
  const grid = [0.25, 0.5, 0.75, 1].map(f => `<line class="grid" x1="${left}" x2="${w - right}" y1="${y(max * f / 1.05)}" y2="${y(max * f / 1.05)}"/>`).join('');
  const bars = rep.map((r, i) => {
    const cx = left + band * i + band / 2, x = cx - bw / 2, yb = y(r.collected), hgt = y(0) - yb;
    const partial = i === rep.length - 1;
    const path = `M${x},${y(0)} V${yb + 4} Q${x},${yb} ${x + 4},${yb} H${x + bw - 4} Q${x + bw},${yb} ${x + bw},${yb + 4} V${y(0)} Z`;
    return `<rect class="hit" data-i="${i}" x="${left + band * i}" y="${top - 20}" width="${band}" height="${h - top - bottom + 20}"/><g pointer-events="none">${hgt > 0 ? `<path class="bar ${partial ? 'partial' : ''}" d="${path}"/>` : ''}
      <line class="target" x1="${x - 6}" x2="${x + bw + 6}" y1="${y(r.charged)}" y2="${y(r.charged)}"/>
      <text class="val" x="${cx}" y="${Math.min(yb, y(r.charged)) - 8}" text-anchor="middle">${thousand(r.collected)}</text>
      <text x="${cx}" y="${h - 8}" text-anchor="middle">${MONTHS[i]}${partial ? ' (идёт)' : ''}</text></g>`;
  }).join('');
  return `<svg class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Собрано по месяцам">${grid}<line class="base" x1="${left}" x2="${w - right}" y1="${y(0)}" y2="${y(0)}"/>${bars}</svg>`;
}

function dashboard() {
  const oct = rep[3];
  return `<div class="kpis">
      <div class="kpi"><span class="k">Собрано в октябре</span><span class="v">${money(oct.collected)}</span><span class="s">на 19 октября</span></div>
      <div class="kpi"><span class="k">Начислено за октябрь</span><span class="v">${money(oct.charged)}</span><span class="s">${Math.round(oct.collected / oct.charged * 100)}% уже собрано</span></div>
      <div class="kpi"><span class="k">Должники</span><span class="v">${debt.length} ${debt.length % 10 === 1 && debt.length % 100 !== 11 ? 'семья' : [2, 3, 4].includes(debt.length % 10) && ![12, 13, 14].includes(debt.length % 100) ? 'семьи' : 'семей'}</span><span class="s">${money(debtSum)} просрочено</span></div>
      <div class="kpi"><span class="k">Чеков проверил ИИ</span><span class="v">${octReceipts}</span><span class="s">за октябрь, вручную — 0</span></div>
    </div>
    <div class="charts">
      <div class="chart-card" id="mchart"><h3>Собрано по месяцам</h3><div class="sub">Нажмите на столбец, чтобы увидеть детали</div>
        <div class="legend-row"><span><i></i>Собрано</span><span><i class="t"></i>Начислено</span></div>
        ${monthChart()}<div class="tip" hidden></div>
        <details class="table"><summary>Показать таблицей</summary><table><tr><th>Месяц</th><th>Начислено</th><th>Собрано</th><th>%</th></tr>${rep.map((r, i) => `<tr><td>${MONTHS[i]}</td><td>${money(r.charged)}</td><td>${money(r.collected)}</td><td>${Math.round(r.collected / r.charged * 100)}%</td></tr>`).join('')}</table></details></div>
      <div class="chart-card"><h3>Оплачено по группам</h3><div class="sub">Октябрь, по наступившим датам оплаты</div>
        <div style="display:grid;gap:10px">${byGroup.map(x => `<div class="gbar"><span class="nm">${esc(x.g.name)}</span><span class="track"><span class="fill" style="display:block;width:${x.pct}%"></span></span><span class="pct">${x.pct}%</span></div>`).join('')}</div>
        <div class="debt-list"><div class="sub" style="margin:6px 0 0">Дольше всех не платят</div>${debt.slice(0, 3).map(x => li(x.promise ? 'promised' : 'overdue', esc(x.payer.label), x.promise ? `обещали ${L.fmtDate(x.promise.date)}` : `${x.v.daysOverdue} дн. просрочки`, money(x.v.overdue), '')).join('')}</div></div>
    </div>`;
}

// ---------- slides
const SLIDES = [
  { key: 'title', kind: 'center', html: () => `<div class="s-text"><div class="eyebrow">Для вашего учебного центра</div><h1>Оплаты учеников<br>без журнала</h1>
      <p>Бот сам напоминает родителям в WhatsApp, ИИ проверяет чеки, а вы в телефоне видите, кто оплатил.</p>
      <button class="btn primary start" data-go="1">Посмотреть, как это работает →</button></div>` },
  { key: 'compare', kind: 'wide', html: () => `<div class="s-text"><div class="eyebrow">Что изменится</div><h2>Меньше памяти и переписок, больше порядка</h2></div>
      <div class="compare"><div class="cmp now"><h3>Сейчас</h3><ul><li>Кто и когда должен — в журнале и в голове</li><li>Напоминаете каждому родителю вручную</li><li>Чеки теряются в личной переписке</li><li>Сложно понять, сколько собрали за месяц</li></ul></div>
      <div class="cmp next"><h3>С системой</h3><ul><li>Все ученики и оплаты в телефоне</li><li>Бот сам напоминает за 3 дня до оплаты</li><li>ИИ проверяет чек за пару секунд</li><li>Отчёт за месяц на одном экране</li></ul></div></div>` },
  { key: 'remind', eyebrow: 'Шаг 1 · за 3 дня до оплаты', title: 'Бот сам напоминает маме', text: 'В 10:00 родитель получает сообщение в WhatsApp: сумма, дата и реквизиты. Вам ничего делать не нужно.', show: 'parent',
    wa: [[], [{ sep: '19 октября' }, W.before]],
    ad: () => adPhone('Оплаты', `<div class="card new"><div class="li">${si('chat')}<div class="g"><b>Бот напомнил 4 семьям</b><small>сегодня в 10:00</small></div></div></div>
      <div class="card"><div class="card-h"><span>Скоро оплата</span><span>4</span></div>${li('due', 'Айпери Маратова', 'мама Чолпон', '4 000 сом', '22 окт', 'hl')}${others}</div>`) },
  { key: 'receipt', eyebrow: 'Шаг 2 · мама оплатила', title: 'Мама присылает фото чека', text: 'Прямо в этот же чат. Бот отвечает, что чек получен, а администратору приходит уведомление.', show: 'parent',
    wa: [[{ sep: '19 октября' }, W.before], [{ img: 4000 }, W.ack]],
    ad: () => adPhone('Оплаты', `<div class="push new d2"><span class="ws-logo">✓</span><b>Новый чек · 4 000 сом</b><span class="t3">Чолпон (мама) · Айпери Маратова</span></div>
      <div class="card"><div class="card-h"><span>Скоро оплата</span><span>4</span></div>${li('review', 'Айпери Маратова', 'чек получен, проверяется', '4 000 сом', '22 окт', 'hl new d2')}${others}</div>`) },
  { key: 'ai', eyebrow: 'Шаг 3 · пара секунд', title: 'ИИ проверяет чек', text: 'Сумма, получатель, дата и номер операции. Если чек повторный, чужой или на другую сумму, система это покажет.', show: 'admin',
    wa: [[{ sep: '19 октября' }, W.before, { img: 4000 }, W.ack], []],
    ad: () => adPhone('Чек', checkCard(4000, [['ok', 'Сумма', '4 000 сом, как в счёте'], ['ok', 'Получатель', 'Назира А., наши реквизиты'], ['ok', 'Дата', 'сегодня, 18:41'], ['ok', 'Номер операции', 'раньше не встречался']], ['ok', 'Всё сходится'], true), 'inbox') },
  { key: 'confirm', eyebrow: 'Шаг 4 · одна кнопка', title: 'Вы подтверждаете, оплата засчитана', text: 'Маме приходит «Спасибо», ученик отмечается оплаченным до следующего месяца. Всё это видно в телефоне.', show: 'admin',
    wa: [[{ sep: '19 октября' }, W.before, { img: 4000 }, W.ack], [W.thanks]],
    ad: () => adPhone('Оплаты', `<button class="ad-btn primary tap" tabindex="-1">Подтвердить 4 000 сом</button>
      <div class="card"><div class="card-h"><span>Оплачено сегодня</span><span>1</span></div>${li('paid', 'Айпери Маратова', 'Корейский A1 · до 22 ноя', '4 000 сом', 'оплачено', 'hl new d4')}</div>
      <div class="card m-hide"><div class="card-h"><span>Скоро оплата</span><span>3</span></div>${others}</div>`) },
  { key: 'partial', eyebrow: 'А если перевели не всю сумму', title: 'Остаток система запомнит', text: 'Засчитываем, сколько пришло. Бот сам скажет родителю про остаток и напомнит о нём. Переплата закроет следующий месяц.', show: 'admin',
    wa: [[{ sep: '19 октября' }, W.before, { img: 3500 }, W.ack], [W.partial]],
    ad: () => adPhone('Чек', checkCard(3500, [['warn', 'Сумма', '3 500 сом, меньше на 500'], ['ok', 'Получатель', 'Назира А.'], ['ok', 'Дата', 'сегодня, 18:41'], ['ok', 'Номер операции', 'раньше не встречался']], ['warn', 'Засчитать 3 500, долг 500 сом'], true, '<button class="ad-btn primary">Засчитать 3 500 сом</button>'), 'inbox') },
  { key: 'late', eyebrow: 'А если не оплатили', title: 'Бот напомнит ещё раз, должник будет в списке', text: 'В день оплаты и через 3 дня. Если родитель попросит отсрочку, бот подождёт до обещанной даты и напомнит в этот день.', show: 'admin',
    wa: [[{ sep: '19 октября' }, W.before], [{ sep: '22 октября' }, W.day, { sep: '25 октября' }, W.late, W.ask, W.yes]],
    ad: () => adPhone('Должники', `<div class="card"><div class="card-h"><span>Айпери Маратова</span><span>4 000 сом</span></div><div class="timeline">
        <div class="tl new"><span class="d">19 окт</span>${si('chat')}<span>Напомнили за 3 дня</span></div>
        <div class="tl new d1"><span class="d">22 окт</span>${si('due')}<span>День оплаты, напомнили</span></div>
        <div class="tl new d2"><span class="d">25 окт</span>${si('overdue')}<span>Просрочка 3 дн., напомнили</span></div>
        <div class="tl new d3"><span class="d">25 окт</span>${si('promised')}<span>Мама обещала до 30 окт, бот ждёт</span></div></div></div>
      <div class="card m-hide"><div class="card-h"><span>Должники</span><span>3</span></div>${li('promised', 'Айпери Маратова', 'обещали 30 окт', '4 000 сом', '3 дн.', 'hl new d4')}${li('overdue', 'Нурислам Осмонов', 'мама Айгуль', '3 000 сом', '21 дн.', '', 'bad')}${li('overdue', 'Бермет Шаршеева', 'сама', '2 000 сом', '10 дн.', '', 'bad')}</div>`, 'debt') },
  { key: 'report', kind: 'dash', html: () => `<div class="s-text"><div class="eyebrow">Для руководителя</div><h2>Сколько собрано — на одном экране</h2><p>Пример на тестовых данных: 24 ученика, 6 групп, июль–октябрь.</p></div>${dashboard()}` },
  { key: 'final', kind: 'center', html: () => `<div class="s-text"><div class="eyebrow">Ваше мнение</div><h2>Это то, что вам нужно?</h2><p>Отметьте, что важно для вашего центра, и отправьте ответ. Под ваши ответы соберём рабочую версию.</p></div>
      <div class="qs">${FEATURES.map((t, i) => `<label><input type="checkbox" data-fb-f="${i}" ${fb.f[i] ? 'checked' : ''}><span>${t}</span></label>`).join('')}</div>
      <div class="qs-form"><input class="input" data-fb="name" placeholder="Ваше имя" value="${esc(fb.name)}" aria-label="Имя" autocomplete="name">
        <input class="input" data-fb="contact" placeholder="Телефон или WhatsApp" value="${esc(fb.contact)}" aria-label="Телефон" inputmode="tel" autocomplete="tel">
        <textarea class="textarea" data-fb="comment" rows="3" placeholder="Что добавить, убрать или сделать иначе?" aria-label="Комментарий">${esc(fb.comment)}</textarea></div>
      <div class="final-acts"><button class="btn primary" data-act="send" ${fb.sent ? 'disabled' : ''}>${fb.sent ? 'Ответ отправлен ✓' : 'Отправить ответ'}</button><button class="btn" data-act="copy">Скопировать для WhatsApp</button></div>
      <p class="send-status" id="send-status" role="status">${fb.sent ? 'Спасибо! Тимур получил ваш ответ и свяжется с вами.' : ''}</p>
      <textarea class="textarea" id="copy-out" rows="6" hidden aria-label="Текст ответа"></textarea>` },
];

// Answers go to a Google Sheet through an Apps Script web app (feedback-gas/).
const FEEDBACK_URL = 'https://script.google.com/macros/s/AKfycbyaDfN41HGj74crtJr-S_r72uRr72GfBROOYElBRBePbQ1JDmXFynbDaFqkn-aWa3Lf/exec';
const FEATURES = ['Напоминания об оплате в WhatsApp', 'Проверка чеков через ИИ', 'Отчёт по оплатам за месяц', 'Отметка посещаемости на занятиях', 'Оплата за количество занятий, а не за месяц', 'Несколько филиалов'];
const fb = { f: FEATURES.map((_, i) => i < 3), name: '', contact: '', comment: '', sent: false };
const fbText = () => 'CRM для учебного центра — ответ' + (fb.name ? ' от ' + fb.name : '') + ':\n' + FEATURES.map((t, i) => (fb.f[i] ? '✓ ' : '✗ ') + t).join('\n') + (fb.comment ? '\n\n' + fb.comment : '');

async function sendFeedback(btn) {
  const status = document.getElementById('send-status');
  btn.disabled = true; btn.textContent = 'Отправляем…'; status.textContent = '';
  const body = JSON.stringify({ name: fb.name, contact: fb.contact, comment: fb.comment, answers: FEATURES.map((t, i) => ({ feature: t, wanted: fb.f[i] })), device: navigator.userAgent, page: location.href });
  try {
    // no-cors: Apps Script does not send CORS headers; the request still reaches the sheet.
    await fetch(FEEDBACK_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body });
    fb.sent = true;
    btn.textContent = 'Ответ отправлен ✓';
    status.textContent = 'Спасибо! Тимур получил ваш ответ и свяжется с вами.';
  } catch {
    btn.disabled = false; btn.textContent = 'Отправить ответ';
    status.style.color = 'var(--st-over)';
    status.textContent = 'Не получилось отправить. Нажмите «Скопировать для WhatsApp» и пришлите ответ Тимуру.';
  }
}

let cur = 0, show = null;
const total = SLIDES.length;

function stage(sl) {
  const side = show || sl.show;
  return `<div class="stage" data-show="${side}">
    <div class="dev-tabs" role="tablist"><button class="seg" data-side="parent" aria-pressed="${side === 'parent'}">Мама в WhatsApp</button><button class="seg" data-side="admin" aria-pressed="${side === 'admin'}">Администратор</button></div>
    <div class="dev parent"><span class="dev-l">Телефон мамы · WhatsApp</span>${waPhone(sl.wa[0], sl.wa[1])}</div>
    <div class="dev admin"><span class="dev-l">Телефон администратора</span>${sl.ad()}</div></div>`;
}

function render() {
  const sl = SLIDES[cur];
  const inner = sl.html
    ? `<div class="s-in ${sl.kind === 'center' ? 'center' : sl.kind === 'dash' ? 'dash' : 'wide'} s-anim">${sl.html()}</div>`
    : `<div class="s-in flowslide s-anim"><div class="s-text"><div class="eyebrow">${sl.eyebrow}</div><h2>${sl.title}</h2><p>${sl.text}</p></div>${stage(sl)}</div>`;
  document.getElementById('slide').innerHTML = inner;
  document.getElementById('slide').scrollTop = 0;
  document.getElementById('dots').innerHTML = SLIDES.map((s, i) => `<button data-go="${i}" aria-label="Слайд ${i + 1}" ${i === cur ? 'aria-current="step"' : ''}></button>`).join('');
  document.getElementById('count').textContent = `${cur + 1} / ${total}`;
  document.getElementById('count-top').textContent = `${cur + 1} / ${total}`;
  document.getElementById('prev').disabled = cur === 0;
  const next = document.getElementById('next');
  next.disabled = cur === total - 1;
  next.textContent = cur === total - 1 ? 'Конец' : 'Далее →';
  if (sl.key === 'report') wireChart();
  try { history.replaceState(null, '', '#s' + (cur + 1)); } catch { /* sandboxed */ }
}
function go(i) { cur = Math.max(0, Math.min(total - 1, i)); show = null; render(); }

function wireChart() {
  const card = document.getElementById('mchart'); if (!card) return;
  const tip = card.querySelector('.tip');
  card.querySelectorAll('.hit').forEach(h => {
    h.addEventListener('mouseenter', () => {
      const i = Number(h.dataset.i), r = rep[i];
      tip.innerHTML = `<b>${MONTHS[i]}</b><div><span>Собрано</span><span>${money(r.collected)}</span></div><div><span>Начислено</span><span>${money(r.charged)}</span></div><div><span>Наличными</span><span>${money(r.cash)}</span></div>`;
      tip.hidden = false;
      const box = card.getBoundingClientRect(), hb = h.getBoundingClientRect();
      tip.style.left = Math.min(box.width - 170, Math.max(8, hb.left - box.left + hb.width / 2 - 80)) + 'px';
      tip.style.top = (hb.top - box.top + 10) + 'px';
      h.nextElementSibling.classList.add('hov');
    });
    h.addEventListener('mouseleave', () => { tip.hidden = true; h.nextElementSibling.classList.remove('hov'); });
  });
}

document.addEventListener('click', e => {
  const g = e.target.closest('[data-go]'); if (g) { go(Number(g.dataset.go)); return; }
  const sd = e.target.closest('[data-side]'); if (sd) { show = sd.dataset.side; render(); return; }
  const id = e.target.closest('button')?.id;
  if (id === 'next') go(cur + 1);
  if (id === 'prev') go(cur - 1);
  const sendBtn = e.target.closest('[data-act=send]'); if (sendBtn) { sendFeedback(sendBtn); return; }
  if (e.target.closest('[data-act=copy]')) {
    const text = fbText();
    const out = document.getElementById('copy-out'); out.value = text;
    const fallback = () => { out.hidden = false; out.select(); };
    try { navigator.clipboard.writeText(text).then(() => { e.target.textContent = 'Скопировано ✓'; }, fallback); } catch { fallback(); }
  }
});
document.addEventListener('input', e => {
  const t = e.target;
  if (t.dataset.fb) fb[t.dataset.fb] = t.value;
  if (t.dataset.fbF != null) fb.f[Number(t.dataset.fbF)] = t.checked;
  if (t.dataset.fb || t.dataset.fbF != null) { fb.sent = false; const b = document.querySelector('[data-act=send]'); if (b) { b.disabled = false; b.textContent = 'Отправить ответ'; } }
});
document.addEventListener('keydown', e => {
  if (e.target.closest('input, textarea')) return;
  if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); go(cur + 1); }
  if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); go(cur - 1); }
  if (e.key === 'Home') go(0);
});
let tx = null, ty = null;
document.addEventListener('touchstart', e => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, { passive: true });
document.addEventListener('touchend', e => {
  if (tx == null) return;
  const dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty;
  if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5 && !e.target.closest('svg')) go(cur + (dx < 0 ? 1 : -1));
  tx = null;
}, { passive: true });

const m = location.hash.match(/^#s(\d+)$/);
if (m) cur = Math.max(0, Math.min(total - 1, Number(m[1]) - 1));
render();
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('./sw.js').catch(() => {});
