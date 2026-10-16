// Run: node tests/pyq-chapters.test.mjs   — checks data/pyq/chapters/* against the papers, past-paper ids in
// questionsByIds, and that an unfinished test survives in localStorage (moved over from older sessionStorage).
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = (p) => JSON.parse(readFileSync(root + p, 'utf8'));
const store = () => { const m = {}; return { getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: (k) => { delete m[k]; } }; };
globalThis.localStorage = store(); globalThis.sessionStorage = store();
globalThis.window = { dispatchEvent() {} }; globalThis.CustomEvent = class { constructor(t, o) { this.type = t; this.detail = o?.detail; } };
globalThis.fetch = async (url) => { const p = root + String(url).split('?')[0]; return existsSync(p) ? { ok: true, json: async () => JSON.parse(readFileSync(p, 'utf8')) } : { ok: false, status: 404 }; };

const { pyqId, questionsByIds, pyqQuestions } = await import('../js/data.js');
const { savedExam, clearExam, SAVE_KEY } = await import('../js/views/exam.js');
let passed = 0; const t = async (name, fn) => { await fn(); passed++; console.log('ok  ', name); };

const syl = read('data/syllabus.json'), idx = read('data/pyq/index.json');
const PFX = { physics: 'phy', chemistry: 'che', maths: 'mat' };

await t('pyqId format', () => { assert.equal(pyqId(2024, 'physics', 4), 'kcet-2024-phy-04'); assert.equal(pyqId(2009, 'maths', 60), 'kcet-2009-mat-60'); });

await t('every syllabus chapter has a past-question file; ids unique and newest first', () => {
  for (const s of Object.keys(PFX)) for (const c of syl[s]) {
    const f = read(`data/pyq/chapters/${s}/${c.slug}.json`);
    assert.equal(f.total, f.questions.length);
    const ids = f.questions.map((q) => q.id); assert.equal(new Set(ids).size, ids.length, c.slug + ' duplicate ids');
    for (let i = 1; i < f.questions.length; i++) assert.ok(f.questions[i - 1].year >= f.questions[i].year, c.slug + ' order');
  }
});

await t('every current-syllabus paper question lands in a chapter file with the same key', () => {
  const placed = {};
  for (const s of Object.keys(PFX)) for (const c of syl[s]) for (const q of read(`data/pyq/chapters/${s}/${c.slug}.json`).questions) placed[q.id] = q;
  let n = 0;
  for (const p of idx.papers) for (const q of read('data/pyq/' + p.file).questions) {
    if (/^old syllabus/i.test(q.chapter || '')) continue;
    const got = placed[pyqId(p.year, p.subject, q.n)];
    assert.ok(got, `${p.file} Q${q.n} missing`); assert.equal(got.answer, q.answer); assert.deepEqual(got.options, q.options); n++;
  }
  assert.ok(n > 2500, 'expected thousands of questions, got ' + n);
});

await t('questionsByIds resolves chapter ids and past-paper ids together', async () => {
  const qs = await pyqQuestions('2024-physics.json');
  const id = qs[3].id, other = read('data/questions/physics/units-and-measurements.json').questions[0].id;
  const map = await questionsByIds([id, other, 'kcet-2024-phy-999', 'nonsense']);
  assert.equal(map[id].q, qs[3].q); assert.equal(map[id].subject, 'physics'); assert.equal(map[id].pyq, true);
  assert.ok(syl.physics.some((c) => c.slug === map[id].chapter), 'chapter slug filled in');
  assert.ok(map[other]); assert.equal(Object.keys(map).length, 2);
});

await t('unfinished test moves from sessionStorage to localStorage and can be cleared', () => {
  sessionStorage.setItem(SAVE_KEY, JSON.stringify({ qs: [1], cfg: { title: 'x' } }));
  assert.equal(savedExam().cfg.title, 'x');
  assert.equal(sessionStorage.getItem(SAVE_KEY), null); assert.ok(localStorage.getItem(SAVE_KEY));
  clearExam(); assert.equal(savedExam(), null);
});

console.log(`\n${passed} passed`);
