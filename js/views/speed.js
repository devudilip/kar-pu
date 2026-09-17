import { SUBJECTS, syllabus, allQuestions, shuffle } from '../data.js';
import { store } from '../store.js';
import { el, esc, math, optionButton, LETTERS, fmtTime, bar } from '../ui.js';
import { reasonChips } from '../ui.js';

// Speed training: forced pace per question, or two-pass (quick pass then return to skipped).
export default async function speed([], query) {
  const node = el(`<div>
    <h1>Speed training</h1>
    <p class="muted">KCET gives 80 seconds per question and has no negative marking. Rankers answer sure questions in under 45 s, skip the rest on the first pass, and come back. Train that habit here.</p>
    <div class="card">
      <div class="stack">
        <label class="field">Mode
          <select id="mode">
            <option value="speed">60-second mode — the question moves on when time is up</option>
            <option value="twopass">Two-pass — 30 s quick pass, then unlimited time on skipped ones</option>
          </select></label>
        <div class="checks">${SUBJECTS.map((s) => `<label><input type="checkbox" name="sub" value="${s.id}" checked> ${s.name}</label>`).join('')}</div>
        <label class="field">Questions <input type="number" id="count" value="20" min="5" max="60"></label>
        <label class="field" id="secField">Seconds per question <select id="secs"><option value="45">45 (ranker pace)</option><option value="60" selected>60</option><option value="80">80 (exam pace)</option></select></label>
        <button class="btn block" id="start">Start</button>
      </div>
    </div>
    <div id="arena"></div>
  </div>`);
  node.querySelector('#mode').addEventListener('change', (e) => node.querySelector('#secField').classList.toggle('hidden', e.target.value === 'twopass'));
  node.querySelector('#start').addEventListener('click', async () => {
    const subjects = [...node.querySelectorAll('input[name=sub]:checked')].map((x) => x.value);
    if (!subjects.length) return alert('Pick a subject');
    const count = +node.querySelector('#count').value || 20;
    const mode = node.querySelector('#mode').value;
    const secs = mode === 'twopass' ? 30 : +node.querySelector('#secs').value;
    const qs = shuffle(await allQuestions(subjects)).slice(0, count);
    node.querySelector('.card').classList.add('hidden');
    run(node.querySelector('#arena'), qs, { mode, secs, node });
  });
  return node;
}

function run(arena, qs, { mode, secs, node }) {
  const times = qs.map(() => 0), answers = qs.map(() => null), skipped = qs.map(() => false);
  let pass = 1, order = qs.map((_, i) => i), pos = 0, timer = null, tStart = 0;
  const limit = () => (pass === 2 ? 0 : secs);

  function show() {
    if (pos >= order.length) {
      if (mode === 'twopass' && pass === 1) {
        const left = order.filter((i) => answers[i] === null);
        if (left.length) { pass = 2; order = left; pos = 0; arena.innerHTML = `<div class="card" style="text-align:center"><h2>First pass done</h2><p>You answered ${qs.length - left.length} of ${qs.length}. Now take your time on the ${left.length} you skipped.</p><button class="btn" id="go">Second pass →</button></div>`; arena.querySelector('#go').addEventListener('click', show); return; }
      }
      return finish();
    }
    const i = order[pos], q = qs[i];
    tStart = Date.now();
    arena.innerHTML = `<div class="card">
      <div class="row spread muted"><span>${pass === 2 ? 'Second pass · ' : ''}Q ${pos + 1} / ${order.length}</span><span class="timer" id="t">${limit() ? limit() + 's' : 'no limit'}</span></div>
      ${limit() ? `<div class="progress" style="margin:6px 0"><span id="pb" style="width:100%;background:var(--primary-2)"></span></div>` : ''}
      <div class="question">${q.q}</div>
      <div class="options">${q.options.map((o, j) => optionButton(o, j)).join('')}</div>
      <div class="row spread" style="margin-top:10px"><button class="btn secondary" id="skip">${pass === 1 && mode === 'twopass' ? 'Not sure — skip' : 'Skip'}</button></div>
    </div>${bar(100 * pos / order.length)}`;
    math(arena);
    const pick = (j) => { clearInterval(timer); times[i] += Date.now() - tStart; answers[i] = j; pos++; show(); };
    arena.querySelectorAll('.option').forEach((b) => b.addEventListener('click', () => pick(+b.dataset.i)));
    arena.querySelector('#skip').addEventListener('click', () => { clearInterval(timer); times[i] += Date.now() - tStart; skipped[i] = true; pos++; show(); });
    if (limit()) {
      timer = setInterval(() => {
        const left = limit() - (Date.now() - tStart) / 1000;
        const t = arena.querySelector('#t'); if (!t) return clearInterval(timer);
        t.textContent = Math.max(0, Math.ceil(left)) + 's'; t.classList.toggle('low', left < 10);
        arena.querySelector('#pb').style.width = Math.max(0, 100 * left / limit()) + '%';
        if (left <= 0) { clearInterval(timer); times[i] += limit() * 1000; skipped[i] = true; pos++; show(); }
      }, 200);
    }
  }
  node._cleanup = () => clearInterval(timer);

  function finish() {
    clearInterval(timer);
    let correct = 0, wrong = 0, unans = 0, slow = [];
    const items = qs.map((q, i) => { const ok = answers[i] === q.answer; if (answers[i] === null) unans++; else if (ok) correct++; else wrong++; if (answers[i] !== null) store.recordAttempt(q.id, ok, times[i]); if (times[i] > 60000) slow.push(i); return { qid: q.id, subject: q.subject, chapter: q.chapter, chosen: answers[i], correct: q.answer, ms: times[i] }; });
    const total = times.reduce((a, b) => a + b, 0);
    const avg = total / qs.length / 1000;
    store.saveTest({ id: 't' + Date.now(), title: `Speed ${mode === 'twopass' ? 'two-pass' : secs + 's'} · ${qs.length} Qs`, date: Date.now(), cfg: { speed: true }, total: qs.length, correct, wrong, skipped: unans, timeTaken: Math.round(total / 1000), items });
    const verdict = avg <= 45 ? 'Ranker pace. Keep accuracy up.' : avg <= 60 ? 'Good pace — under exam limit with buffer.' : avg <= 80 ? 'At the exam limit. Practise recognising sure questions faster.' : 'Too slow for KCET. Do two-pass drills daily until the first pass is under 40 s a question.';
    arena.innerHTML = `<div class="card" style="text-align:center">
        <h2>Speed result</h2><div class="score-big">${correct}/${qs.length}</div>
        <div class="grid three"><div class="stat"><b>${avg.toFixed(0)} s</b><span class="muted">avg per Q</span></div><div class="stat"><b>${unans}</b><span class="muted">unanswered</span></div><div class="stat"><b>${slow.length}</b><span class="muted">over 60 s</span></div></div>
        <p>${verdict}</p><p class="muted">Remember: in the real exam mark something for every unanswered question — there is no negative marking.</p>
        <div class="row" style="justify-content:center"><button class="btn" id="again">Again</button><a class="btn secondary" href="#/progress">Progress</a></div>
      </div>
      <h2>Review</h2>
      ${qs.map((q, i) => { const st = answers[i] === null ? 'skipped' : answers[i] === q.answer ? 'right' : 'wrong'; return `<div class="card">
        <div class="row spread muted"><span>Q${i + 1} · ${st === 'right' ? '✅' : st === 'wrong' ? '❌' : '⚪ not answered'} · ${(times[i] / 1000).toFixed(0)} s ${times[i] > 60000 ? '<span class="pill warn">slow</span>' : ''}</span></div>
        <div class="question">${q.q}</div>
        <div class="options">${q.options.map((o, j) => optionButton(o, j, j === q.answer ? 'correct' : j === answers[i] ? 'wrong' : '', true)).join('')}</div>
        <div class="explain"><b>Answer: ${LETTERS[q.answer]}</b><div>${q.explanation || ''}</div></div>
        ${st === 'wrong' ? reasonChips(q.id) : ''}
      </div>`; }).join('')}`;
    math(arena);
    bindReasonChips(arena);
    arena.querySelector('#again').addEventListener('click', () => location.reload());
  }
  show();
}
import { bindReasonChips } from '../ui.js';
