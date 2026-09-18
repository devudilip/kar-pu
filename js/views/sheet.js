import { SUBJECTS, chapter, flashcards } from '../data.js';
import { el, esc, math } from '../ui.js';

// #/sheet/<subject>/<slug> -> printable one-page formula sheet for a chapter
export default async function sheet([subject, slug]) {
  ensureCss();
  const ch = await chapter(subject, slug);
  const s = SUBJECTS.find((x) => x.id === subject);
  const fc = await flashcards(subject);
  const deck = fc.chapters?.find((c) => c.slug === slug);
  const cards = deck?.cards || [];
  const perYear = ch.pyqAvg ?? ch.weight ?? null;

  const rows = cards.map((c) => `<tr><td>${c.f}</td><td>${c.b}</td></tr>`).join('');
  const mustRemember = cards.length
    ? `<h2>Must-remember</h2>
       <table class="sheet-table">
         <thead><tr><th>Ask</th><th>Answer</th></tr></thead>
         <tbody>${rows}</tbody>
       </table>`
    : '';

  const node = el(`<div class="sheet-page">
    <div class="no-print sheet-toolbar">
      <button class="btn" id="printBtn">🖨️ Print / Save as PDF</button>
      <a class="btn secondary" href="#/chapter/${subject}/${slug}">← Back to chapter</a>
      <span class="muted sheet-tip">On a phone choose Print → Save as PDF, then share it on WhatsApp.</span>
    </div>
    <div class="sheet-header">
      <h1>${esc(ch.title)}</h1>
      <div class="row sheet-meta muted">
        <span class="pill">${s ? esc(s.name) : esc(subject)}</span>
        <span class="pill">${ch.puc === 1 ? '1st' : '2nd'} PUC</span>
        ${perYear ? `<span class="pill">KCET asks about ${perYear} question${perYear == 1 ? '' : 's'} a year</span>` : ''}
      </div>
    </div>
    <div class="sheet-notes">${ch.notes || '<p class="muted">Notes for this chapter are not written yet.</p>'}</div>
    ${mustRemember}
    <div class="sheet-footer muted">pu.sirigannada.in · free KCET practice</div>
  </div>`);

  node.querySelector('#printBtn').addEventListener('click', () => window.print());
  math(node);
  return node;
}

function ensureCss() {
  if (!document.head.querySelector('link[href="css/sheet.css"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'css/sheet.css';
    document.head.appendChild(link);
  }
}
