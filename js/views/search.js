// Search: chapters (from the syllabus) and "what KCET actually asks" concepts (data/concepts/<subject>.json).
// Route: #/search?q=...   Also exports searchBox()/bindSearchBox() so other pages (e.g. home) can embed the box.
import { SUBJECTS, syllabus, concepts } from '../data.js';
import { el, esc, math } from '../ui.js';

const SUBJECT_NAME = Object.fromEntries(SUBJECTS.map((s) => [s.id, s.name]));
const POPULAR = ['Current Electricity', 'Integrals', 'Ray Optics', 'pH', 'Probability', 'Vectors'];

// Common words students type that do not appear in chapter titles -> 'subject/slug' targets.
export const SYNONYMS = {
  ohm: ['physics/current-electricity'], resistance: ['physics/current-electricity'], resistor: ['physics/current-electricity'],
  kirchhoff: ['physics/current-electricity'], wheatstone: ['physics/current-electricity'], potentiometer: ['physics/current-electricity'], 'drift velocity': ['physics/current-electricity'],
  lens: ['physics/ray-optics'], lenses: ['physics/ray-optics'], mirror: ['physics/ray-optics'], prism: ['physics/ray-optics'], refraction: ['physics/ray-optics'], 'total internal reflection': ['physics/ray-optics'], telescope: ['physics/ray-optics'], microscope: ['physics/ray-optics'],
  interference: ['physics/wave-optics'], diffraction: ['physics/wave-optics'], ydse: ['physics/wave-optics'], polarisation: ['physics/wave-optics'], polarization: ['physics/wave-optics'],
  doppler: ['physics/waves'], 'beats': ['physics/waves'], shm: ['physics/oscillations'], pendulum: ['physics/oscillations'],
  capacitor: ['physics/electrostatic-potential-and-capacitance'], capacitance: ['physics/electrostatic-potential-and-capacitance'],
  coulomb: ['physics/electric-charges-and-fields'], gauss: ['physics/electric-charges-and-fields'],
  diode: ['physics/semiconductor-electronics'], transistor: ['physics/semiconductor-electronics'], 'logic gate': ['physics/semiconductor-electronics'], 'logic gates': ['physics/semiconductor-electronics'],
  photoelectric: ['physics/dual-nature-of-radiation-and-matter'], 'de broglie': ['physics/dual-nature-of-radiation-and-matter'],
  bohr: ['physics/atoms'], radioactivity: ['physics/nuclei'], 'half life': ['physics/nuclei'], 'binding energy': ['physics/nuclei'],
  faraday: ['physics/electromagnetic-induction', 'chemistry/electrochemistry'], lenz: ['physics/electromagnetic-induction'], inductance: ['physics/electromagnetic-induction'],
  lcr: ['physics/alternating-current'], transformer: ['physics/alternating-current'], 'biot savart': ['physics/moving-charges-and-magnetism'], cyclotron: ['physics/moving-charges-and-magnetism'],
  projectile: ['physics/motion-in-a-plane'], friction: ['physics/laws-of-motion'], torque: ['physics/system-of-particles-rotational-motion'], 'moment of inertia': ['physics/system-of-particles-rotational-motion'],
  satellite: ['physics/gravitation'], 'escape velocity': ['physics/gravitation'], 'young modulus': ['physics/mechanical-properties-of-solids'], bernoulli: ['physics/mechanical-properties-of-fluids'], viscosity: ['physics/mechanical-properties-of-fluids'],
  ph: ['chemistry/equilibrium'], buffer: ['chemistry/equilibrium'], 'le chatelier': ['chemistry/equilibrium'], ksp: ['chemistry/equilibrium'], solubility: ['chemistry/equilibrium'],
  mole: ['chemistry/some-basic-concepts'], moles: ['chemistry/some-basic-concepts'], stoichiometry: ['chemistry/some-basic-concepts'], molarity: ['chemistry/some-basic-concepts', 'chemistry/solutions'],
  nernst: ['chemistry/electrochemistry'], 'cell potential': ['chemistry/electrochemistry'], conductance: ['chemistry/electrochemistry'],
  'rate constant': ['chemistry/chemical-kinetics'], 'order of reaction': ['chemistry/chemical-kinetics'], arrhenius: ['chemistry/chemical-kinetics'],
  raoult: ['chemistry/solutions'], colligative: ['chemistry/solutions'], osmotic: ['chemistry/solutions'],
  hybridisation: ['chemistry/chemical-bonding'], hybridization: ['chemistry/chemical-bonding'], vsepr: ['chemistry/chemical-bonding'], 'bond order': ['chemistry/chemical-bonding'],
  'quantum numbers': ['chemistry/structure-of-atom'], 'oxidation number': ['chemistry/redox-reactions'], 'oxidation state': ['chemistry/redox-reactions'],
  enthalpy: ['chemistry/thermodynamics'], entropy: ['chemistry/thermodynamics'], 'gibbs': ['chemistry/thermodynamics'],
  'sn1': ['chemistry/haloalkanes-and-haloarenes'], 'sn2': ['chemistry/haloalkanes-and-haloarenes'], iupac: ['chemistry/organic-basic-principles'],
  aldol: ['chemistry/aldehydes-ketones-carboxylic-acids'], cannizzaro: ['chemistry/aldehydes-ketones-carboxylic-acids'],
  ligand: ['chemistry/coordination-compounds'], 'crystal field': ['chemistry/coordination-compounds'], lanthanoids: ['chemistry/d-and-f-block'], 'transition elements': ['chemistry/d-and-f-block'],
  'periodic table': ['chemistry/classification-and-periodicity'], carbohydrates: ['chemistry/biomolecules'], proteins: ['chemistry/biomolecules'], vitamins: ['chemistry/biomolecules'],
  integration: ['maths/integrals'], integral: ['maths/integrals'], antiderivative: ['maths/integrals'], 'area under curve': ['maths/application-of-integrals'],
  differentiation: ['maths/continuity-and-differentiability'], derivative: ['maths/continuity-and-differentiability', 'maths/limits-and-derivatives'], derivatives: ['maths/continuity-and-differentiability', 'maths/limits-and-derivatives'],
  'maxima': ['maths/application-of-derivatives'], 'minima': ['maths/application-of-derivatives'], tangent: ['maths/application-of-derivatives'],
  vector: ['maths/vector-algebra'], vectors: ['maths/vector-algebra'], 'dot product': ['maths/vector-algebra'], 'cross product': ['maths/vector-algebra'],
  probability: ['maths/probability-1', 'maths/probability-2'], bayes: ['maths/probability-2'], 'conditional probability': ['maths/probability-2'], 'binomial distribution': ['maths/probability-2'],
  matrix: ['maths/matrices'], determinant: ['maths/determinants'], ellipse: ['maths/conic-sections'], parabola: ['maths/conic-sections'], hyperbola: ['maths/conic-sections'], circle: ['maths/conic-sections'],
  lpp: ['maths/linear-programming'], 'ap gp': ['maths/sequences-and-series'], progression: ['maths/sequences-and-series'], ncr: ['maths/permutations-and-combinations'], npr: ['maths/permutations-and-combinations'],
  'complex number': ['maths/complex-numbers-quadratic-equations'], quadratic: ['maths/complex-numbers-quadratic-equations'], mean: ['maths/statistics'], variance: ['maths/statistics'],
  'inverse trig': ['maths/inverse-trigonometric-functions'], 'ode': ['maths/differential-equations'], 'direction cosines': ['maths/three-d-geometry'], '3d': ['maths/three-d-geometry', 'maths/three-d-geometry-intro']
};

export const norm = (s) => String(s ?? '').toLowerCase().replace(/\$[^$]*\$/g, (m) => m.replace(/[\\{}^_$]/g, ' ')).replace(/[^a-z0-9]+/g, ' ').trim();
const words = (s) => (s ? s.split(' ') : []);

export function searchIndexFrom(syl, conceptsBySubject = {}) {
  const out = [];
  for (const subject of Object.keys(syl || {})) {
    for (const c of syl[subject] || []) {
      const href = `#/chapter/${subject}/${c.slug}`;
      out.push({ type: 'chapter', subject, slug: c.slug, title: c.title, text: `${SUBJECT_NAME[subject] || subject} ${c.puc ? 'PUC ' + c.puc : ''}`.trim(), href, puc: c.puc || 0, chapterTitle: c.title, count: 0 });
      const cd = conceptsBySubject?.[subject]?.chapters?.[c.slug];
      for (const k of cd?.concepts || []) {
        out.push({ type: 'concept', subject, slug: c.slug, title: k.name, text: k.master || '', href, puc: c.puc || 0, chapterTitle: c.title, count: k.count || 0 });
      }
    }
  }
  return out;
}

// Which 'subject/slug' chapters the query points at through SYNONYMS (single words or phrases).
export function synonymTargets(query) {
  const q = norm(query); const qw = words(q); const hit = new Set();
  if (!q) return hit;
  const padded = ` ${q} `;
  for (const [key, targets] of Object.entries(SYNONYMS)) {
    const k = norm(key);
    const match = k.includes(' ') ? padded.includes(` ${k} `) : qw.some((w) => w === k || w === k + 's' || w === k + 'es');
    if (match) targets.forEach((t) => hit.add(t));
  }
  return hit;
}

function score(e, q, qw, syn) {
  const T = norm(e.title), X = `${T} ${norm(e.text)} ${e.type === 'concept' ? norm(e.chapterTitle) : ''}`.trim();
  const tw = words(T), xw = words(X);
  const pre = (list) => (w) => list.some((x) => (w.length < 3 ? x === w : x.startsWith(w))); // 2-letter words (pH, AC) must match whole words
  let s = 0;
  if (T === q) s = 1000;
  else if ((q.length > 2 ? T : T + " ").startsWith(q.length > 2 ? q : q + " ")) s = 800;
  else if (qw.every(pre(tw))) s = 600;
  else if (q.length > 2 && T.includes(q)) s = 400;
  else if (qw.every(pre(xw))) s = 300;
  else if (q.length > 2 && X.includes(q)) s = 200;
  else if (qw.length > 1) { const f = qw.filter(pre(xw)).length / qw.length; if (f >= 0.5) s = Math.round(100 * f); }
  if (syn.has(`${e.subject}/${e.slug}`)) s = e.type === 'chapter' ? Math.max(s, 850) : Math.max(s, 170);
  return s;
}

export function rank(entries, query) {
  const q = norm(query);
  if (!q) return [];
  const qw = words(q).filter((w, i, a) => w.length > 1 || a.length === 1);
  if (!qw.length) return [];
  const syn = synonymTargets(query);
  return entries.map((e) => ({ ...e, score: score(e, qw.join(' '), qw, syn) }))
    .filter((e) => e.score > 0)
    .sort((a, b) => b.score - a.score || (a.type === b.type ? 0 : a.type === 'chapter' ? -1 : 1) || b.count - a.count || a.title.localeCompare(b.title));
}

export function searchBox(placeholder = 'Search a chapter or topic, e.g. Doppler, pH, integrals', value = '') {
  return `<form class="search-form row" role="search" style="gap:8px;flex-wrap:nowrap;margin:10px 0">
    <input id="searchInput" type="search" name="q" enterkeyhint="search" autocomplete="off" aria-label="Search chapters and topics" placeholder="${esc(placeholder)}" value="${esc(value)}"
      style="flex:1;min-width:0;font-size:1rem;padding:8px 10px;border-radius:8px;border:1px solid var(--border);background:var(--card);color:inherit">
    <button class="btn" type="submit">Search</button>
  </form>`;
}

export function bindSearchBox(root) {
  root.querySelectorAll('form.search-form').forEach((f) => f.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const q = (f.querySelector('#searchInput, input[name=q]')?.value || '').trim();
    location.hash = q ? `#/search?q=${encodeURIComponent(q)}` : '#/search';
  }));
}

let indexPromise = null;
function loadIndex() {
  if (!indexPromise) {
    indexPromise = (async () => {
      const syl = await syllabus();
      const subs = Object.keys(syl);
      const cs = await Promise.all(subs.map((s) => concepts(s)));
      return searchIndexFrom(syl, Object.fromEntries(subs.map((s, i) => [s, cs[i]])));
    })();
    indexPromise.catch(() => { indexPromise = null; });
  }
  return indexPromise;
}

function card(e) {
  const sub = `${SUBJECT_NAME[e.subject] || e.subject}${e.puc ? ' · PUC ' + e.puc : ''}`;
  if (e.type === 'chapter') {
    return `<a class="card" href="${e.href}" style="display:block;color:inherit">
      <div class="row spread"><span class="kicker">Chapter</span><span class="muted">${esc(sub)}</span></div>
      <h3 style="margin:.35rem 0 0">${esc(e.title)}</h3></a>`;
  }
  return `<a class="card" href="${e.href}" style="display:block;color:inherit">
    <div class="row spread"><span class="kicker">${esc(e.chapterTitle)}</span><span class="pill">asked ${e.count} time${e.count === 1 ? '' : 's'} in KCET</span></div>
    <h3 style="margin:.35rem 0 .2rem">${esc(e.title)}</h3>
    ${e.text ? `<div class="muted">${esc(e.text)}</div>` : ''}
    <div class="muted" style="margin-top:6px">${esc(sub)} · <span style="color:var(--primary)">Read chapter notes →</span></div></a>`;
}

export default async function search(parts, query = {}) {
  const q = (query.q || '').trim();
  const node = el(`<section>
    <h1>Search</h1>
    ${searchBox(undefined, q)}
    <div id="searchResults" class="stack"><p class="muted">Loading…</p></div>
  </section>`);
  bindSearchBox(node);
  const box = node.querySelector('#searchResults');
  if (!q) {
    box.innerHTML = `<h2>Popular searches</h2><div class="row">${POPULAR.map((p) => `<a class="pill" style="font-size:.9rem;padding:6px 12px" href="#/search?q=${encodeURIComponent(p)}">${esc(p)}</a>`).join('')}</div>`;
    return node;
  }
  let index;
  try { index = await loadIndex(); } catch { box.innerHTML = '<p class="muted">Could not load the search data. Check your connection and try again.</p>'; return node; }
  const res = rank(index, q).slice(0, 30);
  box.innerHTML = res.length
    ? `<p class="muted">${res.length === 30 ? 'Top 30' : res.length} result${res.length === 1 ? '' : 's'} for “${esc(q)}”</p>${res.map(card).join('')}`
    : `<div class="card"><p style="margin:0">No match for “${esc(q)}” yet. Try a shorter word or a chapter name, like <a href="#/search?q=optics">optics</a> or <a href="#/search?q=integrals">integrals</a>.</p></div>`;
  math(box);
  return node;
}
