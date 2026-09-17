import { SUBJECTS, PFX, syllabus, pyqWeights } from '../data.js';
import { store } from '../store.js';
import { el, esc, bar } from '../ui.js';

export default async function subject([id]) {
  const s = SUBJECTS.find((x) => x.id === id);
  if (!s) throw new Error('Unknown subject');
  const syl = await syllabus();
  const chapters = syl[id];
  const pw = await pyqWeights(); const pys = pw.years.slice(0, 5); const hasPyq = pys.length > 0;

  const list = (puc) => chapters.filter((c) => c.puc === puc).map((c) => {
    const st = c.count ? store.prefixStats(`${PFX[id]}-${c.slug}-`, c.count) : null;
    const pct = st ? Math.round(100 * Math.min(st.attempted, st.total) / st.total) : 0;
    const acc = st && st.attempted ? Math.round(100 * st.correct / st.attempted) : null;
    return `<a class="card link" href="#/chapter/${id}/${c.slug}">
      <div class="row spread"><b>${esc(c.title)}</b><span class="pill" title="${hasPyq ? 'Questions in KCET ' + pys.join(', ') : 'Typical questions in KCET'}">${hasPyq && pw[id][c.slug] ? pys.map((y) => pw[id][c.slug][y] || 0).join('·') + ' Q' : '~' + c.weight + ' Q'}</span></div>
      ${st ? `<div class="row spread muted" style="margin:6px 0 4px"><span>${st.total} questions · ${st.attempted} done</span>${acc !== null ? `<span class="pill ${acc >= 70 ? 'ok' : acc >= 40 ? 'warn' : 'bad'}">${acc}% correct</span>` : ''}</div>${bar(pct)}`
           : `<div class="muted" style="margin-top:4px">Notes & questions coming soon</div>`}
    </a>`;
  }).join('');

  const node = el(`<div>
    <div class="breadcrumb"><a href="#/">Home</a> › ${s.name}</div>
    <div class="row spread"><h1>${s.name}</h1><a class="btn small" href="#/tests?subject=${id}">Subject test</a></div>
    ${hasPyq ? `<div class="muted" style="margin-bottom:6px">Pills show questions asked in KCET ${pys.join(' · ')} (from real papers).</div>` : ''}
    <div class="tabs"><button class="active" data-puc="1">1st PUC</button><button data-puc="2">2nd PUC</button></div>
    <div id="l1">${list(1)}</div>
    <div id="l2" class="hidden">${list(2)}</div>
  </div>`);
  node.querySelectorAll('.tabs button').forEach((b) => b.addEventListener('click', () => {
    node.querySelectorAll('.tabs button').forEach((x) => x.classList.toggle('active', x === b));
    node.querySelector('#l1').classList.toggle('hidden', b.dataset.puc !== '1');
    node.querySelector('#l2').classList.toggle('hidden', b.dataset.puc !== '2');
  }));
  return node;
}
