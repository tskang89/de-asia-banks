'use strict';

let DATA = null;
const $app = document.getElementById('app');

// ---------- 언어 ----------
let LANG = (() => {
  try { const s = localStorage.getItem('lang'); if (s === 'ko' || s === 'en') return s; } catch (e) {}
  const q = new URLSearchParams(location.search).get('lang');
  if (q === 'ko' || q === 'en') return q;
  return (navigator.language || 'ko').toLowerCase().startsWith('ko') ? 'ko' : 'en';
})();
const T = (ko, en) => (LANG === 'en' ? en : ko);
const EN = () => LANG === 'en';

const COUNTRIES = ['한국', '중국', '일본'];
const CNAME = { '한국': ['한국', 'Korea'], '중국': ['중국', 'China'], '일본': ['일본', 'Japan'], '일본(SMBC 제외)': ['일본(SMBC 제외)', 'Japan excl. SMBC'], '전체': ['전체', 'Total'] };
const cn = c => T(...CNAME[c]);
const CCOLOR = { '한국': 'var(--kr)', '중국': 'var(--cn)', '일본': 'var(--jp)', '일본(SMBC 제외)': 'var(--jp)', '전체': 'var(--all)' };
const FORM_LABEL = {
  subsidiary: ['현지법인(은행)', 'Subsidiary bank'], branch: ['지점(§53 KWG)', 'Branch (§53 KWG)'],
  captive: ['자동차금융', 'Auto finance'], securities: ['증권', 'Securities'],
};
const form = f => T(...FORM_LABEL[f]);
const CAT_LABEL = { bank: ['상업은행', 'Commercial banks'], captive: ['자동차금융(캐피탈)', 'Auto finance (captive)'], securities: ['증권', 'Securities'], all: ['전체', 'All'] };
const CAT_NOTE = {
  bank: ['현지법인 은행 + 제3국 지점', 'subsidiary banks + third-country branches'],
  captive: ['자동차 금융 전문은행', 'captive auto-finance banks'], securities: ['증권회사', 'securities firms'],
  all: ['15개 기관 전부', 'all 15 institutions'],
};
const instName = i => (EN() ? i.en : i.ko);
const UM = () => T('백만 유로', 'EUR m');
const UK = () => T('천 유로', 'EUR k');

// ---------- 형식 ----------
let nf1, nf0, nfE;
function setFormats() {
  const loc = EN() ? 'en-US' : 'ko-KR';
  nf1 = new Intl.NumberFormat(loc, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  nf0 = new Intl.NumberFormat(loc, { maximumFractionDigits: 0 });
  nfE = new Intl.NumberFormat(loc, { maximumFractionDigits: 1 });
}
setFormats();
const isNum = v => typeof v === 'number' && isFinite(v);
const minus = s => s.replace('-', '−');
function money(teur, unit = 'm') {           // TEUR -> 표시 문자열
  if (!isNum(teur)) return '–';
  if (unit === 'k') return minus(nf0.format(teur));
  return minus(nf1.format(teur / 1000));
}
function pct(x, d = 2) { return isNum(x) ? minus((x * 100).toFixed(d)) + '%' : '–'; }
function emp(x) { return isNum(x) ? nfE.format(x) : '–'; }
function cls(v) { return isNum(v) && v < 0 ? ' neg' : ''; }
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function fyLabel(inst, y) { return inst.fye === 3 ? `FY${y}` : String(y); }
function fyLong(inst, y) {
  if (inst.fye !== 3) return `${y}`;
  return EN() ? `FY${y} (Apr ${y}–Mar ${y + 1})` : `FY${y} (${y}.4–${y + 1}.3)`;
}
const nInst = n => T(`${n}곳`, `${n} inst.`);

// 지표 정의: [한국어, 영어] 라벨·설명
const METRICS = {
  TA: { l: ['총자산', 'Total assets'], fmt: v => money(v), unit: 'm', amount: true },
  Liab: { l: ['부채', 'Liabilities'], fmt: v => money(v), unit: 'm', amount: true, d: ['총자산 − 자본', 'Total assets − equity'] },
  Eq: { l: ['자본', 'Equity'], fmt: v => money(v), unit: 'm', amount: true, d: ['자기자본 + §340g 기금. 지점은 본점 출연자본', 'Equity + §340g fund. For branches: dotation capital from head office'] },
  NI: { l: ['당기순이익', 'Net income'], fmt: v => money(v), unit: 'm', amount: true },
  Pretax: { l: ['세전이익', 'Profit before tax'], fmt: v => money(v), unit: 'm', amount: true },
  NII: { l: ['순이자이익', 'Net interest income'], fmt: v => money(v), unit: 'm', amount: true },
  employees: { l: ['직원 수', 'Employees'], fmt: v => emp(v), unit: 'p', d: ['연평균(없으면 연말)', 'Annual average (year-end if not reported)'] },
  nii_avg_ta: { l: ['순이자이익/평균자산', 'NII / avg. assets'], fmt: v => pct(v), d: ['순이자이익 ÷ 평균 총자산', 'Net interest income ÷ average total assets'] },
  nfi_share: { l: ['수수료이익 비중', 'Fee income share'], fmt: v => pct(v, 1), d: ['순수수료이익 ÷ 순영업수익', 'Net fee income ÷ net operating income'] },
  cir: { l: ['경비율(CIR)', 'Cost-income ratio'], fmt: v => pct(v, 1), d: ['(관리비 + 감가상각) ÷ 순영업수익', '(Admin. expenses + depreciation) ÷ net operating income'] },
  credit_cost: { l: ['대손비용률', 'Credit cost ratio'], fmt: v => pct(v), d: ['순대손비용 ÷ 평균(고객대출 + 리스자산)', 'Net credit loss expense ÷ average (customer loans + leased assets)'] },
  roa: { l: ['ROA', 'ROA'], fmt: v => pct(v), d: ['당기순이익 ÷ 평균 총자산', 'Net income ÷ average total assets'] },
  roa_pretax: { l: ['세전 ROA', 'Pre-tax ROA'], fmt: v => pct(v), d: ['세전이익 ÷ 평균 총자산', 'Profit before tax ÷ average total assets'] },
  roe: { l: ['ROE', 'ROE'], fmt: v => pct(v, 1), d: ['당기순이익 ÷ 평균 자본. 지점은 표시하지 않음', 'Net income ÷ average equity. Not shown for branches'] },
  roe_nonbranch: { l: ['ROE(법인만)', 'ROE (excl. branches)'], fmt: v => pct(v, 1), d: ['지점을 뺀 법인의 당기순이익 ÷ 평균 자본', 'Net income ÷ average equity of legal entities, branches excluded'] },
  eq_ta: { l: ['자본/총자산', 'Equity / assets'], fmt: v => pct(v, 1), d: ['연말 자본 ÷ 총자산', 'Year-end equity ÷ total assets'] },
  fund_cust: { l: ['고객예금 조달 비중', 'Customer deposit funding'], fmt: v => pct(v, 1), d: ['제3자 고객예금 ÷ 부채·자본 총계', 'Third-party customer deposits ÷ total liabilities and equity'] },
  fund_bank: { l: ['은행 차입 비중', 'Bank funding'], fmt: v => pct(v, 1), d: ['제3자 은행 차입 ÷ 부채·자본 총계', 'Third-party bank borrowing ÷ total liabilities and equity'] },
  fund_intra: { l: ['본점·그룹 조달 비중', 'Head-office/group funding'], fmt: v => pct(v, 1), d: ['본점 계정 + 계열사 앞 부채 ÷ 부채·자본 총계', 'Head-office account + liabilities to affiliates ÷ total liabilities and equity'] },
  intra_assets: { l: ['본점·그룹 앞 자산 비중', 'Claims on head office/group'], fmt: v => pct(v, 1) },
  ltc_share: { l: ['고객대출/총자산', 'Customer loans / assets'], fmt: v => pct(v, 1) },
  sec_share: { l: ['유가증권/총자산', 'Securities / assets'], fmt: v => pct(v, 1) },
  lease_share: { l: ['리스자산/총자산', 'Leased assets / assets'], fmt: v => pct(v, 1) },
  ta_per_emp: { l: ['1인당 총자산', 'Assets per employee'], fmt: v => money(v), unit: 'm' },
};
const mL = k => T(...METRICS[k].l);
const mD = k => (METRICS[k].d ? T(...METRICS[k].d) : '');
const mU = k => ({ m: UM(), p: T('명', ''), undefined: '' }[METRICS[k].unit] || '');

// ---------- 공통 UI ----------
function seg(id, options, current) {
  return `<div class="seg" id="${id}" role="group">` + options.map(([v, l]) =>
    `<button type="button" data-v="${esc(v)}" class="${String(v) === String(current) ? 'on' : ''}">${esc(l)}</button>`).join('') + '</div>';
}
function onSeg(id, fn) {
  document.getElementById(id).addEventListener('click', e => {
    const b = e.target.closest('button'); if (b) fn(b.dataset.v);
  });
}
function tipEl(host) {
  let t = host.querySelector('.tip');
  if (!t) { t = document.createElement('div'); t.className = 'tip'; host.appendChild(t); }
  return t;
}
function placeTip(tip, host, x, y) {
  tip.style.display = 'block';
  const hw = host.clientWidth, tw = tip.offsetWidth;
  let left = x + 14; if (left + tw > hw) left = x - tw - 14; if (left < 0) left = 0;
  tip.style.left = left + 'px'; tip.style.top = Math.max(0, y - 10) + 'px';
}

function niceTicks(min, max, n = 5) {
  if (min === max) { max = min + 1; }
  const span = max - min, step0 = span / n;
  const mag = Math.pow(10, Math.floor(Math.log10(step0)));
  const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => span / s <= n) || 10 * mag;
  const lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step;
  const t = []; for (let v = lo; v <= hi + step / 2; v += step) t.push(+v.toFixed(10));
  return t;
}

// 막대(연도별 1계열). 기준선에 붙은 쪽은 각지고 끝은 4px 둥글게.
function barPath(x, y0, y1, w, r) {
  const up = y1 < y0, h = Math.abs(y1 - y0); r = Math.min(r, h / 2, w / 2);
  if (h < 0.5) return '';
  if (up) return `M${x},${y0}V${y1 + r}Q${x},${y1} ${x + r},${y1}H${x + w - r}Q${x + w},${y1} ${x + w},${y1 + r}V${y0}Z`;
  return `M${x},${y0}V${y1 - r}Q${x},${y1} ${x + r},${y1}H${x + w - r}Q${x + w},${y1} ${x + w},${y1 - r}V${y0}Z`;
}
function barChart(host, { labels, values, unit }) {
  const W = Math.max(260, Math.round(host.clientWidth || 520)), H = W < 420 ? 190 : 220, m = { l: 48, r: 8, t: 22, b: 26 };
  const vals = values.filter(isNum);
  const ticks = niceTicks(Math.min(0, ...vals), Math.max(0, ...vals), 4);
  const y = v => m.t + (ticks[ticks.length - 1] - v) / (ticks[ticks.length - 1] - ticks[0]) * (H - m.t - m.b);
  const band = (W - m.l - m.r) / labels.length, bw = Math.min(44, band * 0.56);
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img">`;
  ticks.forEach(t => {
    s += `<line class="${t === 0 ? 'zero' : 'gridline'}" x1="${m.l}" x2="${W - m.r}" y1="${y(t)}" y2="${y(t)}"/>`;
    s += `<text x="${m.l - 8}" y="${y(t) + 4}" text-anchor="end">${minus(nfE.format(t / 1000))}</text>`;
  });
  let last = -1; values.forEach((v, i) => { if (isNum(v)) last = i; });
  values.forEach((v, i) => {
    const cx = m.l + band * i + band / 2;
    s += `<text x="${cx}" y="${H - 6}" text-anchor="middle">${esc(labels[i])}</text>`;
    if (!isNum(v)) { s += `<text x="${cx}" y="${y(0) - 6}" text-anchor="middle">${T('미공시', 'n/a')}</text>`; return; }
    s += `<path d="${barPath(cx - bw / 2, y(0), y(v), bw, 4)}" fill="${v < 0 ? 'var(--bar-neg)' : 'var(--bar)'}"/>`;
    const edge = i === labels.length - 1 && W < 420;
    if (i === last) s += `<text class="vlbl" x="${cx}" y="${v < 0 ? y(v) + 14 : y(v) - 6}" text-anchor="${edge ? 'end' : 'middle'}" ${edge ? `dx="${bw / 2}"` : ''}>${money(v)}</text>`;
    s += `<rect x="${m.l + band * i}" y="${m.t}" width="${band}" height="${H - m.t - m.b}" fill="transparent" data-i="${i}"/>`;
  });
  s += `<text x="${m.l - 8}" y="10" text-anchor="end">${esc(unit)}</text></svg>`;
  host.innerHTML = s;
  const tip = tipEl(host);
  host.querySelectorAll('rect[data-i]').forEach(r => {
    const show = e => {
      const i = +r.dataset.i, b = host.getBoundingClientRect();
      tip.innerHTML = `<b>${esc(labels[i])}</b>${money(values[i])} ${esc(unit)}`;
      placeTip(tip, host, e.clientX - b.left, e.clientY - b.top);
    };
    r.addEventListener('pointermove', show); r.addEventListener('pointerdown', show);
    r.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') tip.style.display = 'none'; });
  });
}

// 선(국가별 다계열) + 십자선 툴팁
function lineChart(host, { years, series, fmt, tickFmt }) {
  const W = Math.max(260, Math.round(host.clientWidth || 760)), narrow = W < 560;
  const H = narrow ? 240 : 300, m = { l: narrow ? 52 : 64, r: narrow ? 14 : 120, t: 16, b: 28 };
  const all = []; series.forEach(se => years.forEach(y => { if (isNum(se.v[y])) all.push(se.v[y]); }));
  if (!all.length) { host.innerHTML = `<p class="muted small">${T('이 조합에는 자료가 없다.', 'No data for this selection.')}</p>`; return; }
  const ticks = niceTicks(Math.min(0, ...all), Math.max(...all, 0), 5);
  const y0 = ticks[0], y1 = ticks[ticks.length - 1];
  const x = i => m.l + (years.length === 1 ? 0 : i * (W - m.l - m.r) / (years.length - 1));
  const y = v => m.t + (y1 - v) / (y1 - y0) * (H - m.t - m.b);
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img">`;
  ticks.forEach(t => {
    s += `<line class="${t === 0 ? 'zero' : 'gridline'}" x1="${m.l}" x2="${W - m.r}" y1="${y(t)}" y2="${y(t)}"/>`;
    s += `<text x="${m.l - 8}" y="${y(t) + 4}" text-anchor="end">${tickFmt(t)}</text>`;
  });
  years.forEach((yr, i) => { s += `<text x="${x(i)}" y="${H - 6}" text-anchor="middle">${yr}</text>`; });
  const ends = [];
  series.forEach(se => {
    let d = '', pen = false;
    years.forEach((yr, i) => {
      const v = se.v[yr];
      if (isNum(v)) { d += `${pen ? 'L' : 'M'}${x(i)},${y(v)}`; pen = true; } else pen = false;
    });
    s += `<path d="${d}" fill="none" stroke="${se.color}" stroke-width="2" ${se.dash ? 'stroke-dasharray="5 4"' : ''} stroke-linejoin="round" stroke-linecap="round"/>`;
    years.forEach((yr, i) => {
      const v = se.v[yr]; if (!isNum(v)) return;
      s += `<circle cx="${x(i)}" cy="${y(v)}" r="4" fill="${se.color}" stroke="var(--surface)" stroke-width="2"/>`;
    });
    const li = years.map(yr => isNum(se.v[yr])).lastIndexOf(true);
    if (li >= 0) ends.push({ name: se.name, color: se.color, yy: y(se.v[years[li]]), xx: x(li) });
  });
  // 끝점 직접 라벨(겹치면 아래로 밀기)
  ends.sort((a, b) => a.yy - b.yy);
  for (let i = 1; i < ends.length; i++) if (ends[i].yy - ends[i - 1].yy < 14) ends[i].yy = ends[i - 1].yy + 14;
  if (!narrow) ends.forEach(e => { s += `<text class="lbl" x="${W - m.r + 8}" y="${e.yy + 4}">${esc(e.name)}</text>`; });
  s += `<line class="xh" x1="0" x2="0" y1="${m.t}" y2="${H - m.b}" stroke="var(--text-3)" stroke-width="1" style="display:none"/>`;
  s += `<rect class="hit" x="${m.l - 20}" y="${m.t}" width="${W - m.l - m.r + 40}" height="${H - m.t - m.b}" fill="transparent"/>`;
  s += '</svg>';
  host.innerHTML = s;
  const svg = host.querySelector('svg'), xh = svg.querySelector('.xh'), tip = tipEl(host);
  const hit = svg.querySelector('.hit');
  const show = e => {
    const b = svg.getBoundingClientRect(), sx = (e.clientX - b.left) * W / b.width;
    let i = Math.round((sx - m.l) / ((W - m.l - m.r) / Math.max(1, years.length - 1)));
    i = Math.max(0, Math.min(years.length - 1, i));
    xh.setAttribute('x1', x(i)); xh.setAttribute('x2', x(i)); xh.style.display = '';
    const yr = years[i];
    tip.innerHTML = `<b>${yr}</b>` + series.map(se =>
      `<div class="row"><span><i style="background:${se.color}"></i>${esc(se.name)}</span><span>${fmt(se.v[yr])}${se.n && se.n[yr] ? ` <span class="muted">(${nInst(se.n[yr])})</span>` : ''}</span></div>`).join('');
    const hb = host.getBoundingClientRect();
    placeTip(tip, host, x(i) * b.width / W + (b.left - hb.left), e.clientY - hb.top);
  };
  hit.addEventListener('pointermove', show); hit.addEventListener('pointerdown', show);
  hit.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') { xh.style.display = 'none'; tip.style.display = 'none'; } });
}

let CHARTS = [];
function chart(fn) { CHARTS.push(fn); fn(); }
let lastW = window.innerWidth, rzT = null;
window.addEventListener('resize', () => {
  if (window.innerWidth === lastW) return; lastW = window.innerWidth;
  clearTimeout(rzT); rzT = setTimeout(() => CHARTS.forEach(f => f()), 150);
});
document.addEventListener('pointerdown', e => {
  if (!e.target.closest('.chart')) document.querySelectorAll('.tip').forEach(t => { t.style.display = 'none'; });
});

// ---------- 기관 목록 ----------
const listState = { cat: 'all', sort: { key: 'TA', dir: -1 } };
function latestRow(inst) { return inst.ratios[String(inst.latest)] || {}; }

function renderHome() {
  const cats = [['all', T('전체', 'All')], ['bank', T('상업은행', 'Banks')], ['captive', T('자동차금융', 'Auto finance')], ['securities', T('증권', 'Securities')]];
  let h = `<h1>${T('독일에 진출한 한·중·일 금융기관', 'Korean, Chinese and Japanese financial institutions in Germany')}</h1>
  <p class="lead">${T(
    '독일 상업등기부(Unternehmensregister)에 공시된 HGB 개별재무제표로 정리한 15개 기관의 최근 실적이다. 기관 이름을 누르면 연도별 재무제표와 지표를 볼 수 있다. 금액 단위는 백만 유로.',
    'Latest results of 15 institutions, compiled from the HGB single-entity financial statements filed in the German company register (Unternehmensregister). Click an institution for its yearly financial statements and ratios. Amounts in EUR millions.')}</p>
  <div class="controls"><label class="ctl">${T('업종', 'Type')}</label>${seg('cat', cats, listState.cat)}
  <label class="ctl only-mob">${T('정렬', 'Sort')} <select id="msort">${[['TA', mL('TA')], ['NI', mL('NI')], ['roa', 'ROA'], ['employees', mL('employees')], ['inst', T('이름', 'Name')]].map(([k, l]) =>
    `<option value="${k}" ${listState.sort.key === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label></div>`;
  const cols = [
    ['inst', T('기관', 'Institution'), false], ['form', T('성격', 'Type'), false], ['latest', T('기준연도', 'Year'), false],
    ['TA', mL('TA'), true], ['Liab', mL('Liab'), true], ['Eq', mL('Eq'), true], ['NI', mL('NI'), true],
    ['roa', 'ROA', true], ['cir', T('경비율', 'CIR'), true], ['employees', mL('employees'), true],
  ];
  COUNTRIES.forEach(c => {
    let list = DATA.institutions.filter(i => i.country === c && (listState.cat === 'all' || i.category === listState.cat));
    if (!list.length) return;
    const { key, dir } = listState.sort;
    const val = i => key === 'inst' ? instName(i) : key === 'form' ? i.form : key === 'latest' ? i.latest : latestRow(i)[key];
    list = list.slice().sort((a, b) => {
      const va = val(a), vb = val(b);
      if (va == null) return 1; if (vb == null) return -1;
      return (va > vb ? 1 : va < vb ? -1 : 0) * dir;
    });
    h += `<div class="country-head"><span class="dot" style="background:${CCOLOR[c]}"></span><h2>${cn(c)}</h2><span class="muted small">${nInst(list.length)}</span></div>
    <div class="mcards only-mob">${list.map(instCard).join('')}</div>
    <div class="card flush only-desk"><div class="table-scroll"><table><thead><tr>` +
      cols.map(([k, l, num]) => `<th class="sortable${num ? ' num' : ''}" data-k="${k}">${l}${key === k ? `<span class="arrow">${dir > 0 ? '▲' : '▼'}</span>` : ''}</th>`).join('') +
      `</tr></thead><tbody>`;
    list.forEach(i => {
      const r = latestRow(i);
      h += `<tr><td class="inst"><a href="#/inst/${i.id}">${esc(instName(i))}</a><span class="sub">${esc(i.name)}</span></td>
        <td><span class="badge">${form(i.form)}</span></td>
        <td title="${esc(fyLong(i, i.latest))}">${fyLabel(i, i.latest)}${i.fye === 3 ? ` <span class="muted small">${T('3월', 'Mar')}</span>` : ''}</td>
        <td class="num">${money(r.TA)}</td><td class="num">${money(r.Liab)}</td><td class="num">${money(r.Eq)}</td>
        <td class="num${cls(r.NI)}">${money(r.NI)}</td><td class="num${cls(r.roa)}">${pct(r.roa)}</td>
        <td class="num">${pct(r.cir, 1)}</td><td class="num">${emp(r.employees)}</td></tr>`;
    });
    h += `</tbody></table></div></div>`;
  });
  h += `<div class="note">${T(
    `<b>읽는 법.</b> 기준연도는 기관마다 공시된 가장 최근 회계연도다. 일본계 6곳은 3월 결산(FY2025 = 2025.4~2026.3)이다.
  우리은행·ICBC·도요타·혼다·다이와는 2025분이 아직 공시되지 않았고(공시 기한은 결산 후 12개월), 미즈호 뒤셀도르프 지점은 FY2024에 청산했다.
  지점의 자본은 본점이 낸 출연자본이라 법인 자본과 성격이 다르다. 경비율은 (관리비+감가상각)÷순영업수익, ROA는 평균 총자산 기준이다.`,
    `<b>How to read.</b> "Year" is the most recent fiscal year filed by each institution. The six Japanese institutions have March year-ends (FY2025 = Apr 2025–Mar 2026).
  Woori, ICBC, Toyota, Honda and Daiwa have not yet filed 2025 (the filing deadline is 12 months after year-end); Mizuho's Düsseldorf branch was wound up in FY2024.
  A branch's equity is dotation capital provided by its head office and is not comparable with a legal entity's equity. CIR = (admin. expenses + depreciation) ÷ net operating income; ROA uses average total assets.`)}</div>`;
  $app.innerHTML = h;
  onSeg('cat', v => { listState.cat = v; renderHome(); });
  document.getElementById('msort').addEventListener('change', e => {
    const k = e.target.value; listState.sort = { key: k, dir: k === 'inst' ? 1 : -1 }; renderHome();
  });
  $app.querySelectorAll('th.sortable').forEach(th => th.addEventListener('click', () => {
    const k = th.dataset.k;
    listState.sort = listState.sort.key === k ? { key: k, dir: -listState.sort.dir } : { key: k, dir: ['inst', 'form', 'latest'].includes(k) ? 1 : -1 };
    renderHome();
  }));
}

function instCard(i) {
  const r = latestRow(i);
  const cell = (k, v, c = '') => `<div><span class="k">${k}</span><span class="v${c}">${v}</span></div>`;
  return `<a class="mcard" href="#/inst/${i.id}">
    <div class="mtop"><span class="mname">${esc(instName(i))}</span><span class="badge">${form(i.form)}</span></div>
    <div class="msub">${esc(i.name)} · ${T(`${fyLabel(i, i.latest)}${i.fye === 3 ? '(3월 결산)' : ''} 기준`, `${fyLabel(i, i.latest)}${i.fye === 3 ? ' (March year-end)' : ''}`)}</div>
    <div class="mgrid">${cell(mL('TA'), money(r.TA))}${cell(mL('Liab'), money(r.Liab))}${cell(mL('Eq'), money(r.Eq))}
      ${cell(mL('NI'), money(r.NI), cls(r.NI))}${cell('ROA', pct(r.roa), cls(r.roa))}${cell(mL('employees'), emp(r.employees))}</div>
  </a>`;
}

// ---------- 기관 상세 ----------
const detState = { tab: 'assets', unit: 'm' };
function renderInst(id) {
  const i = DATA.institutions.find(x => x.id === id);
  if (!i) { $app.innerHTML = `<p>${T('기관을 찾을 수 없다.', 'Institution not found.')} <a href="#/">${T('목록으로', 'Back to list')}</a></p>`; return; }
  const ys = Object.keys(i.ratios).map(Number).sort();
  const r = latestRow(i);
  const en = EN() && i.text_en && i.text_en.length;
  const desc = EN() ? (i.desc_en || '') : i.desc;
  const text = en ? i.text_en : (EN() ? [] : i.text);
  const notes = en ? i.notes_en : i.notes;
  let h = `<a class="back" href="#/">← ${T('기관 목록', 'Institutions')}</a>
  <h1>${esc(instName(i))}</h1>
  <p class="muted" style="margin:0 0 8px">${esc(i.name)}</p>
  <p style="margin:0 0 6px"><span class="badge">${cn(i.country)}</span> <span class="badge">${form(i.form)}</span> <span class="badge">${T(`${i.fye}월 결산`, i.fye === 3 ? 'March year-end' : 'December year-end')}</span></p>
  ${desc ? `<p class="lead small" style="margin-top:8px">${esc(desc)}</p>` : ''}
  <h2>${T(`${fyLong(i, i.latest)} 주요 수치`, `Key figures, ${fyLong(i, i.latest)}`)}</h2>
  <div class="kpis">
    ${kpi(mL('TA'), money(r.TA), UM())}${kpi(mL('Liab'), money(r.Liab), UM())}
    ${kpi(i.form === 'branch' ? T('자본(출연자본)', 'Equity (dotation)') : mL('Eq'), money(r.Eq), UM())}
    ${kpi(mL('NI'), money(r.NI), UM(), r.NI)}${kpi('ROA', pct(r.roa), '', r.roa)}
    ${kpi(T('경비율', 'Cost-income ratio'), pct(r.cir, 1), '')}${kpi(mL('employees'), emp(r.employees), r.emp_basis === 'year_end' ? T('명(연말)', ' (year-end)') : T('명', ''))}
  </div>
  <div class="grid2">
    <div class="card"><h3>${mL('TA')}</h3><div class="chart" id="c-ta"></div></div>
    <div class="card"><h3>${mL('NI')}</h3><div class="chart" id="c-ni"></div></div>
  </div>
  <h2>${T('연도별 지표', 'Ratios by year')}</h2>
  <div class="card flush"><div class="table-scroll"><table class="sticky"><thead><tr><th>${T('지표', 'Metric')}</th>${ys.map(y => `<th class="num">${fyLabel(i, y)}</th>`).join('')}</tr></thead><tbody>`;
  const rows = ['TA', 'Liab', 'Eq', 'NII', 'Pretax', 'NI', 'nii_avg_ta', 'nfi_share', 'cir', 'credit_cost', 'roa',
    i.form === 'branch' ? null : 'roe', 'eq_ta', 'fund_cust', 'fund_intra', 'intra_assets', 'ltc_share',
    i.category === 'captive' ? 'lease_share' : 'sec_share', 'employees', 'ta_per_emp'].filter(Boolean);
  rows.forEach(k => {
    const M = METRICS[k], u = mU(k);
    h += `<tr><td title="${esc(mD(k))}">${mL(k)}${u ? ` <span class="muted small">${u}</span>` : ''}</td>` +
      ys.map(y => { const v = (i.ratios[y] || {})[k]; return `<td class="num${cls(v)}">${M.fmt(v)}</td>`; }).join('') + '</tr>';
  });
  h += `</tbody></table></div></div>
  <p class="muted small">${T('비율은 기초·기말 평균 잔액 기준(2021년은 2020년 말 잔액 사용). ', 'Ratios use the average of opening and closing balances (2021 uses the end-2020 balance). ')}${i.form === 'branch' ? T('지점 ROE는 출연자본 기준이라 표시하지 않았다. ', 'Branch ROE is not shown because equity is dotation capital. ') : ''}${i.fye === 3 ? T('3월 결산: FY2024 = 2024.4~2025.3.', 'March year-end: FY2024 = Apr 2024–Mar 2025.') : ''}</p>
  <h2>${T('재무제표', 'Financial statements')}</h2>
  <div class="controls">${seg('unit', [['m', UM()], ['k', UK()]], detState.unit)}
    <span class="muted small">${T('비용은 음수. 숫자를 누르거나 마우스를 올리면 원문 파일과 쪽이 나온다.', 'Expenses are negative. Tap or hover over a figure to see the source file and page.')}</span></div>
  <div class="card flush">
    <div class="tabs" id="stabs">${[['assets', T('대차대조표 · 자산', 'Balance sheet · Assets')], ['liab', T('대차대조표 · 부채와 자본', 'Balance sheet · Liabilities & equity')], ['pl', T('손익계산서', 'Income statement')]].map(([k, l]) =>
      `<button type="button" data-v="${k}" class="${detState.tab === k ? 'on' : ''}">${l}</button>`).join('')}</div>
    <div class="table-scroll" id="stm"></div>
  </div>`;
  h += notesSection(i);
  if (text.length) {
    h += `<h2>${T('해설', 'Commentary')}</h2><div class="card prose">${text.map(p => `<p>${p}</p>`).join('')}
    <details><summary class="small muted">${T(`출처 각주 ${Object.keys(notes).length}개`, `${Object.keys(notes).length} source notes`)}</summary><ol class="fns">` +
      Object.entries(notes).sort((a, b) => a[0] - b[0]).map(([n, t]) => `<li id="fn-${i.id}-${n}" value="${n}">${t}</li>`).join('') +
      `</ol></details></div>`;
  }
  $app.innerHTML = h;
  chart(() => barChart(document.getElementById('c-ta'), { labels: ys.map(y => fyLabel(i, y)), values: ys.map(y => i.ratios[y].TA), unit: UM() }));
  chart(() => barChart(document.getElementById('c-ni'), { labels: ys.map(y => fyLabel(i, y)), values: ys.map(y => i.ratios[y].NI), unit: UM() }));
  drawStatement(i);
  drawNotes(i);
  document.getElementById('fntabs').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    fnState.tab = b.dataset.v; fnState.year = 'all';
    document.querySelectorAll('#fntabs button').forEach(x => x.classList.toggle('on', x === b));
    drawNotes(i);
  });
  onSeg('unit', v => { detState.unit = v; drawStatement(i); document.querySelectorAll('#unit button').forEach(b => b.classList.toggle('on', b.dataset.v === v)); });
  document.getElementById('stabs').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    detState.tab = b.dataset.v;
    document.querySelectorAll('#stabs button').forEach(x => x.classList.toggle('on', x === b));
    drawStatement(i);
  });
  $app.querySelectorAll('sup.fn a').forEach(a => a.addEventListener('click', e => {
    e.preventDefault();
    const det = $app.querySelector('details'); if (det) det.open = true;
    const t = document.getElementById(a.getAttribute('href').slice(1));
    if (t) { t.scrollIntoView({ behavior: 'smooth', block: 'center' }); t.style.background = 'var(--surface-2)'; }
  }));
}
function kpi(k, v, u, raw) {
  return `<div class="kpi"><div class="k">${k}</div><div class="v${cls(raw)}">${v}<span class="u">${u}</span></div></div>`;
}
function drawStatement(i) {
  const rows = i.stm[detState.tab], ys = i.years;
  let h = `<table class="sticky"><thead><tr><th>${T('항목', 'Item')}</th>${ys.map(y => `<th class="num">${fyLabel(i, y)}</th>`).join('')}</tr></thead><tbody>`;
  rows.forEach(r => {
    const c = r.lvl === -1 ? (['TA', 'TL', 'NI'].includes(r.key) ? 'total' : 'bold') : r.lvl > 0 ? `lvl${r.lvl}` : '';
    h += `<tr class="${c}"><td class="label">${esc(EN() ? r.label_en : r.label)}</td>` + ys.map(y => {
      const v = r.v[y], src = r.src[y] || '';
      return `<td class="num${cls(v)}" title="${esc(src)}">${money(v, detState.unit)}</td>`;
    }).join('') + '</tr>';
  });
  h += '</tbody></table>';
  const host = document.getElementById('stm');
  host.innerHTML = h;
  host.onclick = e => {
    const td = e.target.closest('td.num'); if (!td || !td.title) return;
    const tr = td.parentElement, col = [...tr.children].indexOf(td);
    toast(`${esc(tr.children[0].textContent)} · ${esc(host.querySelectorAll('th')[col].textContent)}: ${esc(td.textContent)}<br><span class="muted">${esc(td.title)}</span>`);
  };
}
let toastT = null;
function toast(html) {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
  t.innerHTML = html; t.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 3500);
}

// ---------- 주석·경영보고서 ----------
const fnState = { tab: 'ratios', year: 'all' };
function fnTabs(i) {
  const f = i.fn, tabs = [];
  if (f.ratios.length) tabs.push(['ratios', T('자본·유동성', 'Capital & liquidity')]);
  if (Object.keys(f.maturity).length) tabs.push(['maturity', T('만기 구조', 'Maturities')]);
  if (f.reserves.length) tabs.push(['reserves', T('§340f·§340g 준비금', '§340f/§340g reserves')]);
  f.lists.forEach(l => tabs.push([l.topic, { related_party: T('본점·그룹 거래', 'Head office & group'), loan_loss: T('대손·충당금', 'Loan losses'), mgmt_explanation: T('경영진 설명', 'Management commentary'), other: T('기타 주석', 'Other notes') }[l.topic]]));
  return tabs;
}
function notesSection(i) {
  const tabs = fnTabs(i);
  if (!tabs.length) return '';
  if (!tabs.some(t => t[0] === fnState.tab)) fnState.tab = tabs[0][0];
  return `<h2>${T('주석·경영보고서', 'Notes & management report')}</h2>
  <p class="muted small" style="margin-top:-4px">${T(
    '재무제표 주석(Anhang)과 경영보고서(Lagebericht)에서 뽑은 항목이다. 금액은 백만 유로. 독일어 문장은 원문 그대로 두었다.',
    'Items extracted from the notes (Anhang) and management report (Lagebericht). Amounts in EUR millions. German text is quoted from the original.')}</p>
  <div class="card flush">
    <div class="tabs" id="fntabs">${tabs.map(([k, l]) => `<button type="button" data-v="${k}" class="${fnState.tab === k ? 'on' : ''}">${l}</button>`).join('')}</div>
    <div id="fnbody"></div>
  </div>`;
}
const ntxt = r => (EN() && r.te ? r.te : r.t) || '';
function pctNote(v) { return isNum(v) ? minus(nfE.format(v)) + '%' : '–'; }
function drawNotes(i) {
  const f = i.fn, host = document.getElementById('fnbody'), ys = i.years, tab = fnState.tab;
  if (!host) return;
  let h = '';
  if (tab === 'ratios') {
    h = `<div class="table-scroll"><table class="sticky"><thead><tr><th>${T('항목', 'Item')}</th>${ys.map(y => `<th class="num">${fyLabel(i, y)}</th>`).join('')}</tr></thead><tbody>` +
      f.ratios.map(r => `<tr><td class="label">${esc(EN() ? r.label_en : r.label)}${r.kind === 'teur' ? ` <span class="muted small">${UM()}</span>` : ''}</td>` +
        ys.map(y => { const v = r.v[y]; return `<td class="num" title="${esc(r.src[y] || '')}">${r.kind === 'pct' ? pctNote(v) : money(v)}</td>`; }).join('') + '</tr>').join('') +
      `</tbody></table></div><p class="muted small fnfoot">${T('LCR·NSFR 최저 요건은 100%. 지점은 본점 기준 비율을 공시하거나 공시하지 않는 경우가 많다.', 'Minimum LCR and NSFR requirements are 100%. Branches often report head-office ratios or none at all.')}</p>`;
  } else if (tab === 'maturity') {
    const myears = Object.keys(f.maturity).sort().reverse();
    if (fnState.year === 'all' || !f.maturity[fnState.year]) fnState.year = myears[0];
    const d = f.maturity[fnState.year];
    const LINES = [['lb', '은행 앞 대출', 'Loans to banks'], ['lc', '고객 대출', 'Loans to customers'], ['ho_a', '본점 계정(자산)', 'Head office (asset)'],
      ['db', '은행 차입', 'Due to banks'], ['dc', '고객 예금', 'Due to customers'], ['ho_l', '본점 계정(부채)', 'Head office (liability)'], ['debtsec', '발행 채권', 'Securitised liabilities']];
    const BK = [['demand', '요구불', 'On demand'], ['upto3m', '3개월 이내', '≤ 3m'], ['3m_1y', '3개월~1년', '3m–1y'], ['1y_5y', '1~5년', '1–5y'], ['over5y', '5년 초과', '> 5y'], ['indef', '기한 없음', 'Indefinite']];
    const bks = BK.filter(([b]) => Object.values(d).some(l => l[b]));
    h = `<div class="controls" style="padding:12px 12px 0">${seg('fny', myears.map(y => [y, fyLabel(i, +y)]), fnState.year)}</div>
    <div class="table-scroll"><table class="sticky"><thead><tr><th>${T('잔존만기', 'Residual maturity')}</th>${bks.map(([, k, e]) => `<th class="num">${T(k, e)}</th>`).join('')}<th class="num">${T('합계', 'Total')}</th></tr></thead><tbody>` +
      LINES.filter(([l]) => d[l]).map(([l, k, e]) => {
        const row = d[l]; let sum = 0;
        const cells = bks.map(([b]) => { const c = row[b]; if (c) sum += c.v; return `<td class="num" title="${esc(c ? c.src : '')}">${c ? money(c.v) : '–'}</td>`; }).join('');
        return `<tr><td class="label">${T(k, e)}</td>${cells}<td class="num"><b>${money(sum)}</b></td></tr>`;
      }).join('') +
      `</tbody></table></div><p class="muted small fnfoot">${T('합계는 표에 나온 구간을 더한 값으로, 경과이자·충당금 등이 빠져 대차대조표 금액과 다를 수 있다.', 'Totals add the buckets shown; accrued interest and allowances are excluded, so they can differ from balance-sheet amounts.')}</p>`;
  } else if (tab === 'reserves') {
    h = `<div class="table-scroll"><table class="sticky"><thead><tr><th>${T('항목', 'Item')}</th>${ys.map(y => `<th class="num">${fyLabel(i, y)}</th>`).join('')}</tr></thead><tbody>` +
      f.reserves.map(r => `<tr><td class="label">${esc(EN() ? r.label_en : r.label)} <span class="muted small">${UM()}</span></td>` +
        ys.map(y => {
          const c = r.c[y]; if (!c) return '<td class="num">–</td>';
          const tip = `${ntxt(c)} (${c.src})`;
          return c.nd ? `<td class="num muted" title="${esc(tip)}">${T('미공시', 'n/d')}</td>` : `<td class="num${cls(c.v)}" title="${esc(tip)}">${money(c.v)}</td>`;
        }).join('') + '</tr>').join('') +
      `</tbody></table></div><p class="muted small fnfoot">${T(
        '§340f 준비금은 공개하지 않아도 되고 대손 항목과 상계된다. "미공시"는 원문이 금액을 밝히지 않은 경우다. 셀을 누르면 원문 설명이 나온다.',
        '§340f reserves need not be disclosed and are netted against loan-loss items. "n/d" means the filing does not state the amount. Tap a cell for the original wording.')}</p>`;
  } else {
    const l = f.lists.find(x => x.topic === tab);
    const lyears = [...new Set(l.rows.map(r => r.y))].sort().reverse();
    if (fnState.year !== 'all' && !lyears.includes(+fnState.year)) fnState.year = 'all';
    const rows = l.rows.filter(r => fnState.year === 'all' || r.y === +fnState.year).sort((a, b) => b.y - a.y);
    h = `<div class="controls" style="padding:12px 12px 0">${seg('fny', [['all', T('전체', 'All')], ...lyears.map(y => [y, fyLabel(i, y)])], fnState.year)}</div><div class="fnlist">`;
    let cur = null;
    rows.forEach(r => {
      if (r.y !== cur) { cur = r.y; h += `<div class="fnyear">${fyLong(i, r.y)}</div>`; }
      const val = r.v == null ? '' : r.u === 'pct' ? pctNote(r.v) : `${money(r.v)} ${UM()}`;
      h += `<div class="fnrow">${r.lab ? `<span class="badge">${esc(T(r.lab[0], r.lab[1]))}</span> ` : ''}<span class="fntext">${esc(ntxt(r) || r.i)}</span>
        ${val ? `<span class="fnval${cls(r.v)}">${val}</span>` : ''}<span class="fnsrc">${esc(r.src)}</span></div>`;
    });
    h += '</div>';
  }
  host.innerHTML = h;
  const fy = document.getElementById('fny');
  if (fy) onSeg('fny', v => { fnState.year = v; drawNotes(i); });
  host.querySelectorAll('td[title]').forEach(td => td.addEventListener('click', () => { if (td.title) toast(esc(td.title)); }));
}

// ---------- 국가별 비교 ----------
const cmpState = { cat: 'bank', year: 2024, metric: 'TA' };
const CMP_ROWS = ['한국', '중국', '일본', '일본(SMBC 제외)', '전체'];
function agg(country, cat, year) {
  return DATA.aggregates.find(a => a.country === country && a.category === cat && a.year === year);
}
const hasSmbc = (cat, year) => ((agg('일본', cat, year) || {}).inst || []).includes('SMBC Bank EU AG');
function renderCompare() {
  const years = [...new Set(DATA.aggregates.map(a => a.year))].sort();
  const cats = [['bank', T('상업은행', 'Banks')], ['captive', T('자동차금융', 'Auto finance')], ['securities', T('증권', 'Securities')], ['all', T('전체', 'All')]];
  const metricOpts = ['TA', 'Liab', 'Eq', 'NI', 'NII', 'employees', 'nii_avg_ta', 'nfi_share', 'cir', 'credit_cost', 'roa', 'roa_pretax', 'roe_nonbranch', 'eq_ta', 'fund_cust', 'fund_intra', 'ta_per_emp'];
  const { cat, year, metric } = cmpState;
  let h = `<h1>${T('국가별 비교', 'Comparison by country')}</h1>
  <p class="lead">${T(
    '국가·업종별로 기관 수치를 합산했다. 비율은 기관 비율의 평균이 아니라 합계끼리 나눈 값(규모 가중)이다. 상업은행은 현지법인 은행과 제3국 지점을 합친 것이다.',
    'Institution figures are summed by country and business type. Ratios are computed from the sums (size-weighted), not averaged across institutions. "Banks" combines subsidiary banks and third-country branches.')}</p>
  <div class="controls">
    <label class="ctl">${T('업종', 'Type')}</label>${seg('ccat', cats, cat)}
    <label class="ctl">${T('연도', 'Year')} <select id="cyear">${years.map(y => `<option ${y === year ? 'selected' : ''}>${y}</option>`).join('')}</select></label>
  </div>
  <div class="mcards only-mob">${CMP_ROWS.map(c => cmpCard(c, cat, year)).join('') || `<p class="muted">${T('이 연도·업종에는 자료가 없다.', 'No data for this year and type.')}</p>`}</div>
  <div class="card flush only-desk"><div class="table-scroll"><table><thead><tr>
    <th>${T('국가', 'Country')}</th><th class="num">${T('기관 수', 'Inst.')}</th><th class="num">${mL('TA')}</th><th class="num">${mL('Liab')}</th><th class="num">${mL('Eq')}</th><th class="num">${mL('NI')}</th>
    <th class="num">${mL('employees')}</th><th class="num" title="${esc(mD('nii_avg_ta'))}">${mL('nii_avg_ta')}</th><th class="num" title="${esc(mD('cir'))}">${T('경비율', 'CIR')}</th>
    <th class="num" title="${esc(mD('credit_cost'))}">${mL('credit_cost')}</th><th class="num">ROA</th><th class="num" title="${esc(mD('roe_nonbranch'))}">${mL('roe_nonbranch')}</th>
    <th class="num">${mL('eq_ta')}</th><th class="num">${T('고객예금 조달', 'Deposit funding')}</th><th class="num">${T('본점·그룹 조달', 'HO/group funding')}</th>
  </tr></thead><tbody>`;
  let shown = 0;
  CMP_ROWS.forEach(c => {
    const a = agg(c, cat, year);
    if (!a) return;
    if (c === '일본(SMBC 제외)' && !hasSmbc(cat, year)) return;
    shown++;
    const bold = c === '전체' ? ' class="total"' : '';
    h += `<tr${bold}><td title="${esc(a.inst.join(', '))}"><span class="dot" style="background:${CCOLOR[c]};margin-right:6px"></span>${cn(c)}</td>
      <td class="num">${a.n}</td><td class="num">${money(a.TA)}</td><td class="num">${money(a.Liab)}</td><td class="num">${money(a.Eq)}</td>
      <td class="num${cls(a.NI)}">${money(a.NI)}</td><td class="num">${a.employees != null ? emp(a.employees) : '–'}</td>
      <td class="num">${pct(a.nii_avg_ta)}</td><td class="num">${pct(a.cir, 1)}</td><td class="num">${pct(a.credit_cost)}</td>
      <td class="num${cls(a.roa)}">${pct(a.roa)}</td><td class="num${cls(a.roe_nonbranch)}">${pct(a.roe_nonbranch, 1)}</td>
      <td class="num">${pct(a.eq_ta, 1)}</td><td class="num">${pct(a.fund_cust, 1)}</td><td class="num">${pct(a.fund_intra, 1)}</td></tr>`;
  });
  if (!shown) h += `<tr><td colspan="15" class="muted">${T('이 연도·업종에는 자료가 없다.', 'No data for this year and type.')}</td></tr>`;
  h += `</tbody></table></div></div>
  <p class="muted small">${T('금액 단위 백만 유로. 국가 이름에 마우스를 올리면 합산에 들어간 기관이 나온다. ', 'Amounts in EUR millions. Hover over a country to see the institutions included. ')}
  ${cat !== 'bank' && cat !== 'all' ? '' : T('ROE(법인만)은 지점을 뺀 값이다. ', 'ROE (excl. branches) leaves out branches. ')}${year === 2025 ? T('2025년은 일부 기관이 아직 공시하지 않아 기관 수가 적다. ', 'Fewer institutions in 2025 because some have not yet filed. ') : ''}</p>
  ${compositionList(cat, year)}
  <h2>${T('연도별 추이', 'Trend by year')}</h2>
  <div class="controls"><label class="ctl">${T('지표', 'Metric')} <select id="cmetric">${metricOpts.map(k => `<option value="${k}" ${k === metric ? 'selected' : ''}>${mL(k)}${mU(k) ? ` (${mU(k)})` : ''}</option>`).join('')}</select></label>
  <span class="muted small">${esc(mD(metric))}</span></div>
  <div class="card"><div class="legend" id="lg"></div><div class="chart" id="cline"></div></div>
  <div class="card flush"><div class="table-scroll" id="ctab"></div></div>
  <div class="note">${T(
    `<b>해석할 때.</b> 일본 상업은행 합계는 SMBC Bank EU AG(EU 허브, EU 여러 나라 지점 포함)가 대부분을 차지해 "일본(SMBC 제외)"을 따로 보였다.
  한국 자동차금융은 현대캐피탈뱅크유럽 1곳으로 Santander Consumer Bank가 51%를 가진 합작법인이다.
  일본계는 3월 결산이라 같은 연도라도 12월 결산 기관보다 3개월 늦게 끝난다. 2025년은 일부 기관 미공시로 구성이 다르다.
  중국계는 모두 지점이어서 자본·ROE·조달 구조가 본점 내부 가격에 좌우된다.`,
    `<b>Caveats.</b> SMBC Bank EU AG (an EU hub including branches in several EU countries) dominates the Japanese bank total, so "Japan excl. SMBC" is shown separately.
  Korean auto finance is a single institution, Hyundai Capital Bank Europe, a joint venture 51% owned by Santander Consumer Bank.
  Japanese institutions have March year-ends, so the same year ends three months later than for December year-end institutions. The 2025 composition differs because some institutions have not yet filed.
  All Chinese institutions are branches, so their equity, ROE and funding structure reflect head-office internal pricing.`)}</div>`;
  $app.innerHTML = h;
  onSeg('ccat', v => { cmpState.cat = v; renderCompare(); });
  document.getElementById('cyear').addEventListener('change', e => { cmpState.year = +e.target.value; renderCompare(); });
  document.getElementById('cmetric').addEventListener('change', e => { cmpState.metric = e.target.value; renderCompare(); });

  // 추이 차트와 표
  const M = METRICS[metric];
  const series = [];
  ['한국', '중국', '일본', '일본(SMBC 제외)'].forEach(c => {
    const v = {}, n = {};
    years.forEach(y => { const a = agg(c, cat, y); if (a) { v[y] = a[metric]; n[y] = a.n; } });
    if (!Object.values(v).some(isNum)) return;
    if (c === '일본(SMBC 제외)' && !years.some(y => hasSmbc(cat, y))) return;
    series.push({ key: c, name: cn(c), color: CCOLOR[c], dash: c === '일본(SMBC 제외)', v, n });
  });
  document.getElementById('lg').innerHTML = series.map(s =>
    `<span><i class="${s.dash ? 'dash' : ''}" style="background:${s.color};border-color:${s.color}"></i>${s.name}</span>`).join('');
  const tickFmt = M.amount || metric === 'ta_per_emp' ? t => minus(nf0.format(t / 1000)) : metric === 'employees' ? t => nf0.format(t) : t => minus((t * 100).toFixed(Math.abs(t) < 0.05 ? 2 : 1)) + '%';
  chart(() => lineChart(document.getElementById('cline'), { years, series, fmt: M.fmt, tickFmt }));
  let t = `<table class="sticky"><thead><tr><th>${mL(metric)}${mU(metric) ? ` <span class="muted small">${mU(metric)}</span>` : ''}</th>${years.map(y => `<th class="num">${y}</th>`).join('')}</tr></thead><tbody>`;
  CMP_ROWS.forEach(c => {
    if (!years.some(y => agg(c, cat, y))) return;
    if (c === '일본(SMBC 제외)' && !series.find(s => s.key === c)) return;
    t += `<tr${c === '전체' ? ' class="total"' : ''}><td>${cn(c)}</td>` + years.map(y => {
      const a = agg(c, cat, y); const v = a ? a[metric] : null;
      return `<td class="num${cls(v)}" title="${a ? esc(nInst(a.n) + ': ' + a.inst.join(', ')) : ''}">${M.fmt(v)}${a ? ` <span class="muted small">${a.n}</span>` : ''}</td>`;
    }).join('') + '</tr>';
  });
  t += '</tbody></table>';
  document.getElementById('ctab').innerHTML = t;
}
function cmpCard(c, cat, year) {
  const a = agg(c, cat, year);
  if (!a) return '';
  if (c === '일본(SMBC 제외)' && !hasSmbc(cat, year)) return '';
  const cell = (k, v, cl = '') => `<div><span class="k">${k}</span><span class="v${cl}">${v}</span></div>`;
  return `<div class="mcard${c === '전체' ? ' mtotal' : ''}">
    <div class="mtop"><span class="mname"><span class="dot" style="background:${CCOLOR[c]};margin-right:6px"></span>${cn(c)}</span><span class="muted small">${nInst(a.n)}</span></div>
    <div class="mgrid">${cell(mL('TA'), money(a.TA))}${cell(mL('Liab'), money(a.Liab))}${cell(mL('Eq'), money(a.Eq))}
      ${cell(mL('NI'), money(a.NI), cls(a.NI))}${cell(mL('employees'), a.employees != null ? emp(a.employees) : '–')}${cell('ROA', pct(a.roa), cls(a.roa))}
      ${cell(mL('nii_avg_ta'), pct(a.nii_avg_ta))}${cell(T('경비율', 'CIR'), pct(a.cir, 1))}${cell(mL('credit_cost'), pct(a.credit_cost))}
      ${cell(mL('roe_nonbranch'), pct(a.roe_nonbranch, 1), cls(a.roe_nonbranch))}${cell(mL('eq_ta'), pct(a.eq_ta, 1))}${cell(T('본점·그룹 조달', 'HO/group funding'), pct(a.fund_intra, 1))}</div>
  </div>`;
}
function compositionList(cat, year) {
  const byC = COUNTRIES.map(c => {
    const list = DATA.institutions.filter(i => i.country === c && (cat === 'all' || i.category === cat));
    if (!list.length) return '';
    return `<div><b>${cn(c)}</b> ` + list.map(i => {
      const has = i.ratios[year] && isNum(i.ratios[year].TA);
      return `<a href="#/inst/${i.id}" class="${has ? '' : 'muted'}" style="${has ? '' : 'text-decoration:line-through'}">${esc(instName(i))}</a>`;
    }).join(' · ') + '</div>';
  }).join('');
  return `<div class="note small"><b>${T(`${CAT_LABEL[cat][0]} 구성(${CAT_NOTE[cat][0]}).`, `${CAT_LABEL[cat][1]}: ${CAT_NOTE[cat][1]}.`)}</b> ${T(`줄 그은 기관은 ${year}년 자료가 없다.`, `Struck-through institutions have no data for ${year}.`)}${byC}</div>`;
}

// ---------- 변경 이력 ----------
function renderChanges() {
  const ch = (DATA.changes || []).slice().sort((a, b) => (b.date + b.id + b.y).localeCompare(a.date + a.id + a.y));
  const KIND = { restated: ['재작성', 'Restated'], added: ['추가', 'Added'], removed: ['삭제', 'Removed'] };
  let h = `<h1>${T('변경 이력', 'Change log')}</h1>
  <p class="lead">${T(
    '새 공시가 들어와 이미 실린 연도의 값이 바뀌면 여기에 남긴다. 같은 연도가 두 재무제표(당해 열과 다음 해의 전년 열)에 나오면 사이트는 최신 재무제표 값을 쓴다. 첫 줄들은 처음 게시할 때 이미 확인된 재작성이다.',
    'When a new filing changes a figure already shown, the change is recorded here. If a year appears in two filings (current-year column and the next year\'s prior-year column), the site uses the later filing. The first entries are restatements already identified at first publication.')}</p>`;
  if (!ch.length) { $app.innerHTML = h + `<p class="muted">${T('기록 없음.', 'No changes recorded.')}</p>`; return; }
  const dates = [...new Set(ch.map(c => c.date))];
  dates.forEach(d => {
    const rows = ch.filter(c => c.date === d);
    h += `<h2>${esc(d)} <span class="muted small">${T(`${rows.length}건`, `${rows.length} entries`)}</span></h2>
    <div class="card flush"><div class="table-scroll"><table class="sticky"><thead><tr>
      <th>${T('기관', 'Institution')}</th><th>${T('연도', 'Year')}</th><th>${T('구분', 'Type')}</th><th>${T('항목', 'Item')}</th>
      <th class="num">${T('이전 값', 'Old')}</th><th class="num">${T('새 값', 'New')}</th><th class="num">${T('차이', 'Change')}</th>
      <th>${T('출처(이전 → 새)', 'Source (old → new)')}</th><th>${T('비고', 'Note')}</th></tr></thead><tbody>`;
    rows.forEach(c => {
      const i = DATA.institutions.find(x => x.id === c.id);
      const diff = isNum(c.old) && isNum(c.new) ? c.new - c.old : null;
      const note = EN() ? (c.note_en || '') : (c.note || '');
      h += `<tr><td>${i ? `<a href="#/inst/${i.id}">${esc(instName(i))}</a>` : esc(c.id || '')}</td>
        <td>${i ? fyLabel(i, c.y) : c.y}</td><td><span class="badge">${T(...(KIND[c.kind] || [c.kind, c.kind]))}</span></td>
        <td>${esc(EN() ? c.label_en : c.label)}</td>
        <td class="num">${money(c.old, 'k')}</td><td class="num">${money(c.new, 'k')}</td><td class="num${cls(diff)}">${isNum(diff) ? (diff > 0 ? '+' : '') + money(diff, 'k') : '–'}</td>
        <td class="small muted">${esc(c.src_old)}${c.src_old && c.src_new ? ' → ' : ''}${esc(c.src_new)}</td>
        <td class="small" style="white-space:normal;min-width:220px">${esc(note)}</td></tr>`;
    });
    h += '</tbody></table></div></div>';
  });
  h += `<p class="muted small">${T('금액 단위 천 유로(원문 단위).', 'Amounts in EUR thousands (as filed).')}</p>`;
  $app.innerHTML = h;
}

// ---------- 자료·방법 ----------
function renderAbout() {
  const defs = ['nii_avg_ta', 'nfi_share', 'cir', 'credit_cost', 'roa', 'roe', 'eq_ta', 'fund_cust', 'fund_intra', 'Eq', 'Liab', 'employees'];
  const body = EN() ? `
    <p><strong>Source.</strong> 69 annual financial statements (Jahresabschluss: HGB single-entity accounts, notes and management reports) filed by each institution in the German company register, Unternehmensregister.
    They are all filings available for fiscal years 2021–2025. Amounts were extracted from the original balance sheets and income statements and checked: assets = liabilities and equity, sum of P&amp;L items = profit before tax, profit before tax − taxes = net income.</p>
    <p><strong>Restatements.</strong> When a year appears in two filings (current-year column and next year's prior-year column), the later filing's figure is used. Employee numbers come from the current-year filing first.</p>
    <p><strong>Years.</strong> The six Japanese institutions (SMBC, Mizuho, Toyota, Honda, Nomura, Daiwa) have March year-ends and are labelled by the starting year (FY2025 = Apr 2025–Mar 2026).</p>
    <p><strong>Business types.</strong> Banks = subsidiary banks (Hana, Shinhan, Woori, SMBC) + third-country branches (§53 KWG: five Chinese banks and Mizuho). Auto finance = Hyundai Capital Bank Europe, Toyota, Honda. Securities = Nomura, Daiwa.</p>
    <p><strong>Net operating income.</strong> Because lease income and expenses are presented differently across formats, it is derived backwards: profit before tax − admin. expenses − credit and valuation results − §340g allocation − loss absorption.</p>
    <p><strong>Limitations.</strong> Branch equity and funding costs are internal figures set by the head office. SMBC Bank EU AG includes branches in several EU countries. Under HGB, §340f hidden reserves may be netted against loan-loss items, so reported credit costs can differ from actual losses.</p>` : `
    <p><strong>출처.</strong> 독일 상업등기부 Unternehmensregister에 공시된 각 기관의 Jahresabschluss(HGB 개별재무제표, 주석, 경영보고서) 69건.
    2021~2025회계연도 가운데 공시된 것 전부다. 금액은 원문 대차대조표·손익계산서에서 추출해 자산=부채·자본, 손익 합계=세전이익, 세전이익−세금=순이익을 검산했다.</p>
    <p><strong>재작성.</strong> 같은 연도가 두 재무제표(당해 열과 다음 해 전년 열)에 나오면 최신 재무제표 값을 쓴다. 직원 수는 당해 재무제표 값을 먼저 쓴다.</p>
    <p><strong>연도.</strong> 일본계 6곳(SMBC, 미즈호, 도요타, 혼다, 노무라, 다이와)은 3월 결산이고 시작 연도로 표기한다(FY2025 = 2025.4~2026.3).</p>
    <p><strong>업종 구분.</strong> 상업은행 = 현지법인 은행(하나·신한·우리·SMBC) + 제3국 지점(§53 KWG: 중국계 5곳, 미즈호). 자동차금융 = 현대캐피탈뱅크유럽·도요타·혼다. 증권 = 노무라·다이와.</p>
    <p><strong>순영업수익.</strong> 리스 손익이 양식마다 다르게 섞여 있어 세전이익 − 관리비 − 대손·평가손익 − §340g 전입 − 손실 인수로 거꾸로 계산했다.</p>
    <p><strong>한계.</strong> 지점의 자본·조달금리는 본점이 정하는 내부 값이다. SMBC Bank EU AG는 EU 여러 나라 지점을 포함한다. HGB는 §340f 비공개 준비금을 대손 항목과 상계할 수 있어 공시 대손비용이 실제 손실과 다를 수 있다.</p>`;
  $app.innerHTML = `<h1>${T('자료와 방법', 'Data and methods')}</h1>
  <div class="card prose">${body}</div>
  <h2>${T('지표 정의', 'Definitions')}</h2>
  <div class="card"><dl class="defs">${defs.map(k => `<dt>${mL(k)}</dt><dd>${esc(mD(k))}</dd>`).join('')}</dl></div>
  <p class="muted small">${T('자료 생성일', 'Data generated')} ${esc(DATA.generated)}.</p>`;
}

// ---------- 머리글·바닥글 ----------
function applyChrome() {
  document.documentElement.lang = LANG;
  document.title = T('독일 소재 한·중·일 금융기관', 'Asian Banks in Germany');
  document.querySelectorAll('[data-ko]').forEach(el => { el.innerHTML = EN() ? el.dataset.en : el.dataset.ko; });
  document.querySelectorAll('#lang button').forEach(b => b.classList.toggle('on', b.dataset.v === LANG));
  if (DATA) document.getElementById('gen').textContent = T(`자료 생성 ${DATA.generated}.`, `Data generated ${DATA.generated}.`);
}
document.getElementById('lang').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || b.dataset.v === LANG) return;
  LANG = b.dataset.v;
  try { localStorage.setItem('lang', LANG); } catch (err) {}
  setFormats(); applyChrome();
  const y = window.scrollY; route(); window.scrollTo(0, y);
});

// ---------- 라우터 ----------
function route() {
  const h = location.hash;
  if (h && !h.startsWith('#/')) return; // 각주 앵커 등
  const parts = h.replace(/^#\/?/, '').split('/');
  const page = parts[0] || 'home';
  CHARTS = [];
  document.querySelectorAll('nav.main a').forEach(a => a.classList.toggle('on', a.dataset.nav === (page === 'inst' ? 'home' : page)));
  if (page === 'inst') renderInst(parts[1]);
  else if (page === 'compare') renderCompare();
  else if (page === 'about') renderAbout();
  else if (page === 'changes') renderChanges();
  else renderHome();
  window.scrollTo(0, 0);
}

document.getElementById('theme').addEventListener('click', () => {
  const root = document.documentElement;
  const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  root.dataset.theme = dark ? 'light' : 'dark';
  try { localStorage.setItem('theme', root.dataset.theme); } catch (e) {}
});

applyChrome();
fetch('data.json?v=7').then(r => r.json()).then(d => {
  DATA = d;
  applyChrome();
  window.addEventListener('hashchange', route);
  route();
}).catch(e => { $app.innerHTML = `<p>${T('자료를 불러오지 못했다', 'Could not load data')}: ${esc(e.message)}</p>`; });
