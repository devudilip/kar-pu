// Run: node tests/pools.test.mjs   — full single-subject mocks draw from data/pools/<subject>.json (one fetch);
// other samples still load chapter files. fetch reads from disk; window/localStorage are faked.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const mem = {}; globalThis.localStorage = { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: (k) => { delete mem[k]; } };
const events = []; globalThis.window = { dispatchEvent: (e) => { events.push(e.detail); return true; }, addEventListener() {}, removeEventListener() {} };
if (!globalThis.CustomEvent) globalThis.CustomEvent = class { constructor(type, o = {}) { this.type = type; this.detail = o.detail; } };
const fetched = [];
globalThis.fetch = async (url) => {
  fetched.push(url);
  try { const body = await readFile(join(root, url), 'utf8'); return { ok: true, status: 200, json: async () => JSON.parse(body) }; }
  catch { return { ok: false, status: 404, json: async () => ({}) }; }
};

const data = await import('../js/data.js');
let passed = 0; const t = async (name, fn) => { fetched.length = 0; events.length = 0; await fn(); passed++; console.log('ok  ', name); };
const chapterFetches = () => fetched.filter((u) => u.startsWith('data/questions/'));

for (const subject of ['physics', 'chemistry', 'maths']) {
  await t(`${subject}: 60-question mock uses the pool, 1 file, 60 unique ids, >=15 chapters`, async () => {
    const qs = await data.sampleQuestions({ subjects: [subject], count: 60, rnd: data.seededRandom(42) });
    assert.equal(qs.length, 60);
    assert.equal(new Set(qs.map((q) => q.id)).size, 60);
    assert.ok(fetched.includes(`data/pools/${subject}.json`), 'pool fetched');
    assert.equal(chapterFetches().length, 0, `no chapter files: ${chapterFetches()}`);
    const chs = new Set(qs.map((q) => q.chapter));
    assert.ok(chs.size >= 15, `spans ${chs.size} chapters`);
    assert.ok(qs.every((q) => q.subject === subject && q.q && Array.isArray(q.options) && q.answer !== undefined));
    const last = events[events.length - 1]; assert.equal(last.done, last.total); assert.equal(last.total, 1);
  });
}

await t('2-subject sample still loads chapter files', async () => {
  const qs = await data.sampleQuestions({ subjects: ['physics', 'chemistry'], count: 60, rnd: data.seededRandom(7) });
  assert.equal(qs.length, 60);
  assert.ok(!fetched.some((u) => u.startsWith('data/pools/')));
  assert.ok(chapterFetches().length > 0);
});

await t('difficulty-filtered sample still loads chapter files', async () => {
  // maths chapter files have not been fetched yet in this run (the maths mock used only the pool)
  const qs = await data.sampleQuestions({ subjects: ['maths'], count: 60, difficulty: 'hard', rnd: data.seededRandom(9) });
  assert.ok(qs.length > 0 && qs.every((q) => q.difficulty === 'hard'));
  assert.ok(!fetched.some((u) => u.startsWith('data/pools/')));
  assert.ok(chapterFetches().length > 0, "maths chapter files fetched");
});

await t('small single-subject sample (count < 40) does not use the pool', async () => {
  await data.sampleQuestions({ subjects: ['physics'], count: 20, rnd: data.seededRandom(3) });
  assert.ok(!fetched.some((u) => u.startsWith('data/pools/')));
});

console.log(`\n${passed} passed`);
