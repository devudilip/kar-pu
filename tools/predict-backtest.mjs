#!/usr/bin/env node
// Walk-forward backtest: predict year Y's KCET paper (per subject) from papers < Y, score against the real paper.
// Usage: node tools/predict-backtest.mjs [--years 2010-2020] [--subjects physics,chemistry,maths]
//        [--decay 0.8] [--window 6] [--multi 1.5] [--exact 0.6] [--tune] [--quiet] [--out research/prediction/results]
import fs from 'node:fs';
const root = new URL('../', import.meta.url).pathname;
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > -1 ? process.argv[i + 1] : d; };
const flag = (k) => process.argv.includes('--' + k);
const [Y0, Y1] = (arg('years', '2010-2020')).split('-').map(Number);
const SUBJECTS = arg('subjects', 'physics,chemistry,maths').split(',');
const P = { decay: +arg('decay', 0.8), window: +arg('window', 6), multi: +arg('multi', 1.5), exact: +arg('exact', 0.5), method: arg('method', 'freq'), list: +arg('list', 60) };
const OUT = arg('out', 'research/prediction/results');

// ---------- data ----------
export function loadSubject(s) {
  const tplFile = `${root}research/prediction/templates/${s}.json`, labFile = `${root}research/prediction/labels/${s}.jsonl`;
  const templates = fs.existsSync(tplFile) ? JSON.parse(fs.readFileSync(tplFile, 'utf8')).templates : [];
  const tmap = new Map(templates.map((t) => [t.id, t]));
  const labels = new Map();
  if (fs.existsSync(labFile)) for (const l of fs.readFileSync(labFile, 'utf8').split('\n')) if (l.trim()) { const o = JSON.parse(l); labels.set(o.id, o.template); }
  const years = {};
  for (let y = 2009; y <= 2026; y++) {
    const f = `${root}data/pyq/${y}-${s}.json`; if (!fs.existsSync(f)) continue;
    const d = JSON.parse(fs.readFileSync(f, 'utf8'));
    years[y] = d.questions.map((q) => ({ id: `${y}-${s}-${q.n}`, year: y, n: q.n, chapter: q.chapter, q: q.q, options: q.options || [], template: labels.get(`${y}-${s}-${q.n}`) || null, tokens: tokens(q.q + ' ' + (q.options || []).join(' ')) }));
  }
  return { subject: s, templates, tmap, years };
}
export function tokens(text) {
  return new Set(String(text).toLowerCase().replace(/\\[a-z]+/g, ' ').replace(/[^a-z0-9+\-=^/]+/g, ' ').split(' ').filter((w) => w.length > 1));
}
export function jaccard(a, b) { let i = 0; for (const x of a) if (b.has(x)) i++; return i / (a.size + b.size - i || 1); }

// ---------- hazard table (walk-forward) ----------
const bC = (c) => (c >= 4 ? '4+' : String(c)), bG = (g) => (g >= 5 ? '5+' : String(g));
export function hazardTable(data, Y) {
  const tab = {};
  for (let y = 2011; y < Y; y++) {
    if (!data.years[y]) continue;
    const cnt = {}, last = {};
    for (const yy in data.years) { if (+yy >= y) continue; for (const q of data.years[yy]) if (q.template) { cnt[q.template] = (cnt[q.template] || 0) + 1; last[q.template] = Math.max(last[q.template] || 0, +yy); } }
    const now = new Set(data.years[y].map((q) => q.template));
    for (const t in cnt) { const k = bC(cnt[t]) + '|' + bG(y - last[t]); tab[k] = tab[k] || { n: 0, hit: 0 }; tab[k].n++; if (now.has(t)) tab[k].hit++; }
  }
  // smoothed probability with a weak prior of 20%
  const p = {}; for (const k in tab) p[k] = (tab[k].hit + 1) / (tab[k].n + 5);
  return (c, g) => p[bC(c) + '|' + bG(g)] ?? 0.2;
}

// ---------- prediction ----------
export function predict(data, Y, p = P) {
  const prior = Object.keys(data.years).map(Number).filter((y) => y < Y && y >= Y - p.window).sort();
  if (!prior.length) return null;
  const w = (y) => Math.pow(p.decay, Y - 1 - y);
  const wsum = prior.reduce((a, y) => a + w(y), 0);
  // chapter quota: recency-weighted average count per year, scaled to 60
  const chCount = {}; const tScore = {}; const tLast = {}; const tCountYears = {};
  for (const y of prior) for (const q of data.years[y]) {
    chCount[q.chapter] = (chCount[q.chapter] || 0) + w(y);
    if (!q.template) continue;
    tScore[q.template] = (tScore[q.template] || 0) + w(y);
    if (!tLast[q.template] || tLast[q.template].year < y) tLast[q.template] = q;
    (tCountYears[q.template] ||= {})[y] = (tCountYears[q.template][y] || 0) + 1;
  }
  if (p.method === 'hazard') {
    const hz = hazardTable(data, Y); const cnt = {}, last = {};
    for (const yy in data.years) { if (+yy >= Y) continue; for (const q of data.years[yy]) if (q.template) { cnt[q.template] = (cnt[q.template] || 0) + 1; last[q.template] = Math.max(last[q.template] || 0, +yy); if (!tLast[q.template] || tLast[q.template].year < +yy) tLast[q.template] = q; } }
    for (const t in cnt) tScore[t] = hz(cnt[t], Y - last[t]) * (Y - last[t] > p.window ? 0.5 : 1);
  }
  const total = Object.values(chCount).reduce((a, b) => a + b, 0);
  const quota = {}; let assigned = 0;
  const chapters = Object.keys(chCount).sort((a, b) => chCount[b] - chCount[a]);
  const L = p.list || 60; const raw = chapters.map((c) => [c, (chCount[c] / total) * L]);
  for (const [c, r] of raw) { quota[c] = Math.floor(r); assigned += quota[c]; }
  const rem = raw.map(([c, r]) => [c, r - Math.floor(r)]).sort((a, b) => b[1] - a[1]);
  for (let i = 0; assigned < L && i < rem.length; i++, assigned++) quota[rem[i][0]]++;
  // slots: within each chapter, best templates; a template may take extra slots if its expected count/year is high
  const slots = [];
  const byCh = {};
  for (const t of Object.keys(tScore)) (byCh[data.tmap.get(t)?.chapter || tLast[t].chapter] ||= []).push(t);
  const fExp = {}; for (const y of prior) for (const q of data.years[y]) if (q.template) fExp[q.template] = (fExp[q.template] || 0) + w(y) / wsum;
  const expected = (t) => fExp[t] || 0; // weighted questions per year
  const leftovers = [];
  for (const c of chapters) {
    const cands = (byCh[c] || []).flatMap((t) => { const e = expected(t); const n = Math.max(1, Math.round(e / p.multi + 0.5)); return Array.from({ length: n }, (_, k) => ({ t, score: tScore[t] / (k + 1), k })); }).sort((a, b) => b.score - a.score);
    const take = cands.slice(0, quota[c] || 0); leftovers.push(...cands.slice(quota[c] || 0));
    for (const x of take) slots.push({ template: x.t, chapter: c, score: +x.score.toFixed(3), slot: x.k, sample: tLast[x.t].id, sampleQ: tLast[x.t].q });
  }
  leftovers.sort((a, b) => b.score - a.score);
  for (const x of leftovers) { if (slots.length >= L) break; slots.push({ template: x.t, chapter: data.tmap.get(x.t)?.chapter, score: +x.score.toFixed(3), slot: x.k, sample: tLast[x.t].id, sampleQ: tLast[x.t].q, filler: true }); }
  return { year: Y, subject: data.subject, params: p, priorYears: prior, quota, slots, seenTemplates: new Set(Object.keys(tScore)), allSeen: new Set(Object.keys(data.years).filter((y) => y < Y).flatMap((y) => data.years[y].map((q) => q.template).filter(Boolean))) };
}

// ---------- scoring ----------
export function score(data, pred, Y, p = P) {
  const actual = data.years[Y]; if (!actual || !pred) return null;
  const predicted = new Set(pred.slots.map((s) => s.template));
  const priorQs = Object.keys(data.years).map(Number).filter((y) => y < Y).flatMap((y) => data.years[y]);
  const rows = actual.map((q) => {
    let best = null, bj = 0;
    for (const pq of priorQs) { const j = jaccard(q.tokens, pq.tokens); if (j > bj) { bj = j; best = pq; } }
    const verbatim = bj >= p.exact;
    let outcome;
    if (!q.template) outcome = 'unlabelled';
    else if (predicted.has(q.template)) outcome = verbatim ? 'exact' : 'similar';
    else if (pred.allSeen.has(q.template)) outcome = 'miss-seen';
    else outcome = 'miss-new';
    return { id: q.id, n: q.n, chapter: q.chapter, template: q.template, outcome, verbatimOf: verbatim ? best.id : null, sim: +bj.toFixed(2), q: q.q.slice(0, 160) };
  });
  const c = {}; for (const r of rows) c[r.outcome] = (c[r.outcome] || 0) + 1;
  const n = rows.length;
  const hit = (c.exact || 0) + (c.similar || 0);
  // predicted templates that did not appear (wasted slots)
  const appeared = new Set(actual.map((q) => q.template));
  const wasted = pred.slots.filter((s) => !appeared.has(s.template)).length;
  const summary = { year: Y, subject: data.subject, n, exact: c.exact || 0, similar: c.similar || 0, missSeen: c['miss-seen'] || 0, missNew: c['miss-new'] || 0, hitPct: +((100 * hit) / n).toFixed(1), predictablePct: +((100 * (n - (c['miss-new'] || 0))) / n).toFixed(1), verbatimRepeats: rows.filter((r) => r.verbatimOf).length, wastedSlots: wasted };
  // lessons: templates missed that were well known, chapters over/under-predicted
  const missedKnown = rows.filter((r) => r.outcome === 'miss-seen').map((r) => r.template);
  const chActual = {}; for (const q of actual) chActual[q.chapter] = (chActual[q.chapter] || 0) + 1;
  const chDiff = Object.keys({ ...pred.quota, ...chActual }).map((ch) => ({ chapter: ch, predicted: pred.quota[ch] || 0, actual: chActual[ch] || 0 })).filter((x) => x.predicted !== x.actual).sort((a, b) => Math.abs(b.actual - b.predicted) - Math.abs(a.actual - a.predicted));
  return { summary, rows, lessons: { missedKnownTemplates: missedKnown, chapterGaps: chDiff.slice(0, 8), wastedTemplates: pred.slots.filter((s) => !appeared.has(s.template)).map((s) => s.template) } };
}

export function run(p = P, years = [Y0, Y1], subjects = SUBJECTS, write = false) {
  const out = [];
  for (const s of subjects) {
    const data = loadSubject(s);
    for (let Y = years[0]; Y <= years[1]; Y++) {
      const pred = predict(data, Y, p); const sc = score(data, pred, Y, p); if (!sc) continue;
      out.push(sc.summary);
      if (write) { fs.mkdirSync(`${root}${OUT}`, { recursive: true }); fs.writeFileSync(`${root}${OUT}/${Y}-${s}.json`, JSON.stringify({ params: p, priorYears: pred.priorYears, quota: pred.quota, predicted: pred.slots, summary: sc.summary, lessons: sc.lessons, questions: sc.rows }, null, 1)); }
    }
  }
  return out;
}
export function table(rows) {
  const line = (r) => `| ${r.year} | ${r.subject} | ${r.n} | ${r.exact} | ${r.similar} | ${r.missSeen} | ${r.missNew} | **${r.hitPct}%** | ${r.predictablePct}% | ${r.verbatimRepeats} |`;
  const tot = rows.reduce((a, r) => { for (const k of ['n', 'exact', 'similar', 'missSeen', 'missNew', 'verbatimRepeats']) a[k] = (a[k] || 0) + r[k]; return a; }, {});
  tot.year = 'All'; tot.subject = ''; tot.hitPct = +((100 * (tot.exact + tot.similar)) / tot.n).toFixed(1); tot.predictablePct = +((100 * (tot.n - tot.missNew)) / tot.n).toFixed(1);
  return ['| Year | Subject | Qs | Exact | Similar | Miss (seen before) | Miss (new) | Hit % | Predictable ceiling % | Verbatim repeats |', '|---|---|---|---|---|---|---|---|---|---|', ...rows.map(line), line(tot)].join('\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (flag('predict')) {
    const Y = +arg('predict'); const p = { ...P, method: 'hazard', list: 200 };
    for (const s of SUBJECTS) {
      const data = loadSubject(s); const pred = predict(data, Y, p); const hz = hazardTable(data, Y);
      const cnt = {}, last = {}, years = {}; for (const yy in data.years) for (const q of data.years[yy]) if (q.template) { cnt[q.template] = (cnt[q.template] || 0) + 1; last[q.template] = Math.max(last[q.template] || 0, +yy); (years[q.template] ||= new Set()).add(+yy); }
      const seen = new Set(); const list = pred.slots.filter((x) => !seen.has(x.template) && seen.add(x.template)).map((x, i) => { const t = data.tmap.get(x.template); return { rank: i + 1, template: x.template, chapter: x.chapter, name: t?.name, desc: t?.desc, probability: +hz(cnt[x.template], Y - last[x.template]).toFixed(2), timesAsked: cnt[x.template], years: [...years[x.template]].sort(), lastAsked: last[x.template], sample: x.sample, sampleQ: x.sampleQ }; });
      const paper = list.slice(0, 60);
      fs.writeFileSync(`${root}research/prediction/predict-${Y}-${s}.json`, JSON.stringify({ year: Y, subject: s, method: p, chapterQuota: pred.quota, paper, practiceList: list }, null, 1));
      const quotaRows = Object.entries(pred.quota).filter(([, n]) => n).sort((a, b) => b[1] - a[1]).map(([c, n]) => `| ${c} | ${Math.round((n * 60) / p.list)} |`).join('\n');
      const md = `# Predicted KCET ${Y} ${s} paper\n\nBuilt only from the ${Object.keys(data.years).length} KEA papers 2009-${Y - 1}. Backtests show a 60-slot prediction like this one matches about a quarter of the real paper (same question type), and the full practice list below covers roughly three quarters. See README.md.\n\n## Expected questions per chapter\n\n| Chapter | Expected Qs |\n|---|---|\n${quotaRows}\n\n## The predicted paper (top 60 question types)\n\n| # | Chapter | Question type | P(appears) | Asked | Last | Sample (year-n) |\n|---|---|---|---|---|---|---|\n${paper.map((x) => `| ${x.rank} | ${x.chapter} | ${x.name} | ${x.probability} | ${x.timesAsked}x | ${x.lastAsked} | ${x.sample} |`).join('\n')}\n\n## Practice list (next ${list.length - 60}, ranks 61-${list.length})\n\n| # | Chapter | Question type | P | Asked | Last | Sample |\n|---|---|---|---|---|---|---|\n${list.slice(60).map((x) => `| ${x.rank} | ${x.chapter} | ${x.name} | ${x.probability} | ${x.timesAsked}x | ${x.lastAsked} | ${x.sample} |`).join('\n')}\n`;
      fs.writeFileSync(`${root}research/prediction/predict-${Y}-${s}.md`, md);
      console.log(s, 'paper', paper.length, 'list', list.length, 'avg P top60', (paper.reduce((a, x) => a + x.probability, 0) / paper.length).toFixed(2));
    }
  } else if (flag('curve')) {
    for (const method of ['freq', 'hazard']) for (const list of [60, 90, 120, 150, 200, 300]) {
      const rows = run({ ...P, method, list }, [Y0, Y1], SUBJECTS); const hit = rows.reduce((a, r) => a + r.exact + r.similar, 0), n = rows.reduce((a, r) => a + r.n, 0);
      console.log(`${method.padEnd(7)} list=${String(list).padEnd(4)} covers ${((100 * hit) / n).toFixed(1)}% of questions (ceiling ${rows[0] ? ((100 * rows.reduce((a, r) => a + r.n - r.missNew, 0)) / n).toFixed(1) : 0}%)`);
    }
  } else if (flag('tune')) {
    const grid = []; for (const decay of [0.6, 0.7, 0.8, 0.9, 1]) for (const window of [3, 4, 6, 8, 12]) for (const multi of [1, 1.5, 2, 3]) {
      const p = { ...P, decay, window, multi }; const rows = run(p, [Y0, Y1], SUBJECTS); const tot = rows.reduce((a, r) => a + r.exact + r.similar, 0), n = rows.reduce((a, r) => a + r.n, 0);
      grid.push({ decay, window, multi, hitPct: +((100 * tot) / n).toFixed(2) });
    }
    grid.sort((a, b) => b.hitPct - a.hitPct); console.log(grid.slice(0, 12).map((g) => JSON.stringify(g)).join('\n')); console.log('...worst', JSON.stringify(grid.at(-1)));
  } else {
    const rows = run(P, [Y0, Y1], SUBJECTS, !flag('quiet'));
    console.log(table(rows));
  }
}
