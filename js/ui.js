export const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
export const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Renders $...$ and $$...$$ with KaTeX when available; text is otherwise trusted markup from our own data files.
export function math(root) {
  if (window.renderMathInElement) {
    try {
      window.renderMathInElement(root, {
        delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }],
        throwOnError: false
      });
    } catch (e) { console.warn('katex', e); }
  }
}

let toastTimer;
export function toast(msg, ms = 2200) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.remove('hidden');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.add('hidden'), ms);
}

export function fmtTime(sec) {
  sec = Math.max(0, Math.round(sec));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return (h ? h + ':' : '') + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}
export function fmtDate(ts) { return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
export const LETTERS = ['A', 'B', 'C', 'D'];

export function optionButton(text, i, cls = '', disabled = false) {
  return `<button type="button" class="option ${cls}" data-i="${i}" ${disabled ? 'disabled' : ''}><span class="key">${LETTERS[i]}</span><span>${text}</span></button>`;
}
export function bar(pct, color) { return `<div class="progress"><span style="width:${Math.min(100, pct)}%;${color ? 'background:' + color : ''}"></span></div>`; }

// Small inline quiz: immediate feedback, calls onDone({done, correct}) at the end.
export function quiz(container, questions, { onDone, record } = {}) {
  let i = 0, correct = 0;
  const step = () => {
    if (i >= questions.length) { container.innerHTML = ''; onDone?.({ done: questions.length, correct }); return; }
    const q = questions[i];
    container.innerHTML = `<div class="muted" style="margin-bottom:6px">Q ${i + 1} of ${questions.length}</div>
      <div class="question">${q.q}</div>
      <div class="options">${q.options.map((o, j) => optionButton(o, j)).join('')}</div>
      <div class="exp"></div>
      <div class="row spread" style="margin-top:10px"><span class="muted">${correct} correct so far</span><button class="btn hidden next">${i === questions.length - 1 ? 'See result →' : 'Next →'}</button></div>`;
    math(container);
    container.querySelectorAll('.option').forEach((b) => b.addEventListener('click', () => {
      const j = +b.dataset.i, ok = j === q.answer;
      if (ok) correct++;
      record?.(q, ok);
      container.querySelectorAll('.option').forEach((x) => { x.disabled = true; const k = +x.dataset.i; if (k === q.answer) x.classList.add('correct'); else if (k === j) x.classList.add('wrong'); });
      const e = container.querySelector('.exp');
      e.innerHTML = `<div class="explain"><b>${ok ? 'Correct!' : 'Wrong.'} Answer: ${LETTERS[q.answer]}</b>${q.trick ? `<div class="trick">⚡ ${q.trick}</div>` : ''}${q.explanation ? (q.trick ? `<details ${ok ? '' : 'open'}><summary class="muted">Full working</summary><div>${q.explanation}</div></details>` : `<div>${q.explanation}</div>`) : ''}</div>${ok ? '' : reasonChips(q.id)}`;
      math(e); bindReasonChips(e);
      container.querySelector('.next').classList.remove('hidden');
    }));
    container.querySelector('.next').addEventListener('click', () => { i++; step(); window.scrollTo(0, 0); });
  };
  step();
}

// Mistake notebook: reason chips shown under a wrong answer.
export const REASONS = [['concept', 'Concept gap'], ['calculation', 'Calculation slip'], ['careless', 'Misread / careless'], ['time', 'Ran out of time']];
export function reasonChips(qid) {
  const cur = (window.__store?.attempt(qid) || {}).reason;
  return `<div class="reasons" data-q="${qid}" style="margin-top:8px"><span class="muted" style="font-size:.85rem">Why did I miss this? </span>${REASONS.map(([k, l]) => `<button type="button" class="btn small ${cur === k ? '' : 'ghost'}" data-r="${k}">${l}</button>`).join(' ')}</div>`;
}
export function bindReasonChips(root) {
  root.querySelectorAll('.reasons').forEach((box) => box.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
    window.__store?.setReason(box.dataset.q, b.dataset.r);
    box.querySelectorAll('button').forEach((x) => x.classList.toggle('ghost', x !== b));
  })));
}

export const FEEDBACK_URL = 'https://forms.gle/YW9CKJa22dX5C2ph8';
export function reportLink(id) { return `<a href="${FEEDBACK_URL}" target="_blank" rel="noopener" class="muted report" data-id="${id}" style="font-size:.78rem">⚠️ Report a mistake</a>`; }
export function bindReportLinks(root) { root.querySelectorAll('a.report').forEach((a) => a.addEventListener('click', () => { try { navigator.clipboard?.writeText(a.dataset.id); toast('Question ID copied — paste it in the form'); } catch {} })); }

// "Was this explanation clear?" — stored locally; unclear ids can be copied from Settings into the feedback form.
export function clarityButtons(id) {
  const cur = window.__store?.clarity(id) || 0;
  return `<span class="clarity" data-id="${id}" style="font-size:.8rem"><span class="muted">Explanation clear?</span> <button type="button" class="btn small ${cur === 1 ? '' : 'ghost'}" data-v="1" style="padding:2px 10px">👍</button> <button type="button" class="btn small ${cur === -1 ? '' : 'ghost'}" data-v="-1" style="padding:2px 10px">👎</button></span>`;
}
export function bindClarity(root) {
  root.querySelectorAll('.clarity').forEach((box) => box.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
    window.__store?.setClarity(box.dataset.id, +b.dataset.v);
    box.querySelectorAll('button').forEach((x) => x.classList.toggle('ghost', x !== b));
    if (+b.dataset.v === -1) toast('Thanks. Tell us what was unclear via "Report a mistake".');
  })));
}
