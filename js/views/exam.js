import { SUBJECTS, syllabus, allQuestions, pyqPaper, shuffle } from '../data.js';
import { store } from '../store.js';
import { el, esc, math, fmtTime, optionButton, toast } from '../ui.js';

const SAVE_KEY = 'kcet.examState';

async function buildQuestions(cfg) {
  if (cfg.pyq) {
    const paper = await pyqPaper(cfg.pyq);
    return paper.questions.map((q, i) => ({ ...q, id: q.id || `${cfg.pyq}-${i + 1}`, subject: q.subject || paper.subject }));
  }
  const all = await allQuestions(cfg.ids ? SUBJECTS.map((s) => s.id) : cfg.subjects);
  if (cfg.ids) return cfg.ids.map((id) => all.find((q) => q.id === id)).filter(Boolean);
  const syl = await syllabus();
  let pool = all.filter((q) => {
    const meta = syl[q.subject].find((c) => c.slug === q.chapter);
    if (cfg.puc && meta.puc !== cfg.puc) return false;
    if (cfg.difficulty && q.difficulty !== cfg.difficulty) return false;
    return true;
  });
  if (!cfg.weighted) return shuffle(pool).slice(0, cfg.count);
  // Weighted: allocate questions per chapter by KCET weight, then fill any shortfall randomly.
  const byChapter = {};
  for (const q of pool) (byChapter[q.chapter] ||= []).push(q);
  const chapters = Object.keys(byChapter).map((slug) => ({ slug, weight: syl[cfg.subjects[0]].find((c) => c.slug === slug)?.weight || 1, qs: shuffle(byChapter[slug]) }));
  const totalW = chapters.reduce((a, c) => a + c.weight, 0);
  const picked = [];
  for (const c of chapters) { const n = Math.round(cfg.count * c.weight / totalW); picked.push(...c.qs.splice(0, n)); }
  const rest = shuffle(chapters.flatMap((c) => c.qs));
  while (picked.length < cfg.count && rest.length) picked.push(rest.pop());
  return shuffle(picked.slice(0, cfg.count));
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
      <div class="question">${q.q}</div>
      <div class="options">${q.options.map((o, j) => optionButton(o, j, state.answers[i] === j ? 'selected' : '')).join('')}</div>
      <div class="row spread" style="margin-top:12px">
        <button class="btn secondary" id="prev" ${i === 0 ? 'disabled' : ''}>← Prev</button>
        <button class="btn ghost" id="clear">Clear</button>
        <button class="btn ghost" id="mark">${state.review[i] ? 'Unmark' : 'Mark for review'}</button>
        <button class="btn" id="next">${i === qs.length - 1 ? 'Finish' : 'Save & Next →'}</button>
      </div>
    </div>`;
    math(qBox);
    qBox.querySelectorAll('.option').forEach((b) => b.addEventListener('click', () => { state.answers[i] = +b.dataset.i; persist(); renderQ(); renderPal(); }));
    qBox.querySelector('#prev').addEventListener('click', () => { state.idx--; persist(); renderQ(); renderPal(); });
    qBox.querySelector('#next').addEventListener('click', () => { if (i === qs.length - 1) return confirmSubmit(); state.idx++; persist(); renderQ(); renderPal(); });
    qBox.querySelector('#clear').addEventListener('click', () => { state.answers[i] = null; persist(); renderQ(); renderPal(); });
    qBox.querySelector('#mark').addEventListener('click', () => { state.review[i] = !state.review[i]; persist(); renderQ(); renderPal(); });
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
