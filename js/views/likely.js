// Most likely questions: the question types KCET keeps asking, per chapter, built from all past papers
// (research/prediction, tools/build-likely.mjs). Students tick off a type once they have practised its sample question.
import { SUBJECTS, likely } from '../data.js';
import { store } from '../store.js';
import { el, esc } from '../ui.js';

export default async function likelyView([subjectId], query = {}) {
  const subject = SUBJECTS.find((s) => s.id === subjectId) || SUBJECTS[0];
  const d = await likely(subject.id);
  const node = el(`<div>
    <h1>🎯 Most likely questions</h1>
    <p class="muted">We studied every KCET paper from 2009 to 2026. These are the question types that come back again and again, chapter by chapter. Practise the sample question of each type, then tick it off.</p>
    <div class="tabs">${SUBJECTS.map((s) => `<a href="#/likely/${s.id}" class="${s.id === subject.id ? 'active' : ''}" style="text-decoration:none">${s.name}</a>`).join('')}</div>
    ${!d ? '<div class="card empty">Not available yet for this subject.</div>' : `
    <div class="card" style="border-left:5px solid var(--${subject.id === 'maths' ? 'math' : subject.id === 'chemistry' ? 'chem' : 'phy'})">
      <div class="kicker">How much of the paper this covers</div>
      <p style="margin:6px 0">In past years, the <b>top 60</b> types matched about <b>1 in 4</b> questions of the real paper, the top 120 about <b>half</b>, and all ${d.total} here about <b>3 in 4</b>. No one can predict the exact paper, so treat this as a priority list, not a guarantee.</p>
      <div class="muted" style="font-size:.9rem">"Chance" is how often this type reappeared in the following year's paper. "Expected" is the usual number of questions the chapter gets.</div>
      <div id="progress" style="margin-top:10px"></div>
    </div>
    <div class="row" style="margin:8px 0"><label class="muted"><input type="checkbox" id="hideDone"> Hide practised</label></div>
    ${d.chapters.map((c) => `<div class="card" data-ch>
      <div class="row spread" style="align-items:baseline"><h3 style="margin:0">${c.slug ? `<a href="#/chapter/${subject.id}/${c.slug}">${esc(c.title)}</a>` : esc(c.title)}</h3><span class="pill">${c.expected ? `≈${c.expected} Q${c.expected > 1 ? 's' : ''} in paper` : 'rare'}</span></div>
      <div class="muted" style="font-size:.85rem;margin:2px 0 8px">${c.items.length} question types · tap a sample to practise it</div>
      ${c.items.map((it) => `<label class="row" data-item="${it.id}" style="align-items:flex-start;gap:10px;padding:8px 0;border-top:1px solid var(--border);cursor:pointer">
        <input type="checkbox" data-done="${it.id}" ${store.likelyDone(it.id) ? 'checked' : ''} style="margin-top:4px">
        <span style="flex:1"><b>${esc(it.name)}</b>${it.desc ? `<div class="muted" style="font-size:.9rem">${esc(it.desc)}</div>` : ''}
          <div class="row" style="gap:6px;margin-top:4px;flex-wrap:wrap;font-size:.85rem">${chance(it.p)}<span class="muted">asked ${it.asked}× · last ${it.last}</span><a class="btn small secondary" href="#/pyq/${it.sample.file}?q=${it.sample.n}">Practise KCET ${it.sample.file.slice(0, 4)} Q${it.sample.n} →</a></div></span>
      </label>`).join('')}
    </div>`).join('')}
    <p class="muted">Based on ${esc(d.basedOn)}. Built by Sirigannada from official KEA papers; this is a study aid, not an official prediction. The method and its backtest are published in the project's research folder.</p>`}
  </div>`);
  if (!d) return node;
  const total = d.total;
  const prog = node.querySelector('#progress');
  const refresh = () => {
    const done = d.chapters.reduce((a, c) => a + c.items.filter((it) => store.likelyDone(it.id)).length, 0);
    prog.innerHTML = `<div class="row spread"><b>${done} of ${total} practised</b><span class="muted">${Math.round((100 * done) / total)}%</span></div><div class="progress" style="margin-top:6px"><span style="width:${(100 * done) / total}%"></span></div>`;
  };
  refresh();
  node.querySelectorAll('[data-done]').forEach((cb) => cb.addEventListener('change', () => { store.toggleLikely(cb.dataset.done); refresh(); if (hide.checked) cb.closest('[data-item]').classList.toggle('hidden', cb.checked); }));
  const hide = node.querySelector('#hideDone');
  hide.addEventListener('change', () => node.querySelectorAll('[data-item]').forEach((r) => r.classList.toggle('hidden', hide.checked && r.querySelector('input').checked)));
  return node;
}

function chance(p) {
  if (p >= 0.28) return '<span class="pill bad">high chance</span>';
  if (p >= 0.2) return '<span class="pill warn">good chance</span>';
  return '<span class="pill">sometimes</span>';
}
