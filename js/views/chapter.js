import { SUBJECTS, chapter, shuffle, seededRandom, seededShuffle, concepts, board } from '../data.js';
import { store } from '../store.js';
import { launchExam } from './tests.js';
import { el, esc, math, toast, optionButton, LETTERS, bar, reasonChips, bindReasonChips, reportLink, bindReportLinks, quiz, clarityButtons, bindClarity } from '../ui.js';

export default async function chapterView([subject, slug], query) {
  const ch = await chapter(subject, slug);
  const s = SUBJECTS.find((x) => x.id === subject);
  store.touchChapter(`${subject}/${slug}`);
  const qs = ch.questions;
  const stats = store.chapterStats(qs.map((q) => q.id));
  // Deep link: ?q=<nnn> (1-based id suffix, e.g. 012) opens Practice at that question.
  const sharedQi = query.q ? qs.findIndex((q) => qNum(q.id) === parseInt(query.q, 10)) : -1;
  const tab = query.q ? 'practice' : query.tab;

  const node = el(`<div>
    <div class="breadcrumb"><a href="#/">Home</a> › <a href="#/subject/${subject}">${s.name}</a> › ${ch.puc === 1 ? '1st' : '2nd'} PUC</div>
    <h1>${esc(ch.title)}</h1>
    <div class="row muted"><span class="pill">~${ch.weight} questions in KCET</span><span>${qs.length} practice questions · ${stats.attempted} attempted · ${stats.correct} correct</span></div>
    <div class="tabs"><button data-t="notes" class="${tab !== 'practice' && tab !== 'board' ? 'active' : ''}">Notes</button><button data-t="practice" class="${tab === 'practice' ? 'active' : ''}">Practice</button>${ch.puc === 2 ? `<button data-t="board" class="${tab === 'board' ? 'active' : ''}">Board exam</button>` : ''}</div>
    <div id="notes" class="${tab === 'practice' || tab === 'board' ? 'hidden' : ''}"></div>
    <div id="practice" class="${tab !== 'practice' ? 'hidden' : ''}"></div>
    <div id="board" class="${tab !== 'board' ? 'hidden' : ''}"></div>
  </div>`);

  // Notes
  const notes = node.querySelector('#notes');
  const cdata = (await concepts(subject)).chapters?.[slug];
  const conceptsHtml = cdata && cdata.concepts?.length ? `<details class="card" ${stats.attempted ? '' : 'open'} style="border-left:5px solid var(--accent)">
      <summary style="cursor:pointer"><b>🎯 What KCET actually asks here</b> <span class="muted">· ${cdata.total} questions in 2009–2026</span></summary>
      <div style="margin-top:8px">${cdata.concepts.slice(0, 6).map((c) => { const pct = Math.round(100 * c.count / Math.max(1, cdata.concepts[0].count)); const last = c.years?.length ? c.years[c.years.length - 1] : ''; return `<div style="margin:8px 0"><div class="row spread"><span><b>${c.name}</b></span><span class="muted" style="white-space:nowrap">${c.count}× ${last ? '· last ' + last : ''}</span></div><div class="progress" style="height:6px;margin:3px 0"><span style="width:${pct}%;background:var(--accent)"></span></div><div class="muted" style="font-size:.85rem">${c.master || ''}</div></div>`; }).join('')}</div>
    </details>` : '';
  const qkey = `${subject}/${slug}`; const qc = store.quickCheck(qkey);
  const fresh = !qc && stats.attempted < 8 && qs.length >= 8;
  const quickHtml = fresh ? `<div class="card" id="quick" style="border-color:var(--primary)">
      <div class="kicker">Quick check · 2 minutes</div>
      <h2 style="margin:4px 0 6px">Do you already know this chapter?</h2>
      <p class="muted">Answer 5 questions. Score 4 or more and you can skip the notes and go straight to practice.</p>
      <div class="row"><button class="btn" id="qcStart">Start quick check</button><button class="btn secondary" id="qcSkip">Read notes first</button></div>
      <div id="qcBox" style="margin-top:10px"></div>
    </div>` : qc ? `<div class="card" style="background:${qc.score >= 4 ? 'var(--ok-bg)' : 'var(--warn-bg)'}"><b>Quick check: ${qc.score}/${qc.of}.</b> <span class="muted">${qc.score >= 4 ? 'You know the basics — go to Practice; use the notes only for revision.' : 'Read the notes below first, then practise.'}</span></div>` : '';
  notes.innerHTML = quickHtml + conceptsHtml + (ch.notes
    ? `<div class="card notes">${ch.notes}</div>${ch.kn && ch.notes_en ? `<details class="card"><summary>Show English notes</summary><div class="notes">${ch.notes_en}</div></details>` : ''}<div class="row"><button class="btn" id="startP" style="flex:1">Start practice (${qs.length} Qs)</button><a class="btn secondary" href="#/flashcards/${subject}/${slug}">Flashcards</a><a class="btn ghost" href="#/flashcards/${subject}/${slug}?mode=questions">Revise as cards</a><a class="btn ghost" href="#/sheet/${subject}/${slug}">🖨 Formula sheet</a></div>
      ${qs.length >= 20 ? `<div class="card" style="margin-top:10px"><div class="row spread" style="align-items:center"><span><b>⏱ Timed chapter test</b><div class="muted">20 questions · 25 minutes · exam conditions, answers at the end</div></span><button class="btn small" id="timedTest">Start</button></div></div>` : ''}`
    : `<div class="card empty">Notes for this chapter are not written yet.<br><span class="muted">Want to help? See Settings → Contribute.</span></div>`);
  math(notes);
  if (fresh) {
    const notesCard = notes.querySelector('.notes')?.parentElement === notes ? notes.querySelector('.notes') : null;
    notes.querySelector('#qcSkip').addEventListener('click', () => { notes.querySelector('#quick').remove(); });
    notes.querySelector('#qcStart').addEventListener('click', (e) => {
      e.target.disabled = true; notes.querySelector('#qcSkip').classList.add('hidden');
      const rnd = seededRandom(parseInt(store.today().replace(/-/g, ''), 10) + slug.length);
      const five = seededShuffle(qs.filter((q) => q.difficulty !== 'hard'), rnd).slice(0, 5);
      quiz(notes.querySelector('#qcBox'), five, { record: (q, ok) => store.recordAttempt(q.id, ok), onDone: (r) => {
        store.setQuickCheck(qkey, { score: r.correct, of: r.done });
        const box = notes.querySelector('#qcBox');
        box.innerHTML = r.correct >= 4 ? `<div class="explain"><b>${r.correct}/${r.done} — you know this chapter!</b> Skip the notes and go to practice. <div style="margin-top:8px"><button class="btn" id="qcGo">Go to practice →</button></div></div>` : `<div class="explain"><b>${r.correct}/${r.done}.</b> Read the notes below, then practise. Most students need this — no shame in it.</div>`;
        box.querySelector('#qcGo')?.addEventListener('click', () => switchTab('practice'));
      } });
    });
  }
  notes.querySelector('#startP')?.addEventListener('click', () => switchTab('practice'));
  notes.querySelector('#timedTest')?.addEventListener('click', () => launchExam({ title: `${ch.title} — timed test`, chapter: { subject, slug }, subjects: [subject], count: 20, minutes: 25 }));

  // Practice
  const practice = node.querySelector('#practice');
  let order = qs.map((_, i) => i);
  let idx = 0;
  let session = { done: 0, correct: 0, run: 0 };
  let shared = query.q != null; // show the "Shared question" line until dismissed
  if (sharedQi >= 0) idx = Math.max(0, order.indexOf(sharedQi));

  function renderPractice() {
    if (!qs.length) { practice.innerHTML = '<div class="card empty">No questions yet for this chapter.</div>'; return; }
    if (idx >= order.length) {
      practice.innerHTML = `<div class="card" style="text-align:center">
        <h2>Chapter done</h2><div class="score-big">${session.correct}/${session.done}</div>
        <p class="muted">${session.correct === session.done ? 'Perfect! Move to the next chapter.' : 'Review the wrong ones in Progress → Mistakes.'}</p>
        <div class="row" style="justify-content:center"><button class="btn" id="again">Practise again (shuffled)</button><a class="btn secondary" href="#/subject/${subject}">Back to chapters</a></div>
      </div>`;
      practice.querySelector('#again').addEventListener('click', () => { order = shuffle(order); idx = 0; shared = false; session = { done: 0, correct: 0 }; renderPractice(); });
      return;
    }
    const q = qs[order[idx]];
    const prev = store.attempt(q.id);
    store.setLast({ type: 'chapter', href: `#/chapter/${subject}/${slug}?tab=practice`, title: ch.title, sub: `${s.name} · question ${idx + 1} of ${order.length}` });
    practice.innerHTML = `${shared ? `<div class="row spread muted" id="sharedLine" style="font-size:.85rem;margin-bottom:6px;align-items:center">
        <span>Shared question · ${esc(ch.title)} · <a href="#" id="fromStart">Start chapter from the beginning</a></span>
        <button class="btn small ghost" id="sharedX" aria-label="Dismiss">✕</button>
      </div>` : ''}<div class="card">
      <div class="row spread muted" style="margin-bottom:8px">
        <span>Q ${idx + 1} of ${order.length} ${q.difficulty ? `<span class="pill ${q.difficulty}">${q.difficulty}</span>` : ''}</span>
        <span>${prev ? (prev.last ? '✅ got right before' : '❌ got wrong before') : ''} <button class="btn small ghost" id="bm">${store.isBookmarked(q.id) ? '★ Saved' : '☆ Save'}</button> <button class="btn small ghost" id="share">↗ Share</button></span>
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
    practice.querySelector('#share').addEventListener('click', () => shareQuestion(q));
    practice.querySelector('#sharedX')?.addEventListener('click', () => { shared = false; practice.querySelector('#sharedLine').remove(); });
    practice.querySelector('#fromStart')?.addEventListener('click', (e) => { e.preventDefault(); shared = false; idx = 0; session = { done: 0, correct: 0, run: 0 }; renderPractice(); window.scrollTo(0, 0); });
    practice.querySelector('#skip').addEventListener('click', () => { idx++; renderPractice(); });
    practice.querySelector('#next').addEventListener('click', () => { idx++; renderPractice(); });
    practice.querySelectorAll('.option').forEach((b) => b.addEventListener('click', () => {
      const i = +b.dataset.i; const ok = i === q.answer;
      store.recordAttempt(q.id, ok); session.done++;
      if (session.done === 15 && (store.completePlanTask(`ch-${subject}-${slug}`) || store.completePlanTask(`rev-${subject}-${slug}`))) toast('✅ Today\'s plan task done!'); if (ok) { session.correct++; session.run++; if (session.run === 3 || session.run === 5 || session.run % 10 === 0) pop(`🔥 ${session.run} in a row!`); } else session.run = 0;
      practice.querySelectorAll('.option').forEach((x) => { x.disabled = true; const j = +x.dataset.i; if (j === q.answer) x.classList.add('correct'); else if (j === i) x.classList.add('wrong'); });
      const exp = practice.querySelector('#exp');
      exp.innerHTML = `<div class="explain"><b>${ok ? 'Correct!' : 'Wrong.'} Answer: ${LETTERS[q.answer]}</b>${q.trick ? `<div class="trick">⚡ ${q.trick}</div>` : ''}${q.explanation ? (q.trick ? `<details ${ok ? '' : 'open'}><summary class="muted">Full working</summary><div>${q.explanation}</div></details>` : `<div>${q.explanation}</div>`) : ''}${q.explanation_en ? `<details><summary class="muted">English</summary>${q.explanation_en}</details>` : ''}${q.tip ? `<div class="muted" style="margin-top:6px">💡 ${q.tip}</div>` : ''}</div>${ok ? '' : reasonChips(q.id)}<div class="row spread" style="margin-top:6px">${clarityButtons(q.id)}${reportLink(q.id)}</div>`;
      math(exp); bindReasonChips(exp); bindReportLinks(exp); bindClarity(exp);
      practice.querySelector('#skip').classList.add('hidden');
      practice.querySelector('#next').classList.remove('hidden');
      practice.querySelector('#next').focus();
    }));
  }
  renderPractice();

  async function shareQuestion(q) {
    const nnn = q.id.split('-').pop();
    const url = `${location.origin}${location.pathname}#/chapter/${subject}/${slug}?tab=practice&q=${nnn}`;
    if (navigator.share) {
      try { await navigator.share({ title: ch.title, text: 'Try this KCET question: ' + plainText(q.q), url }); } catch {} // user cancelled
      return;
    }
    try { await navigator.clipboard.writeText(url); toast('Link copied'); } catch { toast('Could not copy link'); }
  }

  // Board exam tab (2nd PUC chapters): what the Karnataka PU board paper asks from this chapter
  const boardBox = node.querySelector('#board'); let boardLoaded = false;
  async function renderBoard() {
    if (boardLoaded) return; boardLoaded = true;
    boardBox.innerHTML = '<div class="loading"><div class="spin"></div>Loading…</div>';
    const b = await board(subject, slug);
    if (!b) { boardBox.innerHTML = '<div class="card empty">Board-exam questions for this chapter are coming soon.</div>'; return; }
    const groups = [1, 2, 3, 5].map((m) => [m, b.questions.filter((q) => q.marks === m)]).filter(([, qs]) => qs.length);
    const freqPill = (f) => f === 'very often' ? '<span class="pill bad">asked very often</span>' : f === 'often' ? '<span class="pill warn">asked often</span>' : '<span class="pill">sometimes</span>';
    boardBox.innerHTML = `
      <div class="card" style="border-left:5px solid var(--math)"><div class="kicker">2nd PUC board exam · why it matters</div>
        <p style="margin:6px 0">Your KCET rank is <b>50% board marks + 50% CET marks</b>. These are the questions this chapter keeps giving in the Karnataka board paper, with model answers written the way examiners award marks.</p>
        <p class="muted" style="margin:0">${b.pattern || ''}</p></div>
      <div class="card" style="border-left:5px solid var(--warn-text, #b45309)"><div class="kicker">Please read before you use this</div>
        <ul style="margin:6px 0 0;padding-left:18px">
          <li><b>For practice only.</b> These are not official board questions or answers. They may contain mistakes.</li>
          <li><b>Model answers are for remembering the key points.</b> In the real exam, write answers in your own words with the steps, diagrams and units your teacher taught. The exact answer expected by the examiner may differ.</li>
          <li>Follow your textbook and teacher first. Use this to check you have not missed a point.</li>
        </ul></div>
      ${groups.map(([m, qs]) => `<h2>${m}-mark questions <span class="muted" style="font-weight:400;font-size:.9rem">· ${qs.length}</span></h2>
        ${qs.map((q, i) => `<div class="card">
          <div class="row spread" style="align-items:flex-start"><div class="question" style="margin-bottom:6px">${q.q}</div>${freqPill(q.frequency)}</div>
          <div class="muted" style="font-size:.85rem">${q.type}${q.keywords?.length ? ' · examiner looks for: ' + q.keywords.map(esc).join(', ') : ''}</div>
          <details style="margin-top:8px"><summary class="btn small secondary" style="display:inline-flex">Show model answer</summary><div class="explain">${q.answer}</div></details>
        </div>`).join('')}`).join('')}
      <p class="muted">Written in the Karnataka PU pattern by teachers with AI assistance, for practice only. Not official KEA or PU Board material. Found an error? Use the feedback form in Settings.</p>`;
    math(boardBox);
  }
  if (tab === 'board') renderBoard();

  function switchTab(t) {
    node.querySelectorAll('.tabs button').forEach((x) => x.classList.toggle('active', x.dataset.t === t));
    notes.classList.toggle('hidden', t !== 'notes'); practice.classList.toggle('hidden', t !== 'practice'); boardBox.classList.toggle('hidden', t !== 'board');
    if (t === 'board') renderBoard();
    window.scrollTo(0, 0);
  }
  node.querySelectorAll('.tabs button').forEach((b) => b.addEventListener('click', () => switchTab(b.dataset.t)));
  return node;
}

// Question number from an id like "che-solutions-012" → 12.
function qNum(id) { return parseInt(String(id).split('-').pop(), 10); }

// Question text without HTML tags or KaTeX $ delimiters, for share messages.
function plainText(html) {
  const d = document.createElement('div'); d.innerHTML = html;
  const t = d.textContent.replace(/\$/g, '').replace(/\s+/g, ' ').trim();
  return t.length > 200 ? t.slice(0, 197) + '…' : t;
}

function pop(text) { const d = document.createElement('div'); d.className = 'streak-pop'; d.textContent = text; document.body.appendChild(d); setTimeout(() => d.remove(), 950); }
