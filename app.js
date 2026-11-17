'use strict';

let DATA = null;
const $app = document.getElementById('app');

const COUNTRIES = ['한국', '중국', '일본'];
const CCOLOR = { '한국': 'var(--kr)', '중국': 'var(--cn)', '일본': 'var(--jp)', '일본(SMBC 제외)': 'var(--jp)', '전체': 'var(--all)' };
const FORM_LABEL = { subsidiary: '현지법인(은행)', branch: '지점(§53 KWG)', captive: '자동차금융', securities: '증권' };
const CAT_LABEL = { bank: '상업은행', captive: '자동차금융(캐피탈)', securities: '증권', all: '전체' };
const CAT_NOTE = { bank: '현지법인 은행 + 제3국 지점', captive: '자동차 금융 전문은행', securities: '증권회사', all: '15개 기관 전부' };

// ---------- 형식 ----------
const nf1 = new Intl.NumberFormat('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const nf0 = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 });
const nfE = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 1 });
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
  return inst.fye === 3 ? `FY${y} (${y}.4–${y + 1}.3)` : `${y}`;
}

// 지표 정의: key, 라벨, 형식, 설명
const METRICS = {
  TA: { label: '총자산', fmt: v => money(v), unit: '백만 유로', amount: true },
  Liab: { label: '부채', fmt: v => money(v), unit: '백만 유로', amount: true, desc: '총자산 − 자본' },
  Eq: { label: '자본', fmt: v => money(v), unit: '백만 유로', amount: true, desc: '자기자본 + §340g 기금. 지점은 본점 출연자본' },
  NI: { label: '당기순이익', fmt: v => money(v), unit: '백만 유로', amount: true },
  Pretax: { label: '세전이익', fmt: v => money(v), unit: '백만 유로', amount: true },
  NII: { label: '순이자이익', fmt: v => money(v), unit: '백만 유로', amount: true },
  employees: { label: '직원 수', fmt: emp, unit: '명', desc: '연평균(없으면 연말)' },
  nii_avg_ta: { label: '순이자이익/평균자산', fmt: v => pct(v), desc: '순이자이익 ÷ 평균 총자산' },
  nfi_share: { label: '수수료이익 비중', fmt: v => pct(v, 1), desc: '순수수료이익 ÷ 순영업수익' },
  cir: { label: '경비율(CIR)', fmt: v => pct(v, 1), desc: '(관리비 + 감가상각) ÷ 순영업수익' },
  credit_cost: { label: '대손비용률', fmt: v => pct(v), desc: '순대손비용 ÷ 평균(고객대출 + 리스자산)' },
  roa: { label: 'ROA', fmt: v => pct(v), desc: '당기순이익 ÷ 평균 총자산' },
  roa_pretax: { label: '세전 ROA', fmt: v => pct(v), desc: '세전이익 ÷ 평균 총자산' },
  roe: { label: 'ROE', fmt: v => pct(v, 1), desc: '당기순이익 ÷ 평균 자본. 지점은 표시하지 않음' },
  roe_nonbranch: { label: 'ROE(법인만)', fmt: v => pct(v, 1), desc: '지점을 뺀 법인의 당기순이익 ÷ 평균 자본' },
  eq_ta: { label: '자본/총자산', fmt: v => pct(v, 1), desc: '연말 자본 ÷ 총자산' },
  fund_cust: { label: '고객예금 조달 비중', fmt: v => pct(v, 1), desc: '제3자 고객예금 ÷ 부채·자본 총계' },
  fund_bank: { label: '은행 차입 비중', fmt: v => pct(v, 1), desc: '제3자 은행 차입 ÷ 부채·자본 총계' },
  fund_intra: { label: '본점·그룹 조달 비중', fmt: v => pct(v, 1), desc: '본점 계정 + 계열사 앞 부채 ÷ 부채·자본 총계' },
  intra_assets: { label: '본점·그룹 앞 자산 비중', fmt: v => pct(v, 1) },
  ltc_share: { label: '고객대출/총자산', fmt: v => pct(v, 1) },
  sec_share: { label: '유가증권/총자산', fmt: v => pct(v, 1) },
  lease_share: { label: '리스자산/총자산', fmt: v => pct(v, 1) },
  ta_per_emp: { label: '1인당 총자산', fmt: v => money(v), unit: '백만 유로' },
};

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
function barChart(host, { labels, values, fmt, unit }) {
  const W = 520, H = 220, m = { l: 56, r: 12, t: 22, b: 26 };
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
    if (!isNum(v)) { s += `<text x="${cx}" y="${y(0) - 6}" text-anchor="middle">미공시</text>`; return; }
    s += `<path d="${barPath(cx - bw / 2, y(0), y(v), bw, 4)}" fill="${v < 0 ? 'var(--bar-neg)' : 'var(--bar)'}"/>`;
    if (i === last) s += `<text class="vlbl" x="${cx}" y="${v < 0 ? y(v) + 14 : y(v) - 6}" text-anchor="middle">${fmt(v)}</text>`;
    s += `<rect x="${m.l + band * i}" y="${m.t}" width="${band}" height="${H - m.t - m.b}" fill="transparent" data-i="${i}"/>`;
  });
  s += `<text x="${m.l - 8}" y="10" text-anchor="end">${esc(unit)}</text></svg>`;
  host.innerHTML = s;
  const tip = tipEl(host);
  host.querySelectorAll('rect[data-i]').forEach(r => {
    r.addEventListener('mousemove', e => {
      const i = +r.dataset.i, b = host.getBoundingClientRect();
      tip.innerHTML = `<b>${esc(labels[i])}</b>${fmt(values[i])}`;
      placeTip(tip, host, e.clientX - b.left, e.clientY - b.top);
    });
    r.addEventListener('mouseleave', () => { tip.style.display = 'none'; });
  });
}

// 선(국가별 다계열) + 십자선 툴팁
function lineChart(host, { years, series, fmt, tickFmt }) {
  const W = 760, H = 300, m = { l: 64, r: 120, t: 16, b: 28 };
  const all = []; series.forEach(se => years.forEach(y => { if (isNum(se.v[y])) all.push(se.v[y]); }));
  if (!all.length) { host.innerHTML = '<p class="muted small">이 조합에는 자료가 없다.</p>'; return; }
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
  ends.forEach(e => { s += `<text class="lbl" x="${W - m.r + 8}" y="${e.yy + 4}">${esc(e.name)}</text>`; });
  s += `<line class="xh" x1="0" x2="0" y1="${m.t}" y2="${H - m.b}" stroke="var(--text-3)" stroke-width="1" style="display:none"/>`;
  s += `<rect class="hit" x="${m.l - 20}" y="${m.t}" width="${W - m.l - m.r + 40}" height="${H - m.t - m.b}" fill="transparent"/>`;
  s += '</svg>';
  host.innerHTML = s;
  const svg = host.querySelector('svg'), xh = svg.querySelector('.xh'), tip = tipEl(host);
  svg.querySelector('.hit').addEventListener('mousemove', e => {
    const b = svg.getBoundingClientRect(), sx = (e.clientX - b.left) * W / b.width;
    let i = Math.round((sx - m.l) / ((W - m.l - m.r) / Math.max(1, years.length - 1)));
    i = Math.max(0, Math.min(years.length - 1, i));
    xh.setAttribute('x1', x(i)); xh.setAttribute('x2', x(i)); xh.style.display = '';
    const yr = years[i];
    tip.innerHTML = `<b>${yr}</b>` + series.map(se =>
      `<div class="row"><span><i style="background:${se.color}"></i>${esc(se.name)}</span><span>${fmt(se.v[yr])}${se.n && se.n[yr] ? ` <span class="muted">(${se.n[yr]}곳)</span>` : ''}</span></div>`).join('');
    const hb = host.getBoundingClientRect();
    placeTip(tip, host, x(i) * b.width / W + (b.left - hb.left), e.clientY - hb.top);
  });
  svg.querySelector('.hit').addEventListener('mouseleave', () => { xh.style.display = 'none'; tip.style.display = 'none'; });
}

// ---------- 기관 목록 ----------
const listState = { cat: 'all', sort: { key: 'TA', dir: -1 } };
function latestRow(inst) { return inst.ratios[String(inst.latest)] || {}; }

function renderHome() {
  const cats = [['all', '전체'], ['bank', '상업은행'], ['captive', '자동차금융'], ['securities', '증권']];
  let h = `<h1>독일에 진출한 한·중·일 금융기관</h1>
  <p class="lead">독일 상업등기부(Unternehmensregister)에 공시된 HGB 개별재무제표로 정리한 15개 기관의 최근 실적이다.
  기관 이름을 누르면 연도별 재무제표와 지표를 볼 수 있다. 금액 단위는 백만 유로.</p>
  <div class="controls"><label class="ctl">업종</label>${seg('cat', cats, listState.cat)}</div>`;
  const cols = [
    ['inst', '기관', false], ['form', '성격', false], ['latest', '기준연도', false],
    ['TA', '총자산', true], ['Liab', '부채', true], ['Eq', '자본', true], ['NI', '당기순이익', true],
    ['roa', 'ROA', true], ['cir', '경비율', true], ['employees', '직원 수', true],
  ];
  COUNTRIES.forEach(c => {
    let list = DATA.institutions.filter(i => i.country === c && (listState.cat === 'all' || i.category === listState.cat));
    if (!list.length) return;
    const { key, dir } = listState.sort;
    const val = i => key === 'inst' ? i.ko : key === 'form' ? i.form : key === 'latest' ? i.latest : latestRow(i)[key];
    list = list.slice().sort((a, b) => {
      const va = val(a), vb = val(b);
      if (va == null) return 1; if (vb == null) return -1;
      return (va > vb ? 1 : va < vb ? -1 : 0) * dir;
    });
    h += `<div class="country-head"><span class="dot" style="background:${CCOLOR[c]}"></span><h2>${c}</h2><span class="muted small">${list.length}곳</span></div>
    <div class="card flush"><div class="table-scroll"><table><thead><tr>` +
      cols.map(([k, l, num]) => `<th class="sortable${num ? ' num' : ''}" data-k="${k}">${l}${key === k ? `<span class="arrow">${dir > 0 ? '▲' : '▼'}</span>` : ''}</th>`).join('') +
      `</tr></thead><tbody>`;
    list.forEach(i => {
      const r = latestRow(i);
      h += `<tr><td class="inst"><a href="#/inst/${i.id}">${esc(i.ko)}</a><span class="sub">${esc(i.name)}</span></td>
        <td><span class="badge">${FORM_LABEL[i.form]}</span></td>
        <td title="${esc(fyLong(i, i.latest))}">${fyLabel(i, i.latest)}${i.fye === 3 ? ' <span class="muted small">3월</span>' : ''}</td>
        <td class="num">${money(r.TA)}</td><td class="num">${money(r.Liab)}</td><td class="num">${money(r.Eq)}</td>
        <td class="num${cls(r.NI)}">${money(r.NI)}</td><td class="num${cls(r.roa)}">${pct(r.roa)}</td>
        <td class="num">${pct(r.cir, 1)}</td><td class="num">${emp(r.employees)}</td></tr>`;
    });
    h += `</tbody></table></div></div>`;
  });
  h += `<div class="note"><b>읽는 법.</b> 기준연도는 기관마다 공시된 가장 최근 회계연도다. 일본계 6곳은 3월 결산(FY2025 = 2025.4~2026.3)이다.
  우리은행·ICBC·도요타·혼다·다이와는 2025분이 아직 공시되지 않았고(공시 기한은 결산 후 12개월), 미즈호 뒤셀도르프 지점은 FY2024에 청산했다.
  지점의 자본은 본점이 낸 출연자본이라 법인 자본과 성격이 다르다. 경비율은 (관리비+감가상각)÷순영업수익, ROA는 평균 총자산 기준이다.</div>`;
  $app.innerHTML = h;
  onSeg('cat', v => { listState.cat = v; renderHome(); });
  $app.querySelectorAll('th.sortable').forEach(th => th.addEventListener('click', () => {
    const k = th.dataset.k;
    listState.sort = listState.sort.key === k ? { key: k, dir: -listState.sort.dir } : { key: k, dir: ['inst', 'form', 'latest'].includes(k) ? 1 : -1 };
    renderHome();
  }));
}

// ---------- 기관 상세 ----------
const detState = { tab: 'assets', unit: 'm' };
function renderInst(id) {
  const i = DATA.institutions.find(x => x.id === id);
  if (!i) { $app.innerHTML = '<p>기관을 찾을 수 없다. <a href="#/">목록으로</a></p>'; return; }
  const ys = Object.keys(i.ratios).map(Number).sort();
  const r = latestRow(i);
  let h = `<a class="back" href="#/">← 기관 목록</a>
  <h1>${esc(i.ko)}</h1>
  <p class="muted" style="margin:0 0 8px">${esc(i.name)}</p>
  <p style="margin:0 0 6px"><span class="badge">${i.country}</span> <span class="badge">${FORM_LABEL[i.form]}</span> <span class="badge">${i.fye}월 결산</span></p>
  <p class="lead small" style="margin-top:8px">${esc(i.desc)}</p>
  <h2>${fyLong(i, i.latest)} 주요 수치</h2>
  <div class="kpis">
    ${kpi('총자산', money(r.TA), '백만 유로')}${kpi('부채', money(r.Liab), '백만 유로')}
    ${kpi(i.form === 'branch' ? '자본(출연자본)' : '자본', money(r.Eq), '백만 유로')}
    ${kpi('당기순이익', money(r.NI), '백만 유로', r.NI)}${kpi('ROA', pct(r.roa), '', r.roa)}
    ${kpi('경비율', pct(r.cir, 1), '')}${kpi('직원 수', emp(r.employees), r.emp_basis === 'year_end' ? '명(연말)' : '명')}
  </div>
  <div class="grid2">
    <div class="card"><h3>총자산</h3><div class="chart" id="c-ta"></div></div>
    <div class="card"><h3>당기순이익</h3><div class="chart" id="c-ni"></div></div>
  </div>
  <h2>연도별 지표</h2>
  <div class="card flush"><div class="table-scroll"><table><thead><tr><th>지표</th>${ys.map(y => `<th class="num">${fyLabel(i, y)}</th>`).join('')}</tr></thead><tbody>`;
  const rows = ['TA', 'Liab', 'Eq', 'NII', 'Pretax', 'NI', 'nii_avg_ta', 'nfi_share', 'cir', 'credit_cost', 'roa',
    i.form === 'branch' ? null : 'roe', 'eq_ta', 'fund_cust', 'fund_intra', 'intra_assets', 'ltc_share',
    i.category === 'captive' ? 'lease_share' : 'sec_share', 'employees', 'ta_per_emp'].filter(Boolean);
  rows.forEach(k => {
    const M = METRICS[k];
    h += `<tr><td title="${esc(M.desc || '')}">${M.label}${M.unit ? ` <span class="muted small">${M.unit}</span>` : ''}</td>` +
      ys.map(y => { const v = (i.ratios[y] || {})[k]; return `<td class="num${cls(v)}">${M.fmt(v)}</td>`; }).join('') + '</tr>';
  });
  h += `</tbody></table></div></div>
  <p class="muted small">비율은 기초·기말 평균 잔액 기준(2021년은 2020년 말 잔액 사용). ${i.form === 'branch' ? '지점 ROE는 출연자본 기준이라 표시하지 않았다. ' : ''}${i.fye === 3 ? '3월 결산: FY2024 = 2024.4~2025.3.' : ''}</p>
  <h2>재무제표</h2>
  <div class="controls">${seg('unit', [['m', '백만 유로'], ['k', '천 유로']], detState.unit)}
    <span class="muted small">비용은 음수. 셀에 마우스를 올리면 원문 파일과 쪽이 나온다.</span></div>
  <div class="card flush">
    <div class="tabs" id="stabs">${[['assets', '대차대조표 · 자산'], ['liab', '대차대조표 · 부채와 자본'], ['pl', '손익계산서']].map(([k, l]) =>
      `<button type="button" data-v="${k}" class="${detState.tab === k ? 'on' : ''}">${l}</button>`).join('')}</div>
    <div class="table-scroll" id="stm"></div>
  </div>`;
  if (i.text.length) {
    h += `<h2>해설</h2><div class="card prose">${i.text.map(p => `<p>${p}</p>`).join('')}
    <details><summary class="small muted">출처 각주 ${Object.keys(i.notes).length}개</summary><ol class="fns">` +
      Object.entries(i.notes).sort((a, b) => a[0] - b[0]).map(([n, t]) => `<li id="fn-${i.id}-${n}" value="${n}">${t}</li>`).join('') +
      `</ol></details></div>`;
  }
  $app.innerHTML = h;
  barChart(document.getElementById('c-ta'), { labels: ys.map(y => fyLabel(i, y)), values: ys.map(y => i.ratios[y].TA), fmt: v => money(v) + ' 백만 유로', unit: '백만 유로' });
  barChart(document.getElementById('c-ni'), { labels: ys.map(y => fyLabel(i, y)), values: ys.map(y => i.ratios[y].NI), fmt: v => money(v) + ' 백만 유로', unit: '백만 유로' });
  drawStatement(i);
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
  let h = `<table><thead><tr><th>항목</th>${ys.map(y => `<th class="num">${fyLabel(i, y)}</th>`).join('')}</tr></thead><tbody>`;
  rows.forEach(r => {
    const c = r.lvl === -1 ? (['TA', 'TL', 'NI'].includes(r.key) ? 'total' : 'bold') : r.lvl > 0 ? `lvl${r.lvl}` : '';
    h += `<tr class="${c}"><td class="label">${esc(r.label)}</td>` + ys.map(y => {
      const v = r.v[y], src = r.src[y] || '';
      return `<td class="num${cls(v)}" title="${esc(src)}">${money(v, detState.unit)}</td>`;
    }).join('') + '</tr>';
  });
  h += '</tbody></table>';
  document.getElementById('stm').innerHTML = h;
}

// ---------- 국가별 비교 ----------
const cmpState = { cat: 'bank', year: 2024, metric: 'TA' };
const CMP_ROWS = ['한국', '중국', '일본', '일본(SMBC 제외)', '전체'];
function agg(country, cat, year) {
  return DATA.aggregates.find(a => a.country === country && a.category === cat && a.year === year);
}
function renderCompare() {
  const years = [...new Set(DATA.aggregates.map(a => a.year))].sort();
  const cats = [['bank', '상업은행'], ['captive', '자동차금융'], ['securities', '증권'], ['all', '전체']];
  const metricOpts = ['TA', 'Liab', 'Eq', 'NI', 'NII', 'employees', 'nii_avg_ta', 'nfi_share', 'cir', 'credit_cost', 'roa', 'roa_pretax', 'roe_nonbranch', 'eq_ta', 'fund_cust', 'fund_intra', 'ta_per_emp'];
  const { cat, year, metric } = cmpState;
  let h = `<h1>국가별 비교</h1>
  <p class="lead">국가·업종별로 기관 수치를 합산했다. 비율은 기관 비율의 평균이 아니라 합계끼리 나눈 값(규모 가중)이다.
  상업은행은 현지법인 은행과 제3국 지점을 합친 것이다.</p>
  <div class="controls">
    <label class="ctl">업종</label>${seg('ccat', cats, cat)}
    <label class="ctl">연도 <select id="cyear">${years.map(y => `<option ${y === year ? 'selected' : ''}>${y}</option>`).join('')}</select></label>
  </div>
  <div class="card flush"><div class="table-scroll"><table><thead><tr>
    <th>국가</th><th class="num">기관 수</th><th class="num">총자산</th><th class="num">부채</th><th class="num">자본</th><th class="num">당기순이익</th>
    <th class="num">직원 수</th><th class="num" title="${METRICS.nii_avg_ta.desc}">순이자이익/평균자산</th><th class="num" title="${METRICS.cir.desc}">경비율</th>
    <th class="num" title="${METRICS.credit_cost.desc}">대손비용률</th><th class="num">ROA</th><th class="num" title="${METRICS.roe_nonbranch.desc}">ROE(법인만)</th>
    <th class="num">자본/총자산</th><th class="num">고객예금 조달</th><th class="num">본점·그룹 조달</th>
  </tr></thead><tbody>`;
  let shown = 0;
  CMP_ROWS.forEach(c => {
    const a = agg(c, cat, year);
    if (!a) return;
    if (c === '일본(SMBC 제외)' && !(agg('일본', cat, year) || {}).inst?.includes('SMBC Bank EU AG')) return;
    shown++;
    const bold = c === '전체' ? ' class="total"' : '';
    h += `<tr${bold}><td title="${esc(a.inst.join(', '))}"><span class="dot" style="background:${CCOLOR[c]};margin-right:6px"></span>${c}</td>
      <td class="num">${a.n}</td><td class="num">${money(a.TA)}</td><td class="num">${money(a.Liab)}</td><td class="num">${money(a.Eq)}</td>
      <td class="num${cls(a.NI)}">${money(a.NI)}</td><td class="num">${a.employees != null ? emp(a.employees) : '–'}</td>
      <td class="num">${pct(a.nii_avg_ta)}</td><td class="num">${pct(a.cir, 1)}</td><td class="num">${pct(a.credit_cost)}</td>
      <td class="num${cls(a.roa)}">${pct(a.roa)}</td><td class="num${cls(a.roe_nonbranch)}">${pct(a.roe_nonbranch, 1)}</td>
      <td class="num">${pct(a.eq_ta, 1)}</td><td class="num">${pct(a.fund_cust, 1)}</td><td class="num">${pct(a.fund_intra, 1)}</td></tr>`;
  });
  if (!shown) h += `<tr><td colspan="15" class="muted">이 연도·업종에는 자료가 없다.</td></tr>`;
  h += `</tbody></table></div></div>
  <p class="muted small">금액 단위 백만 유로. 국가 이름에 마우스를 올리면 합산에 들어간 기관이 나온다.
  ${cat !== 'bank' && cat !== 'all' ? '' : 'ROE(법인만)은 지점을 뺀 값이다. '}${year === 2025 ? '2025년은 일부 기관이 아직 공시하지 않아 기관 수가 적다. ' : ''}</p>
  ${compositionList(cat, year)}
  <h2>연도별 추이</h2>
  <div class="controls"><label class="ctl">지표 <select id="cmetric">${metricOpts.map(k => `<option value="${k}" ${k === metric ? 'selected' : ''}>${METRICS[k].label}${METRICS[k].unit ? ` (${METRICS[k].unit})` : ''}</option>`).join('')}</select></label>
  <span class="muted small">${esc(METRICS[metric].desc || '')}</span></div>
  <div class="card"><div class="legend" id="lg"></div><div class="chart" id="cline"></div></div>
  <div class="card flush"><div class="table-scroll" id="ctab"></div></div>
  <div class="note"><b>해석할 때.</b> 일본 상업은행 합계는 SMBC Bank EU AG(EU 허브, EU 여러 나라 지점 포함)가 대부분을 차지해 "일본(SMBC 제외)"을 따로 보였다.
  한국 자동차금융은 현대캐피탈뱅크유럽 1곳으로 Santander Consumer Bank가 51%를 가진 합작법인이다.
  일본계는 3월 결산이라 같은 연도라도 12월 결산 기관보다 3개월 늦게 끝난다. 2025년은 일부 기관 미공시로 구성이 다르다.
  중국계는 모두 지점이어서 자본·ROE·조달 구조가 본점 내부 가격에 좌우된다.</div>`;
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
    if (c === '일본(SMBC 제외)' && !years.some(y => (agg('일본', cat, y) || {}).inst?.includes('SMBC Bank EU AG'))) return;
    series.push({ name: c, color: CCOLOR[c], dash: c === '일본(SMBC 제외)', v, n });
  });
  document.getElementById('lg').innerHTML = series.map(s =>
    `<span><i class="${s.dash ? 'dash' : ''}" style="background:${s.color};border-color:${s.color}"></i>${s.name}</span>`).join('');
  const tickFmt = M.amount || metric === 'ta_per_emp' ? t => minus(nf0.format(t / 1000)) : metric === 'employees' ? t => nf0.format(t) : t => minus((t * 100).toFixed(Math.abs(t) < 0.05 ? 2 : 1)) + '%';
  lineChart(document.getElementById('cline'), { years, series, fmt: M.fmt, tickFmt });
  let t = `<table><thead><tr><th>${M.label}${M.unit ? ` <span class="muted small">${M.unit}</span>` : ''}</th>${years.map(y => `<th class="num">${y}</th>`).join('')}</tr></thead><tbody>`;
  CMP_ROWS.forEach(c => {
    if (!years.some(y => agg(c, cat, y))) return;
    if (c === '일본(SMBC 제외)' && !series.find(s => s.name === c)) return;
    t += `<tr${c === '전체' ? ' class="total"' : ''}><td>${c}</td>` + years.map(y => {
      const a = agg(c, cat, y); const v = a ? a[metric] : null;
      return `<td class="num${cls(v)}" title="${a ? esc(a.n + '곳: ' + a.inst.join(', ')) : ''}">${M.fmt(v)}${a ? ` <span class="muted small">${a.n}</span>` : ''}</td>`;
    }).join('') + '</tr>';
  });
  t += '</tbody></table>';
  document.getElementById('ctab').innerHTML = t;
}
function compositionList(cat, year) {
  const byC = COUNTRIES.map(c => {
    const list = DATA.institutions.filter(i => i.country === c && (cat === 'all' || i.category === cat));
    if (!list.length) return '';
    return `<div><b>${c}</b> ` + list.map(i => {
      const has = i.ratios[year] && isNum(i.ratios[year].TA);
      return `<a href="#/inst/${i.id}" class="${has ? '' : 'muted'}" style="${has ? '' : 'text-decoration:line-through'}">${esc(i.ko)}</a>`;
    }).join(' · ') + '</div>';
  }).join('');
  return `<div class="note small"><b>${CAT_LABEL[cat]} 구성(${CAT_NOTE[cat]}).</b> 줄 그은 기관은 ${year}년 자료가 없다.${byC}</div>`;
}

// ---------- 자료·방법 ----------
function renderAbout() {
  const defs = ['nii_avg_ta', 'nfi_share', 'cir', 'credit_cost', 'roa', 'roe', 'eq_ta', 'fund_cust', 'fund_intra', 'Eq', 'Liab', 'employees'];
  $app.innerHTML = `<h1>자료와 방법</h1>
  <div class="card prose">
    <p><strong>출처.</strong> 독일 상업등기부 Unternehmensregister에 공시된 각 기관의 Jahresabschluss(HGB 개별재무제표, 주석, 경영보고서) 69건.
    2021~2025회계연도 가운데 공시된 것 전부다. 금액은 원문 대차대조표·손익계산서에서 추출해 자산=부채·자본, 손익 합계=세전이익, 세전이익−세금=순이익을 검산했다.</p>
    <p><strong>재작성.</strong> 같은 연도가 두 재무제표(당해 열과 다음 해 전년 열)에 나오면 최신 재무제표 값을 쓴다. 직원 수는 당해 재무제표 값을 먼저 쓴다.</p>
    <p><strong>연도.</strong> 일본계 6곳(SMBC, 미즈호, 도요타, 혼다, 노무라, 다이와)은 3월 결산이고 시작 연도로 표기한다(FY2025 = 2025.4~2026.3).</p>
    <p><strong>업종 구분.</strong> 상업은행 = 현지법인 은행(하나·신한·우리·SMBC) + 제3국 지점(§53 KWG: 중국계 5곳, 미즈호). 자동차금융 = 현대캐피탈뱅크유럽·도요타·혼다. 증권 = 노무라·다이와.</p>
    <p><strong>순영업수익.</strong> 리스 손익이 양식마다 다르게 섞여 있어 세전이익 − 관리비 − 대손·평가손익 − §340g 전입 − 손실 인수로 거꾸로 계산했다.</p>
    <p><strong>한계.</strong> 지점의 자본·조달금리는 본점이 정하는 내부 값이다. SMBC Bank EU AG는 EU 여러 나라 지점을 포함한다. HGB는 §340f 비공개 준비금을 대손 항목과 상계할 수 있어 공시 대손비용이 실제 손실과 다를 수 있다.</p>
  </div>
  <h2>지표 정의</h2>
  <div class="card"><dl class="defs">${defs.map(k => `<dt>${METRICS[k].label}</dt><dd>${esc(METRICS[k].desc || '')}</dd>`).join('')}</dl></div>
  <p class="muted small">자료 생성일 ${esc(DATA.generated)}.</p>`;
}

// ---------- 라우터 ----------
function route() {
  const h = location.hash;
  if (h && !h.startsWith('#/')) return; // 각주 앵커 등
  const parts = h.replace(/^#\/?/, '').split('/');
  const page = parts[0] || 'home';
  document.querySelectorAll('nav.main a').forEach(a => a.classList.toggle('on', a.dataset.nav === (page === 'inst' ? 'home' : page)));
  if (page === 'inst') renderInst(parts[1]);
  else if (page === 'compare') renderCompare();
  else if (page === 'about') renderAbout();
  else renderHome();
  window.scrollTo(0, 0);
}

document.getElementById('theme').addEventListener('click', () => {
  const root = document.documentElement;
  const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  root.dataset.theme = dark ? 'light' : 'dark';
  try { localStorage.setItem('theme', root.dataset.theme); } catch (e) {}
});

fetch('data.json').then(r => r.json()).then(d => {
  DATA = d;
  document.getElementById('gen').textContent = `자료 생성 ${d.generated}.`;
  window.addEventListener('hashchange', route);
  route();
}).catch(e => { $app.innerHTML = `<p>자료를 불러오지 못했다: ${esc(e.message)}</p>`; });
