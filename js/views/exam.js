import { SUBJECTS, syllabus, questionsByIds, pyqPaper, shuffle, sampleQuestions } from '../data.js';
import { store } from '../store.js';
import { el, esc, math, fmtTime, optionButton, toast } from '../ui.js';

const SAVE_KEY = 'kcet.examState';

async function buildQuestions(cfg) {
  if (cfg.pyq) {
    const paper = await pyqPaper(cfg.pyq);
    return paper.questions.map((q, i) => ({ ...q, id: q.id || `${cfg.pyq}-${i + 1}`, subject: q.subject || paper.subject }));
  }
  if (cfg.ids) { const map = await questionsByIds(cfg.ids); return cfg.ids.map((id) => map[id]).filter(Boolean); }
  // Both full mocks and custom tests draw across chapters in proportion to KCET weight, loading only the chapters used.
  return sampleQuestions({ subjects: cfg.subjects, count: cfg.count, puc: cfg.puc || 0, difficulty: cfg.difficulty || '' });
}

export default async function exam() {
  const saved = sessionStorage.getItem(SAVE_KEY);
  let state;
  if (saved) {
    state = JSON.parse(saved);
  } else {
    const cfg = JSON.parse(sessionStorage.getItem('kcet.examConfig') || 'null');
    if (!cfg) { location.hash = '#/tests'; return null; }
    const qs = await buildQuestions(cfg);
    if (!qs.length) { alert('No questions match this selection yet.'); location.hash = '#/tests'; return null; }
    state = { cfg, qs, answers: Array(qs.length).fill(null), review: Array(qs.length).fill(false), idx: 0, start: Date.now(), endAt: Date.now() + cfg.minutes * 60000 };
    sessionStorage.setItem(SAVE_KEY, JSON.stringify(state));
  }
  const persist = () => sessionStorage.setItem(SAVE_KEY, JSON.stringify(state));
  const { qs } = state;

  const node = el(`<div>
    <div class="exam-top">
      <div><b>${esc(state.cfg.title)}</b><div class="muted" id="counter"></div></div>
      <div class="row"><span class="timer" id="timer"></span><button class="btn small" id="submit">Submit</button></div>
    </div>
    <div id="q"></div>
    <div class="card">
      <div class="row spread"><b>Question palette</b><button class="btn small ghost" id="togglePal">Show</button></div>
      <div id="pal" class="hidden">
        <div class="legend"><span><i style="background:var(--ok-bg);border-color:var(--ok)"></i>Answered</span><span><i style="background:#ede9fe;border-color:#7c3aed"></i>Marked for review</span><span><i></i>Not answered</span></div>
        <div class="palette" id="palette"></div>
      </div>
    </div>
  </div>`);

  const qBox = node.querySelector('#q');
  function renderQ() {
    const i = state.idx, q = qs[i];
    node.querySelector('#counter').textContent = `Question ${i + 1} of ${qs.length}${q.subject ? ' · ' + SUBJECTS.find((s) => s.id === q.subject)?.name : ''}`;
    qBox.innerHTML = `<div class="card">
      ${state.review[i] ? '<div style="margin-bottom:8px"><span class="badge-review">🔖 Marked for review</span></div>' : ''}
      <div class="question">${q.q}</div>
      <div class="options">${q.options.map((o, j) => optionButton(o, j, state.answers[i] === j ? 'selected' : '')).join('')}</div>
      <div class="row spread" style="margin-top:12px">
        <button class="btn secondary" id="prev" ${i === 0 ? 'disabled' : ''}>← Prev</button>
        <button class="btn ghost" id="clear" ${state.answers[i] === null ? 'disabled' : ''}>Clear</button>
        <button class="btn ghost" id="mark" style="${state.review[i] ? 'background:#ede9fe;color:#5b21b6;border-color:#c4b5fd' : ''}">${state.review[i] ? '🔖 Unmark' : '🔖 Mark for review & Next'}</button>
        <button class="btn" id="next">${i === qs.length - 1 ? 'Finish' : 'Save & Next →'}</button>
      </div>
    </div>`;
    math(qBox);
    qBox.querySelectorAll('.option').forEach((b) => b.addEventListener('click', () => { state.answers[i] = +b.dataset.i; persist(); renderQ(); renderPal(); }));
    qBox.querySelector('#prev').addEventListener('click', () => { state.idx--; persist(); renderQ(); renderPal(); });
    qBox.querySelector('#next').addEventListener('click', () => { if (i === qs.length - 1) return confirmSubmit(); state.idx++; persist(); renderQ(); renderPal(); });
    qBox.querySelector('#clear').addEventListener('click', () => { state.answers[i] = null; persist(); renderQ(); renderPal(); });
    qBox.querySelector('#mark').addEventListener('click', () => { const was = state.review[i]; state.review[i] = !was; if (!was && i < qs.length - 1) { toast('Marked for review — come back to it from the palette'); state.idx++; } persist(); renderQ(); renderPal(); window.scrollTo(0, 0); });
  }
  const palBox = node.querySelector('#palette');
  function renderPal() {
    palBox.innerHTML = qs.map((_, i) => `<button class="${state.answers[i] !== null ? 'answered' : ''} ${state.review[i] ? 'review' : ''} ${i === state.idx ? 'current' : ''}" data-i="${i}">${i + 1}</button>`).join('');
    palBox.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { state.idx = +b.dataset.i; persist(); renderQ(); renderPal(); window.scrollTo(0, 0); }));
  }
  node.querySelector('#togglePal').addEventListener('click', (e) => { const p = node.querySelector('#pal'); p.classList.toggle('hidden'); e.target.textContent = p.classList.contains('hidden') ? 'Show' : 'Hide'; });

  const timerEl = node.querySelector('#timer');
  let submitted = false;
  const tick = () => {
    const left = (state.endAt - Date.now()) / 1000;
    timerEl.textContent = fmtTime(left);
    timerEl.classList.toggle('low', left < 300);
    if (left <= 0 && !submitted) { toast('Time is up! Submitting…'); finish(); }
  };
  const interval = setInterval(tick, 1000); tick();
  node._cleanup = () => clearInterval(interval);

  function confirmSubmit() {
    const unanswered = state.answers.filter((a) => a === null).length;
    if (confirm(`Submit test?${unanswered ? `\n\n${unanswered} question(s) unanswered. There is no negative marking in KCET — attempt everything!` : ''}`)) finish();
  }
  node.querySelector('#submit').addEventListener('click', confirmSubmit);

  function finish() {
    if (submitted) return; submitted = true; clearInterval(interval);
    const items = qs.map((q, i) => ({ qid: q.id, subject: q.subject, chapter: q.chapter, chosen: state.answers[i], correct: q.answer, also: q.alsoCorrect || [], grace: !!q.grace, review: state.review[i] }));
    let correct = 0, wrong = 0, skipped = 0;
    for (const it of items) { const ok = it.chosen === it.correct || it.also.includes(it.chosen) || (it.grace && it.chosen !== null); if (it.chosen === null) skipped++; else if (ok) correct++; else wrong++; if (it.chosen !== null && !state.cfg.pyq) store.recordAttempt(it.qid, ok); }
    const test = { id: 't' + Date.now(), title: state.cfg.title, date: Date.now(), cfg: state.cfg, total: qs.length, correct, wrong, skipped, timeTaken: Math.round((Date.now() - state.start) / 1000), items, pyq: state.cfg.pyq || null };
    store.saveTest(test);
    sessionStorage.removeItem(SAVE_KEY); sessionStorage.removeItem('kcet.examConfig');
    location.hash = '#/result/' + test.id;
  }

  renderQ(); renderPal();
  return node;
}
