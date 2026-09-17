import { SUBJECTS, syllabus, KCET } from '../data.js';
import { store } from '../store.js';
import { el, esc, fmtDate, fmtTime } from '../ui.js';

// Test config is passed to the exam view through sessionStorage.
export function launchExam(config) { sessionStorage.setItem('kcet.examConfig', JSON.stringify(config)); location.hash = '#/exam'; }

export default async function tests([], query) {
  const syl = await syllabus();
  const st = store.get();
  const counts = {};
  for (const s of SUBJECTS) counts[s.id] = syl[s.id].filter((c) => c.count).length;

  const history = st.tests.slice(0, 10).map((t) => `<tr><td><a href="#/result/${t.id}">${esc(t.title)}</a><div class="muted">${fmtDate(t.date)}</div></td><td>${t.correct}/${t.total}</td><td>${fmtTime(t.timeTaken)}</td></tr>`).join('');

  const node = el(`<div>
    <h1>Tests</h1>
    <div class="card">
      <h2 style="margin-top:0">Full KCET mock</h2>
      <p class="muted">Exact exam pattern: ${KCET.questionsPerSubject} questions, ${KCET.minutesPerSubject} minutes, one subject per paper, no negative marking. Questions are drawn from every chapter in proportion to KCET weightage.</p>
      <div class="row">${SUBJECTS.map((s) => `<button class="btn" data-full="${s.id}">${s.name}</button>`).join('')}</div>
    </div>
    <div class="card">
      <h2 style="margin-top:0">Custom test</h2>
      <div class="stack">
        <div class="checks">${SUBJECTS.map((s) => `<label><input type="checkbox" name="sub" value="${s.id}" ${(!query.subject || query.subject === s.id) ? 'checked' : ''}> ${s.name}</label>`).join('')}</div>
        <label class="field">PUC year <select id="puc"><option value="0">Both</option><option value="1">1st PUC only</option><option value="2">2nd PUC only</option></select></label>
        <label class="field">Number of questions <input type="number" id="count" value="30" min="5" max="180"></label>
        <label class="field">Time (minutes) <input type="number" id="mins" value="40" min="1" max="240"></label>
        <label class="field">Difficulty <select id="diff"><option value="">Mixed</option><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></label>
        <button class="btn block" id="startCustom">Start custom test</button>
      </div>
    </div>
    <div class="card">
      <h2 style="margin-top:0">Revision tests</h2>
      <div class="row">
        <button class="btn secondary" id="wrongTest">My mistakes (${store.wrongQids().length})</button>
        <button class="btn secondary" id="bmTest">Bookmarked (${st.bookmarks.length})</button>
      </div>
    </div>
    <div class="card"><h2 style="margin-top:0">Speed training</h2><p class="muted">60-second forced-pace drills and two-pass (skip-and-return) practice with time per question.</p><a class="btn secondary" href="#/speed">Open speed training</a></div>
    <div class="card"><h2 style="margin-top:0">Previous year papers</h2><p class="muted">Solve real KCET papers year by year, timed like the exam, with instant answer review.</p><a class="btn secondary" href="#/pyq">Open PYQ papers</a></div>
    ${history ? `<div class="card"><h2 style="margin-top:0">Recent results</h2><table class="table"><thead><tr><th>Test</th><th>Score</th><th>Time</th></tr></thead><tbody>${history}</tbody></table></div>` : ''}
  </div>`);

  node.querySelectorAll('[data-full]').forEach((b) => b.addEventListener('click', () => {
    const s = b.dataset.full;
    launchExam({ title: `KCET Mock — ${SUBJECTS.find((x) => x.id === s).name}`, subjects: [s], puc: 0, count: KCET.questionsPerSubject, minutes: KCET.minutesPerSubject, weighted: true });
  }));
  node.querySelector('#startCustom').addEventListener('click', () => {
    const subjects = [...node.querySelectorAll('input[name=sub]:checked')].map((x) => x.value);
    if (!subjects.length) return alert('Pick at least one subject');
    launchExam({ title: 'Custom test', subjects, puc: +node.querySelector('#puc').value, count: +node.querySelector('#count').value || 30, minutes: +node.querySelector('#mins').value || 40, difficulty: node.querySelector('#diff').value });
  });
  node.querySelector('#wrongTest').addEventListener('click', () => {
    const ids = store.wrongQids(); if (!ids.length) return alert('No mistakes recorded yet. Practise some chapters first.');
    launchExam({ title: 'Revision — my mistakes', ids, minutes: Math.max(5, Math.ceil(ids.length * 1.3)) });
  });
  node.querySelector('#bmTest').addEventListener('click', () => {
    const ids = store.get().bookmarks; if (!ids.length) return alert('No bookmarks yet. Save questions while practising.');
    launchExam({ title: 'Revision — bookmarks', ids, minutes: Math.max(5, Math.ceil(ids.length * 1.3)) });
  });
  return node;
}
