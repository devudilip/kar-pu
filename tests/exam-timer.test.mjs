// Run: node tests/exam-timer.test.mjs   — tests the pure pause/resume timer helpers in js/views/exam.js.
import assert from 'node:assert/strict';

const mem = {}; globalThis.localStorage = { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: (k) => { delete mem[k]; } };
const { applyPause, applyResume, timeLeft, isPausable } = await import('../js/views/exam.js');
let passed = 0; const t = (name, fn) => { fn(); passed++; console.log('ok  ', name); };

const base = () => ({ cfg: { chapter: { subject: 'physics', slug: 'x' } }, start: 0, endAt: 600000 });

t('pausable: chapter, custom, revision yes; mock and past paper no', () => {
  assert.equal(isPausable({ chapter: {} }), true);
  assert.equal(isPausable({ subjects: ['physics'], count: 20 }), true);
  assert.equal(isPausable({ ids: ['a'] }), true);
  assert.equal(isPausable({ weighted: true, subjects: ['physics'] }), false);
  assert.equal(isPausable({ pyq: '2023-physics' }), false);
  assert.equal(isPausable(null), false);
});

t('pause freezes the clock', () => {
  const s = applyPause(base(), 100000);
  assert.equal(s.paused, true); assert.equal(s.pausedAt, 100000);
  assert.equal(timeLeft(s, 100000), 500); assert.equal(timeLeft(s, 400000), 500);
});

t('pause is pure and idempotent', () => {
  const b = base(); const s = applyPause(b, 100000);
  assert.equal(b.paused, undefined);
  assert.equal(applyPause(s, 200000), s);
});

t('resume shifts endAt by the paused duration and accumulates pausedMs', () => {
  let s = applyResume(applyPause(base(), 100000), 160000);
  assert.equal(s.paused, false); assert.equal(s.pausedAt, null);
  assert.equal(s.endAt, 660000); assert.equal(s.pausedMs, 60000);
  assert.equal(timeLeft(s, 160000), 500);
  s = applyResume(applyPause(s, 200000), 230000);
  assert.equal(s.pausedMs, 90000); assert.equal(s.endAt, 690000);
});

t('resume when not paused is a no-op', () => { const b = base(); assert.equal(applyResume(b, 5), b); });

t('state survives JSON round-trip (reload while paused)', () => {
  const s = JSON.parse(JSON.stringify(applyPause(base(), 100000)));
  assert.equal(timeLeft(s, 999999), 500);
  assert.equal(applyResume(s, 130000).endAt, 630000);
});

t('clock going backwards never shortens time', () => {
  const s = applyResume(applyPause(base(), 100000), 90000);
  assert.equal(s.endAt, 600000); assert.equal(s.pausedMs, 0);
});

console.log(`\n${passed} passed`);
