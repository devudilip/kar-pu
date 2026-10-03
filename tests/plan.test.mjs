// Run: node tests/plan.test.mjs   — tests buildPlan() in js/views/plan.js with a fake clock, fake localStorage and fetch reading data/ from disk.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const mem = {}; globalThis.localStorage = { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: (k) => { delete mem[k]; } };
globalThis.fetch = async (url) => {
  try { const txt = await readFile(ROOT + String(url).replace(/^\.?\//, ''), 'utf8'); return { ok: true, status: 200, json: async () => JSON.parse(txt) }; }
  catch { return { ok: false, status: 404, json: async () => { throw new Error('404 ' + url); } }; }
};
if (!globalThis.window) globalThis.window = { dispatchEvent() {}, addEventListener() {}, scrollTo() {} };
if (!globalThis.CustomEvent) globalThis.CustomEvent = class { constructor(type, o) { this.type = type; this.detail = o?.detail; } };

const RealDate = Date; const now = new RealDate(2027, 0, 10, 9, 0, 0).getTime();
globalThis.Date = class extends RealDate { constructor(...a) { if (a.length) super(...a); else super(now); } static now() { return now; } };
const examIn = (days) => { const d = new RealDate(now); d.setDate(d.getDate() + days); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

const { buildPlan } = await import('../js/views/plan.js');
const { store } = await import('../js/store.js');
const { syllabus, SUBJECTS, PFX } = await import('../js/data.js');
const syl = await syllabus();

// KNOWN_BUGS: test names whose failure is a confirmed bug in js/views/plan.js (not fixed here). Remove once plan.js is fixed.
const KNOWN_BUGS = {};
let passed = 0, known = 0;
const t = async (name, fn) => {
  try { await fn(); passed++; console.log('ok  ', name); if (KNOWN_BUGS[name]) console.log('     note: listed as KNOWN BUG but now passes — remove it from KNOWN_BUGS'); }
  catch (e) { if (KNOWN_BUGS[name]) { known++; console.log('skip', name, '\n     KNOWN BUG:', KNOWN_BUGS[name], '\n     (' + e.message.split('\n')[0] + ')'); } else throw e; }
};
const dayHours = (d) => d.tasks.reduce((a, x) => a + x.hours, 0);
const chHours = (plan, subject, slug) => plan.days.flatMap((d) => d.tasks).filter((x) => x.type === 'chapter' && x.subject === subject && x.slug === slug).reduce((a, x) => a + x.hours, 0);

const fresh = await buildPlan(examIn(120), 3);

await t('120 days, 3 h/day: every chapter with questions gets at least one chapter task', () => {
  assert.equal(fresh.totalDays, 120);
  const keys = new Set(fresh.days.flatMap((d) => d.tasks).filter((x) => x.type === 'chapter').map((x) => x.subject + '/' + x.slug));
  for (const s of SUBJECTS) for (const c of syl[s.id]) if (c.count > 0) assert.ok(keys.has(s.id + '/' + c.slug), `missing chapter task for ${s.id}/${c.slug}`);
});

await t('revision phase is the last ~25% of days (max 21) with revise tasks and no chapter tasks', () => {
  assert.equal(fresh.revisionDays, Math.min(21, Math.round(120 * 0.25)));
  assert.equal(fresh.learnDays + fresh.revisionDays, fresh.totalDays);
  const rev = fresh.days.slice(fresh.learnDays);
  assert.equal(rev.length, fresh.revisionDays);
  for (const d of rev) assert.ok(!d.tasks.some((x) => x.type === 'chapter'), `chapter task in revision day ${d.date}`);
  const types = new Set(rev.flatMap((d) => d.tasks.map((x) => x.type)));
  assert.ok(types.has('revise'), 'no revise tasks');
  for (const d of fresh.days.slice(0, fresh.learnDays)) assert.ok(!d.tasks.some((x) => x.type === 'revise' || x.type === 'pyq'), `revise/pyq task in learning day ${d.date}`);
});

await t('revision phase includes previous-year paper (pyq) tasks', () => {
  assert.ok(fresh.days.slice(fresh.learnDays).some((d) => d.tasks.some((x) => x.type === 'pyq')), 'no pyq task in any revision day at 3 h/day');
});

await t('every 7th day has a mock', () => {
  for (let i = 6; i < fresh.days.length; i += 7) assert.ok(fresh.days[i].tasks.some((x) => x.type === 'mock'), `no mock on day ${i} (${fresh.days[i].date})`);
});

await t('no day exceeds hoursPerDay', () => {
  for (const d of fresh.days) assert.ok(dayHours(d) <= 3 + 0.05, `${d.date}: ${dayHours(d).toFixed(2)} h > 3 h (${d.tasks.map((x) => x.type + ':' + x.hours).join(', ')})`);
});

await t('all task hours are multiples of 0.1 (no float garbage)', () => {
  for (const d of fresh.days) for (const x of d.tasks) assert.ok(x.hours > 0 && Math.abs(x.hours * 10 - Math.round(x.hours * 10)) < 1e-9 && String(x.hours).length <= 4, `${d.date} ${x.key}: hours=${x.hours}`);
});

await t('10 days to exam: valid plan, every learning day has a chapter task', async () => {
  const p = await buildPlan(examIn(10), 3);
  assert.equal(p.totalDays, 10); assert.equal(p.days.length, 10);
  assert.ok(p.learnDays >= 1 && p.revisionDays >= 1 && p.learnDays + p.revisionDays === 10);
  for (const d of p.days.slice(0, p.learnDays)) assert.ok(d.tasks.some((x) => x.type === 'chapter'), `no chapter task on ${d.date}`);
  for (const d of p.days) for (const x of d.tasks) assert.ok(Number.isFinite(x.hours) && x.hours > 0, `${d.date} ${x.key}: hours=${x.hours}`);
});

await t('a chapter answered 10/10 correct gets fewer hours than for a fresh student', async () => {
  const s = 'physics', c = syl.physics.find((x) => x.count >= 10);
  const before = chHours(fresh, s, c.slug);
  for (let i = 1; i <= 10; i++) store.recordAttempt(`${PFX[s]}-${c.slug}-${String(i).padStart(3, '0')}`, true, 30000);
  const after = chHours(await buildPlan(examIn(120), 3), s, c.slug);
  assert.ok(before > 0, 'fresh plan has no hours for the chapter');
  assert.ok(after < before, `expected fewer hours after 10/10 correct: before ${before}, after ${after}`);
});

console.log(`\n${passed} tests passed${known ? `, ${known} skipped (KNOWN BUG)` : ''}`);
