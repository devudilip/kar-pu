// Run: node tests/search.test.mjs   — tests the search index and ranking in js/views/search.js with a small fake syllabus.
import assert from 'node:assert/strict';

const mem = {}; globalThis.localStorage = { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: (k) => { delete mem[k]; } };
const { searchIndexFrom, rank, searchBox, synonymTargets } = await import('../js/views/search.js');
let passed = 0; const t = (name, fn) => { fn(); passed++; console.log('ok  ', name); };

const syl = {
  physics: [
    { slug: 'current-electricity', title: 'Current Electricity', puc: 2 },
    { slug: 'ray-optics', title: 'Ray Optics', puc: 2 },
    { slug: 'wave-optics', title: 'Wave Optics', puc: 2 },
    { slug: 'waves', title: 'Waves', puc: 1 }
  ],
  chemistry: [
    { slug: 'some-basic-concepts', title: 'Some Basic Concepts of Chemistry', puc: 1 },
    { slug: 'equilibrium', title: 'Equilibrium', puc: 1 }
  ],
  maths: [
    { slug: 'integrals', title: 'Integrals', puc: 2 },
    { slug: 'application-of-integrals', title: 'Application of Integrals', puc: 2 },
    { slug: 'vector-algebra', title: 'Vector Algebra', puc: 2 },
    { slug: 'probability-1', title: 'Probability (PUC 1)', puc: 1 },
    { slug: 'probability-2', title: 'Probability', puc: 2 }
  ]
};
const conceptsBySubject = {
  physics: { chapters: {
    'current-electricity': { total: 20, concepts: [{ name: "Ohm's law and resistivity", count: 9, years: [2020], master: 'Use V = IR and R = rho L / A.' }, { name: 'Wheatstone bridge balance', count: 4, master: 'Balanced bridge ratio.' }] },
    waves: { total: 10, concepts: [{ name: 'Doppler effect in sound', count: 6, master: 'Apparent frequency for moving source/observer.' }] }
  } },
  chemistry: { chapters: { equilibrium: { total: 12, concepts: [{ name: 'pH of buffer solutions', count: 5, master: 'Henderson equation.' }] } } },
  maths: { chapters: { integrals: { total: 30, concepts: [{ name: 'Integration by parts', count: 8, master: 'ILATE rule.' }, { name: 'Definite integrals properties', count: 12, master: 'King property.' }] } } }
};
const idx = searchIndexFrom(syl, conceptsBySubject);
const top = (q, n = 1) => rank(idx, q).slice(0, n).map((e) => `${e.type}:${e.slug}:${e.title}`);

t('index has one entry per chapter and per concept, with hrefs', () => {
  assert.equal(idx.filter((e) => e.type === 'chapter').length, 11);
  assert.equal(idx.filter((e) => e.type === 'concept').length, 6);
  const c = idx.find((e) => e.title === 'Doppler effect in sound');
  assert.equal(c.href, '#/chapter/physics/waves'); assert.equal(c.chapterTitle, 'Waves'); assert.equal(c.count, 6);
});

t('empty query gives no results', () => { assert.deepEqual(rank(idx, ''), []); assert.deepEqual(rank(idx, '  '), []); });

t('exact title beats title-prefix and word-prefix matches', () => {
  const r = rank(idx, 'integrals');
  assert.equal(r[0].title, 'Integrals'); assert.equal(r[0].type, 'chapter');
  assert.equal(r[1].title, 'Application of Integrals');
  assert.ok(r.findIndex((e) => e.title === 'Definite integrals properties') > 1);
});

t('case-insensitive', () => { assert.deepEqual(top('RAY OPTICS'), ['chapter:ray-optics:Ray Optics']); });

t('word-prefix beats substring', () => {
  const r = rank(idx, 'opt');
  assert.ok(r.length >= 2 && r.every((e) => e.score >= 300));
  const r2 = rank(idx, 'ptics'); // substring only
  assert.ok(r2.length && r2[0].score < rank(idx, 'optics')[0].score);
});

t('synonym: ohm -> Current Electricity first, Ohm concept next', () => {
  const r = rank(idx, 'ohm');
  assert.equal(r[0].slug, 'current-electricity'); assert.equal(r[0].type, 'chapter');
  assert.equal(r[1].title, "Ohm's law and resistivity");
});
t('synonym: lens / mirror -> Ray Optics', () => { assert.deepEqual(top('lens'), ['chapter:ray-optics:Ray Optics']); assert.deepEqual(top('concave mirror'), ['chapter:ray-optics:Ray Optics']); });
t('synonym: integration -> Integrals (chapter) ahead of concepts', () => { assert.equal(top('integration')[0], 'chapter:integrals:Integrals'); });
t('synonym: pH -> Equilibrium', () => { const r = rank(idx, 'pH'); assert.equal(r[0].slug, 'equilibrium'); assert.ok(r.some((e) => e.title === 'pH of buffer solutions')); });
t('synonym: mole -> Some Basic Concepts', () => { assert.equal(top('mole')[0], 'chapter:some-basic-concepts:Some Basic Concepts of Chemistry'); });
t('synonym: vector / vectors -> Vector Algebra', () => { assert.equal(top('vectors')[0], 'chapter:vector-algebra:Vector Algebra'); assert.equal(top('vector')[0], 'chapter:vector-algebra:Vector Algebra'); });
t('synonym: probability bayes -> both probability chapters, Bayes chapter included', () => {
  const s = synonymTargets('probability bayes'); assert.ok(s.has('maths/probability-2') && s.has('maths/probability-1'));
  const r = rank(idx, 'probability bayes').slice(0, 2).map((e) => e.slug).sort();
  assert.deepEqual(r, ['probability-1', 'probability-2']);
});
t('concept search: doppler finds the Waves concept', () => { const r = rank(idx, 'doppler'); assert.equal(r[0].title === 'Waves' || r[0].title === 'Doppler effect in sound', true); assert.ok(r.some((e) => e.title === 'Doppler effect in sound')); });
t('no match returns empty', () => { assert.deepEqual(rank(idx, 'zzzzqx'), []); });
t('searchBox renders input#searchInput with escaped value', () => {
  const h = searchBox(undefined, '"x<y'); assert.ok(h.includes('id="searchInput"')); assert.ok(h.includes('&quot;x&lt;y')); assert.ok(h.includes('Doppler, pH, integrals'));
});

console.log(`\n${passed} passed`);
