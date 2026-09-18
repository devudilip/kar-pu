// Run: node tests/streak.test.mjs   — tests the task-based day streak in js/store.js with a fake clock and fake localStorage.
import assert from 'node:assert/strict';

const mem = {}; globalThis.localStorage = { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: (k) => { delete mem[k]; } };
const RealDate = Date; let now = new RealDate(2027, 0, 10, 9, 0, 0).getTime();
globalThis.Date = class extends RealDate { constructor(...a) { if (a.length) super(...a); else super(now); } static now() { return now; } };
const setClock = (y, m, d, h = 9) => { now = new RealDate(y, m - 1, d, h, 0, 0).getTime(); };
const key = (y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

const { store } = await import('../js/store.js');
let passed = 0; const t = (name, fn) => { fn(); passed++; console.log('ok  ', name); };

t('new student: streak 0, not at risk', () => { assert.equal(store.streak(), 0); assert.equal(store.streakAtRisk(), false); });

t('no plan: Daily 10 alone completes the day', () => {
  setClock(2027, 1, 10); store.setDaily(key(2027, 1, 10), { done: 10, correct: 7 });
  assert.equal(store.todayComplete(), true); assert.equal(store.streak(), 1);
});

t('next morning, nothing done yet: streak still 1 (yesterday counts), not at risk before 8 pm', () => {
  setClock(2027, 1, 11, 9); assert.equal(store.streak(), 1); assert.equal(store.streakAtRisk(), false);
});

t('same day after 8 pm with tasks pending: streak at risk', () => { setClock(2027, 1, 11, 21); assert.equal(store.streakAtRisk(), true); });

t('with a plan: Daily 10 alone is NOT enough', () => {
  setClock(2027, 1, 11, 10);
  store.setPlan({ examDate: '2027-04-20', hoursPerDay: 3, days: [
    { date: key(2027, 1, 11), tasks: [{ key: 'daily', type: 'daily', title: 'Daily 10' }, { key: 'ch-physics-gravitation', type: 'chapter', title: 'Gravitation' }] },
    { date: key(2027, 1, 12), tasks: [{ key: 'daily', type: 'daily', title: 'Daily 10' }, { key: 'mock-physics', type: 'mock', title: 'Mock' }] },
    { date: key(2027, 1, 13), tasks: [{ key: 'daily', type: 'daily', title: 'Daily 10' }] },
    { date: key(2027, 1, 14), tasks: [{ key: 'daily', type: 'daily', title: 'Daily 10' }] } ] });
  store.setDaily(key(2027, 1, 11), { done: 10, correct: 8 });
  assert.equal(store.todayComplete(), false); assert.equal(store.dayDone(key(2027, 1, 11)), false); assert.equal(store.streak(), 1);
});

t('finishing the chapter task completes the day: streak 2', () => {
  assert.equal(store.completePlanTask('ch-physics-gravitation'), true);
  assert.equal(store.todayComplete(), true); assert.equal(store.streak(), 2);
});

t('un-ticking a task un-completes the day', () => {
  store.togglePlanTask(key(2027, 1, 11), 'ch-physics-gravitation'); assert.equal(store.streak(), 1);
  store.togglePlanTask(key(2027, 1, 11), 'ch-physics-gravitation'); assert.equal(store.streak(), 2);
});

t('day 3 fully done: streak 3, best 3', () => {
  setClock(2027, 1, 12, 18); store.setDaily(key(2027, 1, 12), { done: 10, correct: 9 }); assert.equal(store.streak(), 2);
  store.completePlanTask('mock'); assert.equal(store.streak(), 3); assert.equal(store.bestStreak(), 3);
});

t('a missed day resets the streak to 0, best stays 3', () => {
  setClock(2027, 1, 14, 9); // the 13th was skipped entirely
  assert.equal(store.streak(), 0); assert.equal(store.bestStreak(), 3); assert.equal(store.streakAtRisk(), false);
});

t('starting again gives streak 1', () => { store.setDaily(key(2027, 1, 14), { done: 10, correct: 6 }); assert.equal(store.streak(), 1); });

t('regenerating the plan keeps history', () => {
  store.setPlan({ examDate: '2027-04-20', hoursPerDay: 3, days: [{ date: key(2027, 1, 14), tasks: [{ key: 'daily', type: 'daily', title: 'Daily 10' }] }] });
  assert.equal(store.dayDone(key(2027, 1, 12)), true); assert.equal(store.streak(), 1);
});

t('migration: old profiles with only daily[] keep their streak', () => {
  mem['kcet.prep.v1'] = JSON.stringify({ daily: { [key(2027, 1, 13)]: { done: 10, correct: 5 }, [key(2027, 1, 14)]: { done: 10, correct: 5 } } });
  store.import(mem['kcet.prep.v1']); assert.equal(store.streak(), 2);
});

console.log(`\n${passed} tests passed`);
