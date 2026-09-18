import { SUBJECTS, PFX, syllabus, questionsByIds } from '../data.js';
import { store } from '../store.js';
import { el, esc, bar, fmtDate, math, LETTERS, REASONS, reasonChips, bindReasonChips } from '../ui.js';

export default async function progress() {
  const syl = await syllabus();
  const st = store.get();
  const rows = [];
  for (const s of SUBJECTS) for (const c of syl[s.id]) {
    if (!c.count) continue;
    const cs = store.prefixStats(`${PFX[s.id]}-${c.slug}-`, c.count);
    rows.push({ s: s.id, slug: c.slug, title: c.title, weight: c.weight, ...cs, acc: cs.attempted ? cs.correct / cs.attempted : null });
  }
  const perSub = SUBJECTS.map((s) => { const r = rows.filter((x) => x.s === s.id); const att = r.reduce((a, x) => a + x.attempted, 0), cor = r.reduce((a, x) => a + x.correct, 0), tot = r.reduce((a, x) => a + x.total, 0); return { ...s, att, cor, tot }; });
  const weak = rows.filter((r) => r.attempted >= 3).sort((a, b) => a.acc - b.acc).slice(0, 5);
  const untouched = rows.filter((r) => !r.attempted).sort((a, b) => b.weight - a.weight).slice(0, 5);
  const wrong = store.wrongQids();
  const rs = store.reasonStats(); const rTotal = Object.values(rs).reduce((a, b) => a + b, 0);
  const advice = { concept: 'Re-read the chapter notes and flashcards before re-attempting.', calculation: 'Slow down on arithmetic; write one line of working even in MCQs.', careless: 'Read the question twice; underline "NOT", units and what is asked.', time: 'Do speed training; skip on the first pass and return.' };
  const top = Object.entries(rs).sort((a, b) => b[1] - a[1])[0];

  const node = el(`<div>
    <h1>Progress</h1>
    <div class="grid three">${perSub.map((s) => `<div class="card"><b>${s.name}</b><div class="muted">${s.att}/${s.tot} attempted · ${s.att ? Math.round(100 * s.cor / s.att) : 0}% correct</div>${bar(s.tot ? 100 * s.att / s.tot : 0, `var(--${s.id === 'physics' ? 'phy' : s.id === 'chemistry' ? 'chem' : 'math'})`)}</div>`).join('')}</div>
    ${weak.length ? `<div class="card"><h3 style="margin-top:0">Weakest chapters — revise these first</h3>${weak.map((r) => `<div class="row spread"><a href="#/chapter/${r.s}/${r.slug}?tab=practice">${esc(r.title)}</a><span class="pill ${r.acc >= .7 ? 'ok' : r.acc >= .4 ? 'warn' : 'bad'}">${Math.round(100 * r.acc)}%</span></div>`).join('')}</div>` : ''}
    ${untouched.length ? `<div class="card"><h3 style="margin-top:0">High-weightage chapters not started</h3>${untouched.map((r) => `<div class="row spread"><a href="#/chapter/${r.s}/${r.slug}">${esc(r.title)}</a><span class="pill">~${r.weight} Q</span></div>`).join('')}</div>` : ''}
    <div class="tabs"><button class="active" data-t="tests">Tests (${st.tests.length})</button><button data-t="mistakes">Mistakes (${wrong.length})</button><button data-t="bookmarks">Bookmarks (${st.bookmarks.length})</button><button data-t="chapters">All chapters</button></div>
    <div id="tests">${st.tests.length ? `<table class="table"><thead><tr><th>Test</th><th>Score</th><th>Date</th></tr></thead><tbody>${st.tests.map((t) => `<tr><td><a href="#/result/${t.id}">${esc(t.title)}</a></td><td>${t.correct}/${t.total} (${Math.round(100 * t.correct / t.total)}%)</td><td class="muted">${fmtDate(t.date)}</td></tr>`).join('')}</tbody></table>` : '<div class="empty">No tests yet. <a href="#/tests">Take one</a>.</div>'}</div>
    <div id="mistakes" class="hidden">
      ${rTotal ? `<div class="card"><h3 style="margin-top:0">Why I get things wrong</h3>${REASONS.map(([k, l]) => `<div class="row spread" style="margin:4px 0"><span>${l}</span><span>${rs[k] || 0}</span></div>${bar(100 * (rs[k] || 0) / rTotal, k === top[0] ? 'var(--bad)' : undefined)}`).join('')}<p class="muted" style="margin-top:8px"><b>Biggest pattern: ${REASONS.find((r) => r[0] === top[0])[1]}.</b> ${advice[top[0]]}</p></div>` : '<div class="card muted">Tag your wrong answers (Concept / Calculation / Careless / Time) while practising and your pattern will appear here.</div>'}
      <div class="row" style="margin-bottom:8px"><span class="muted">Filter:</span><button class="btn small" data-f="">All</button>${REASONS.map(([k, l]) => `<button class="btn small ghost" data-f="${k}">${l}</button>`).join('')}<button class="btn small ghost" data-f="untagged">Untagged</button></div>
      <div id="mlist"><div class="loading">Loading…</div></div>
    </div>
    <div id="bookmarks" class="hidden"><div class="loading">Loading…</div></div>
    <div id="chapters" class="hidden"><table class="table"><thead><tr><th>Chapter</th><th>Done</th><th>Acc.</th></tr></thead><tbody>${rows.map((r) => `<tr><td><a href="#/chapter/${r.s}/${r.slug}">${esc(r.title)}</a><div class="muted">${SUBJECTS.find((x) => x.id === r.s).short}</div></td><td>${r.attempted}/${r.total}</td><td>${r.acc === null ? '—' : Math.round(100 * r.acc) + '%'}</td></tr>`).join('')}</tbody></table></div>
  </div>`);

  async function qList(ids, target, emptyMsg, withReasons) {
    const box = node.querySelector(target);
    if (!ids.length) { box.innerHTML = `<div class="empty">${emptyMsg}</div>`; return; }
    const map = await questionsByIds(ids);
    box.innerHTML = ids.map((id) => { const q = map[id]; if (!q) return ''; const m = syl[q.subject].find((c) => c.slug === q.chapter); const a = store.attempt(id);
      return `<div class="card"><div class="row spread muted"><a href="#/chapter/${q.subject}/${q.chapter}?tab=practice">${esc(m?.title || '')}</a>${a?.reason ? `<span class="pill bad">${REASONS.find((r) => r[0] === a.reason)?.[1] || a.reason}</span>` : ''}</div><div class="question">${q.q}</div><details><summary class="muted">Show answer</summary><div class="explain"><b>${LETTERS[q.answer]}. ${q.options[q.answer]}</b>${q.explanation ? `<div>${q.explanation}</div>` : ''}</div>${withReasons ? reasonChips(q.id) : ''}</details></div>`; }).join('');
    math(box); bindReasonChips(box);
  }
  const mistakeFilter = (f) => { const ids = wrong.filter((id) => { const r = store.attempt(id)?.reason; return !f ? true : f === 'untagged' ? !r : r === f; }); qList(ids, '#mlist', 'No mistakes here.', true); };
  node.querySelectorAll('#mistakes [data-f]').forEach((b) => b.addEventListener('click', () => { node.querySelectorAll('#mistakes [data-f]').forEach((x) => x.classList.toggle('ghost', x !== b)); mistakeFilter(b.dataset.f); }));
  let loaded = {};
  node.querySelectorAll('.tabs button').forEach((b) => b.addEventListener('click', () => {
    const t = b.dataset.t;
    node.querySelectorAll('.tabs button').forEach((x) => x.classList.toggle('active', x === b));
    ['tests', 'mistakes', 'bookmarks', 'chapters'].forEach((k) => node.querySelector('#' + k).classList.toggle('hidden', k !== t));
    if (t === 'mistakes' && !loaded.m) { loaded.m = 1; mistakeFilter(''); }
    if (t === 'bookmarks' && !loaded.b) { loaded.b = 1; qList(st.bookmarks, '#bookmarks', 'No bookmarks yet.'); }
  }));
  return node;
}
