import { SUBJECTS, pyqIndex, pyqPaper, KCET } from '../data.js';
import { launchExam } from './tests.js';
import { el, esc, math, optionButton, LETTERS } from '../ui.js';

export default async function pyq([file]) {
  if (file) return browse(file);
  const idx = await pyqIndex();
  const years = [...new Set(idx.papers.map((p) => p.year))].sort((a, b) => b - a);
  const node = el(`<div>
    <h1>Past papers · ಹಳೆಯ ಪ್ರಶ್ನೆಪತ್ರಿಕೆ</h1>
    <p class="muted">Solve each KCET paper exactly as in the exam (${KCET.minutesPerSubject} min, ${KCET.questionsPerSubject} Qs) or browse with answers and explanations.</p>
    ${years.length ? years.map((y) => `<h2>KCET ${y}</h2><div class="grid three">${idx.papers.filter((p) => p.year === y).map((p) => `<div class="card">
        <b>${SUBJECTS.find((s) => s.id === p.subject)?.name || p.subject}</b>
        <div class="muted">${p.count} questions${p.code ? ' · code ' + esc(p.code) : ''}${p.note ? ' · ' + esc(p.note) : ''}</div>
        ${keyBadge(p)}
        <div class="row" style="margin-top:8px"><button class="btn small" data-test="${p.file}" data-title="KCET ${y} ${p.subject}">Attempt as test</button><a class="btn small secondary" href="#/pyq/${p.file}">Browse</a></div>
      </div>`).join('')}</div>`).join('')
      : `<div class="card empty">No previous-year papers added yet.<br><span class="muted">Official KCET question papers and answer keys are published free by KEA (Karnataka Examinations Authority) at <b>kea.kar.nic.in</b>. See Settings → Contribute to learn how to add them to this app.</span></div>`}
    ${idx.note ? `<p class="muted">${idx.note}</p>` : ''}
  </div>`);
  node.querySelectorAll('[data-test]').forEach((b) => b.addEventListener('click', () => launchExam({ title: b.dataset.title, pyq: b.dataset.test, minutes: KCET.minutesPerSubject })));
  return node;
}

async function browse(file) {
  const p = await pyqPaper(file);
  const node = el(`<div>
    <div class="breadcrumb"><a href="#/pyq">PYQ</a> › ${esc(p.title || file)}</div>
    <h1>${esc(p.title || file)}</h1>
    <p class="muted">${p.questions.length} questions. Tap an option to check. ${p.source ? 'Source: ' + esc(p.source) : ''}</p>
    <div id="list">${p.questions.map((q, i) => `<div class="card" data-i="${i}">
      <div class="muted">Q${q.n || i + 1}${q.chapter ? ' · ' + esc(q.chapter) : ''}${q.figure ? ' · <span class="pill warn">figure in original</span>' : ''}${q.disputed ? ' · <span class="pill warn" title="' + esc(q.note || '') + '">key disputed</span>' : ''}</div>
      <div class="question">${q.q}</div>
      <div class="options">${q.options.map((o, j) => optionButton(o, j)).join('')}</div>
      <div class="exp"></div>
    </div>`).join('')}</div>
  </div>`);
  math(node);
  node.querySelectorAll('.card[data-i]').forEach((card) => {
    const q = p.questions[+card.dataset.i];
    card.querySelectorAll('.option').forEach((b) => b.addEventListener('click', () => {
      const j = +b.dataset.i;
      const also = q.alsoCorrect || [];
      card.querySelectorAll('.option').forEach((x) => { x.disabled = true; const k = +x.dataset.i; if (k === q.answer || also.includes(k)) x.classList.add('correct'); else if (k === j) x.classList.add('wrong'); });
      const e = card.querySelector('.exp'); e.innerHTML = `<div class="explain"><b>Answer: ${LETTERS[q.answer]}${also.length ? ' (KEA also accepted ' + also.map((k) => LETTERS[k]).join(', ') + ')' : ''}${q.grace ? ' · KEA awarded grace marks (any answer counted)' : ''}</b>${q.explanation ? `<div>${q.explanation}</div>` : ''}${q.disputed ? `<div class="muted" style="margin-top:6px">⚠️ Official key is disputed: ${esc(q.note || '')}</div>` : ''}</div>`; math(e);
    }));
  });
  return node;
}

function keyBadge(p) {
  const fin = p.keyFinality || '';
  if (/^final$/.test(fin) && /official/.test(p.keyProvenance || '')) return '<div><span class="pill ok">KEA final key</span></div>';
  if (/revised/.test(fin)) return '<div><span class="pill ok">KEA key (revised applied)</span></div>';
  if (fin) return '<div><span class="pill warn" title="Answer key copy from a third-party archive; finality not confirmed">key: provisional copy</span></div>';
  return '';
}
