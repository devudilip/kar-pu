import { pyqIndex, getChapterPyq } from '../data.js';
import { store } from '../store.js';
import { launchExam } from './tests.js';
import { esc, math, toast, optionButton, LETTERS, bar, reasonChips, bindReasonChips, reportLink, bindReportLinks } from '../ui.js';

const PAGE = 15;

// "Past KCET" tab on the chapter page: every real KCET question tagged with this chapter, newest year first.
// This is the chapter-wise solved-papers book every KCET student buys, built from the same KEA papers and keys.
export async function renderChapterPyq(box, { subject, slug, title }) {
  box.innerHTML = '<div class="loading"><div class="spin"></div>Loading…</div>';
  const [c, idx] = await Promise.all([getChapterPyq(subject, slug), pyqIndex().catch(() => null)]);
  if (!c) throw new Error('could not load data/pyq/chapters/' + subject + '/' + slug);
  if (!c.questions.length) { box.innerHTML = '<div class="card empty">No past KCET questions are tagged with this chapter yet.</div>'; return; }
  const qs = c.questions;
  const allYears = idx ? [...new Set(idx.papers.map((p) => p.year))].sort() : c.years.slice().sort();
  const from = allYears[0], to = allYears[allYears.length - 1];
  const perYear = (qs.length / Math.max(1, allYears.length)).toFixed(1).replace(/\.0$/, '');
  let filter = 'all', shown = PAGE;

  const stats = () => { let a = 0, ok = 0; for (const q of qs) { const t = store.attempt(q.id); if (t) { a++; if (t.last) ok++; } } return { a, ok }; };
  const testMins = (n) => Math.max(5, Math.ceil(n * 80 / 60)); // KCET pace: 80 minutes for 60 questions

  function head() {
    const s = stats();
    return `<div class="card" style="border-left:5px solid var(--accent)">
      <div class="kicker">Real KCET questions · ${from}–${to}</div>
      <p style="margin:6px 0">KCET asked <b>${qs.length} questions</b> from this chapter in ${allYears.length} years — about <b>${perYear} a year</b>. KCET repeats the same ideas, numbers and even options. After the notes and practice, solve every one of these.</p>
      <div class="muted">${s.a} of ${qs.length} done · ${s.ok} correct${s.a ? ` (${Math.round(100 * s.ok / s.a)}%)` : ''}</div>
      ${bar(100 * s.a / qs.length, 'var(--accent)')}
      <div class="row" style="margin-top:10px">${qs.length > 20 ? `<button class="btn" data-n="20">⏱ Latest 20 as a timed test</button>` : ''}<button class="btn ${qs.length > 20 ? 'secondary' : ''}" data-n="0">⏱ All ${qs.length} as a timed test (${testMins(qs.length)} min)</button></div>
      <p class="muted" style="margin:8px 0 0;font-size:.85rem">Answers follow the official KEA key. Questions that are out of the current syllabus are left out. "Figure in original" means the paper had a diagram we describe in words.</p>
    </div>
    <div class="tabs" id="pf"><button data-f="all" class="${filter === 'all' ? 'active' : ''}">All</button><button data-f="new" class="${filter === 'new' ? 'active' : ''}">Not done</button><button data-f="wrong" class="${filter === 'wrong' ? 'active' : ''}">Got wrong</button></div>`;
  }

  function card(q) {
    const prev = store.attempt(q.id);
    const pills = [q.figure ? '<span class="pill warn">figure in original</span>' : '', q.disputed ? `<span class="pill warn" title="${esc(q.note || '')}">key disputed</span>` : '', q.grace ? '<span class="pill">grace mark</span>' : ''].filter(Boolean).join(' ');
    return `<div class="card" data-id="${q.id}">
      <div class="row spread muted" style="margin-bottom:6px"><span><b>KCET ${q.year}</b> · Q${q.n} ${pills}</span><span>${prev ? (prev.last ? '✅' : '❌') : ''} <button class="btn small ghost bm">${store.isBookmarked(q.id) ? '★ Saved' : '☆ Save'}</button></span></div>
      <div class="question">${q.q}</div>
      <div class="options">${q.options.map((o, j) => optionButton(o, j)).join('')}</div>
      <div class="exp"></div>
    </div>`;
  }

  function list() {
    const pick = qs.filter((q) => { const a = store.attempt(q.id); return filter === 'all' ? true : filter === 'new' ? !a : a && a.last === 0; });
    const page = pick.slice(0, shown);
    return (page.map(card).join('') || `<div class="empty">${filter === 'wrong' ? 'No wrong answers here. 👏' : 'All done. 👏'}</div>`)
      + (pick.length > shown ? `<button class="btn secondary block" id="more">Show more (${pick.length - shown} left)</button>` : '');
  }

  function render() {
    box.innerHTML = head() + `<div id="plist">${list()}</div>`;
    math(box); bind();
  }

  function bind() {
    box.querySelectorAll('[data-n]').forEach((b) => b.addEventListener('click', () => {
      const n = +b.dataset.n || qs.length;
      launchExam({ title: `${title} — KCET ${n === qs.length ? 'all past' : 'latest ' + n} questions`, pyqChapter: { subject, slug }, count: +b.dataset.n || 0, minutes: testMins(n) });
    }));
    box.querySelectorAll('#pf button').forEach((b) => b.addEventListener('click', () => { filter = b.dataset.f; shown = PAGE; render(); }));
    box.querySelector('#more')?.addEventListener('click', () => { shown += PAGE; const l = box.querySelector('#plist'); l.innerHTML = list(); math(l); bind(); });
    box.querySelectorAll('#plist .card[data-id]').forEach((el) => {
      const q = qs.find((x) => x.id === el.dataset.id);
      el.querySelector('.bm').addEventListener('click', (e) => { const on = store.toggleBookmark(q.id); e.target.textContent = on ? '★ Saved' : '☆ Save'; toast(on ? 'Saved to bookmarks' : 'Removed bookmark'); });
      el.querySelectorAll('.option').forEach((b) => b.addEventListener('click', () => {
        const j = +b.dataset.i, also = q.alsoCorrect || [];
        const ok = j === q.answer || also.includes(j); // grace marks scored any answer in the exam, but practice checks the key
        store.recordAttempt(q.id, ok);
        el.querySelectorAll('.option').forEach((x) => { x.disabled = true; const k = +x.dataset.i; if (k === q.answer || also.includes(k)) x.classList.add('correct'); else if (k === j) x.classList.add('wrong'); });
        const e = el.querySelector('.exp');
        e.innerHTML = `<div class="explain"><b>${ok ? 'Correct!' : 'Wrong.'} Answer: ${LETTERS[q.answer]}${also.length ? ' (KEA also accepted ' + also.map((k) => LETTERS[k]).join(', ') + ')' : ''}${q.grace ? ' · KEA gave grace marks for this question' : ''}</b>${q.explanation ? `<div>${q.explanation}</div>` : ''}${q.disputed ? `<div class="muted" style="margin-top:6px">⚠️ Official key is disputed: ${esc(q.note || '')}</div>` : ''}</div>${ok ? '' : reasonChips(q.id)}<div style="margin-top:6px">${reportLink(q.file + ' Q' + q.n)}</div>`;
        math(e); bindReasonChips(e); bindReportLinks(e);
      }));
    });
  }

  render();
}
