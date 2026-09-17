import { SUBJECTS, chapter, shuffle } from '../data.js';
import { store } from '../store.js';
import { el, esc, math, toast, optionButton, LETTERS, bar, reasonChips, bindReasonChips } from '../ui.js';

export default async function chapterView([subject, slug], query) {
  const ch = await chapter(subject, slug);
  const s = SUBJECTS.find((x) => x.id === subject);
  store.touchChapter(`${subject}/${slug}`);
  const qs = ch.questions;
  const stats = store.chapterStats(qs.map((q) => q.id));

  const node = el(`<div>
    <div class="breadcrumb"><a href="#/">Home</a> › <a href="#/subject/${subject}">${s.name}</a> › ${ch.puc === 1 ? '1st' : '2nd'} PUC</div>
    <h1>${esc(ch.title)}</h1>
    <div class="row muted"><span class="pill">~${ch.weight} questions in KCET</span><span>${qs.length} practice questions · ${stats.attempted} attempted · ${stats.correct} correct</span></div>
    <div class="tabs"><button data-t="notes" class="${query.tab !== 'practice' ? 'active' : ''}">Notes</button><button data-t="practice" class="${query.tab === 'practice' ? 'active' : ''}">Practice</button></div>
    <div id="notes" class="${query.tab === 'practice' ? 'hidden' : ''}"></div>
    <div id="practice" class="${query.tab !== 'practice' ? 'hidden' : ''}"></div>
  </div>`);

  // Notes
  const notes = node.querySelector('#notes');
  notes.innerHTML = ch.notes
    ? `${ch.kn ? '<div class="muted" style="margin-bottom:4px">ಕನ್ನಡ · <a href="#/settings">English</a></div>' : ''}<div class="card notes">${ch.notes}</div>${ch.kn && ch.notes_en ? `<details class="card"><summary>Show English notes</summary><div class="notes">${ch.notes_en}</div></details>` : ''}<button class="btn block" id="startP">Start practice (${qs.length} Qs)</button>`
    : `<div class="card empty">Notes for this chapter are not written yet.<br><span class="muted">Want to help? See Settings → Contribute.</span></div>`;
  math(notes);
  notes.querySelector('#startP')?.addEventListener('click', () => switchTab('practice'));

  // Practice
  const practice = node.querySelector('#practice');
  let order = qs.map((_, i) => i);
  let idx = 0;
  let session = { done: 0, correct: 0 };

  function renderPractice() {
    if (!qs.length) { practice.innerHTML = '<div class="card empty">No questions yet for this chapter.</div>'; return; }
    if (idx >= order.length) {
      practice.innerHTML = `<div class="card" style="text-align:center">
        <h2>Chapter done</h2><div class="score-big">${session.correct}/${session.done}</div>
        <p class="muted">${session.correct === session.done ? 'Perfect! Move to the next chapter.' : 'Review the wrong ones in Progress → Mistakes.'}</p>
        <div class="row" style="justify-content:center"><button class="btn" id="again">Practise again (shuffled)</button><a class="btn secondary" href="#/subject/${subject}">Back to chapters</a></div>
      </div>`;
      practice.querySelector('#again').addEventListener('click', () => { order = shuffle(order); idx = 0; session = { done: 0, correct: 0 }; renderPractice(); });
      return;
    }
    const q = qs[order[idx]];
    const prev = store.attempt(q.id);
    practice.innerHTML = `<div class="card">
      <div class="row spread muted" style="margin-bottom:8px">
        <span>Q ${idx + 1} of ${order.length} ${q.difficulty ? `<span class="pill ${q.difficulty}">${q.difficulty}</span>` : ''}</span>
        <span>${prev ? (prev.last ? '✅ got right before' : '❌ got wrong before') : ''} <button class="btn small ghost" id="bm">${store.isBookmarked(q.id) ? '★ Saved' : '☆ Save'}</button></span>
      </div>
      <div class="question">${q.q}</div>
      <div class="options">${q.options.map((o, i) => optionButton(o, i)).join('')}</div>
      <div id="exp"></div>
      <div class="row spread" style="margin-top:12px">
        <button class="btn secondary" id="skip">Skip</button>
        <button class="btn hidden" id="next">Next →</button>
      </div>
    </div>
    ${bar(100 * idx / order.length)}`;
    math(practice);
    practice.querySelector('#bm').addEventListener('click', (e) => { const on = store.toggleBookmark(q.id); e.target.textContent = on ? '★ Saved' : '☆ Save'; toast(on ? 'Saved to bookmarks' : 'Removed bookmark'); });
    practice.querySelector('#skip').addEventListener('click', () => { idx++; renderPractice(); });
    practice.querySelector('#next').addEventListener('click', () => { idx++; renderPractice(); });
    practice.querySelectorAll('.option').forEach((b) => b.addEventListener('click', () => {
      const i = +b.dataset.i; const ok = i === q.answer;
      store.recordAttempt(q.id, ok); session.done++; if (ok) session.correct++;
      practice.querySelectorAll('.option').forEach((x) => { x.disabled = true; const j = +x.dataset.i; if (j === q.answer) x.classList.add('correct'); else if (j === i) x.classList.add('wrong'); });
      const exp = practice.querySelector('#exp');
      exp.innerHTML = `<div class="explain"><b>${ok ? 'Correct!' : 'Wrong.'} Answer: ${LETTERS[q.answer]}</b>${q.explanation ? `<div>${q.explanation}</div>` : ''}${q.explanation_en ? `<details><summary class="muted">English</summary>${q.explanation_en}</details>` : ''}${q.tip ? `<div class="muted" style="margin-top:6px">💡 ${q.tip}</div>` : ''}</div>${ok ? '' : reasonChips(q.id)}`;
      math(exp); bindReasonChips(exp);
      practice.querySelector('#skip').classList.add('hidden');
      practice.querySelector('#next').classList.remove('hidden');
      practice.querySelector('#next').focus();
    }));
  }
  renderPractice();

  function switchTab(t) {
    node.querySelectorAll('.tabs button').forEach((x) => x.classList.toggle('active', x.dataset.t === t));
    notes.classList.toggle('hidden', t !== 'notes'); practice.classList.toggle('hidden', t !== 'practice');
    window.scrollTo(0, 0);
  }
  node.querySelectorAll('.tabs button').forEach((b) => b.addEventListener('click', () => switchTab(b.dataset.t)));
  return node;
}
