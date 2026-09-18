import { SUBJECTS, questionsByIds, pyqPaper, syllabus } from '../data.js';
import { store } from '../store.js';
import { el, esc, math, fmtTime, fmtDate, optionButton, LETTERS, reasonChips, bindReasonChips } from '../ui.js';

export default async function result([id]) {
  const t = store.test(id);
  if (!t) throw new Error('Result not found');
  let lookup;
  if (t.pyq) { const p = await pyqPaper(t.pyq); lookup = Object.fromEntries(p.questions.map((q, i) => [q.id || `${t.pyq}-${i + 1}`, q])); }
  else { lookup = await questionsByIds(t.items.map((it) => it.qid)); }
  const syl = await syllabus();
  const pct = Math.round(100 * t.correct / t.total);

  // Per subject + per chapter breakdown
  const bySub = {}, byCh = {};
  for (const it of t.items) {
    const ok = it.chosen === it.correct || (it.also || []).includes(it.chosen) || (it.grace && it.chosen !== null);
    const s = bySub[it.subject] ||= { c: 0, n: 0 }; s.n++; if (ok) s.c++;
    if (it.chapter) { const k = it.subject + '/' + it.chapter; const c = byCh[k] ||= { c: 0, n: 0 }; c.n++; if (ok) c.c++; }
  }
  const weak = Object.entries(byCh).map(([k, v]) => ({ k, ...v, pct: v.c / v.n })).filter((x) => x.n >= 2 && x.pct < 0.6).sort((a, b) => a.pct - b.pct).slice(0, 5);

  const node = el(`<div>
    <h1>Result</h1>
    <div class="card" style="text-align:center">
      <div class="muted">${esc(t.title)} · ${fmtDate(t.date)}</div>
      <div class="score-big">${t.correct} / ${t.total}</div>
      <div class="pill ${pct >= 70 ? 'ok' : pct >= 40 ? 'warn' : 'bad'}">${pct}%</div>
      <div class="grid three" style="margin-top:12px">
        <div class="stat"><b style="color:var(--ok)">${t.correct}</b><span class="muted">correct</span></div>
        <div class="stat"><b style="color:var(--bad)">${t.wrong}</b><span class="muted">wrong</span></div>
        <div class="stat"><b>${t.skipped}</b><span class="muted">skipped</span></div>
      </div>
      <div class="muted" style="margin-top:8px">Time: ${fmtTime(t.timeTaken)} · ${(t.timeTaken / t.total).toFixed(0)} s per question (KCET allows 80 s)</div>
    </div>
    ${Object.keys(bySub).length > 1 ? `<div class="card"><h3>By subject</h3>${Object.entries(bySub).map(([s, v]) => `<div class="row spread"><span>${SUBJECTS.find((x) => x.id === s)?.name || s}</span><b>${v.c}/${v.n}</b></div>`).join('')}</div>` : ''}
    ${weak.length ? `<div class="card"><h3>Chapters to revise</h3>${weak.map((w) => { const [s, slug] = w.k.split('/'); const m = syl[s]?.find((c) => c.slug === slug || c.title.toLowerCase() === slug.toLowerCase()); return `<div class="row spread"><a href="#/chapter/${s}/${m?.slug || slug}">${esc(m?.title || slug)}</a><span class="pill bad">${w.c}/${w.n}</span></div>`; }).join('')}</div>` : ''}
    <div class="row">
      <a class="btn" href="#/tests">Another test</a>
      <a class="btn secondary" href="#/progress">Progress</a>
    </div>
    <h2>Review answers</h2>
    <div class="tabs"><button class="active" data-f="all">All</button><button data-f="wrong">Wrong</button><button data-f="skipped">Skipped</button></div>
    <div id="list"></div>
  </div>`);

  const list = node.querySelector('#list');
  function render(filter) {
    list.innerHTML = t.items.map((it, i) => {
      const q = lookup[it.qid]; if (!q) return '';
      const status = it.chosen === null ? 'skipped' : (it.chosen === it.correct || (it.also || []).includes(it.chosen) || it.grace) ? 'right' : 'wrong';
      if (filter === 'wrong' && status !== 'wrong') return ''; if (filter === 'skipped' && status !== 'skipped') return '';
      return `<div class="card">
        <div class="row spread muted"><span>Q${i + 1} · ${status === 'right' ? '✅ Correct' : status === 'wrong' ? '❌ Wrong' : '⚪ Skipped'}</span><button class="btn small ghost bm" data-q="${q.id}">${store.isBookmarked(q.id) ? '★ Saved' : '☆ Save'}</button></div>
        <div class="question">${q.q}</div>
        <div class="options">${q.options.map((o, j) => optionButton(o, j, (j === it.correct || (it.also || []).includes(j)) ? 'correct' : j === it.chosen ? 'wrong' : '', true)).join('')}</div>
        <div class="explain"><b>Answer: ${LETTERS[it.correct]}${(it.also || []).length ? ' (KEA also accepted ' + it.also.map((j) => LETTERS[j]).join(', ') + ')' : ''}${q.grace ? ' · KEA awarded grace marks (any answer counted)' : ''}</b>${q.explanation ? `<div>${q.explanation}</div>` : ''}${q.disputed ? `<div class="muted" style="margin-top:6px">⚠️ Official key is disputed: ${esc(q.note || '')}</div>` : ''}</div>
        ${status === 'wrong' ? reasonChips(q.id) : ''}
      </div>`;
    }).join('') || '<div class="empty">Nothing here.</div>';
    math(list); bindReasonChips(list);
    list.querySelectorAll('.bm').forEach((b) => b.addEventListener('click', () => { const on = store.toggleBookmark(b.dataset.q); b.textContent = on ? '★ Saved' : '☆ Save'; }));
  }
  render('all');
  node.querySelectorAll('.tabs button').forEach((b) => b.addEventListener('click', () => { node.querySelectorAll('.tabs button').forEach((x) => x.classList.toggle('active', x === b)); render(b.dataset.f); }));
  return node;
}
