// Local progress store (no account, no server). Everything lives in localStorage.
const KEY = 'kcet.prep.v1';
const defaults = () => ({
  attempts: {},      // qid -> { c: correctCount, w: wrongCount, last: 0|1, t: timestamp }
  bookmarks: [],     // qids
  tests: [],         // { id, title, date, subjects, total, correct, wrong, skipped, timeTaken, items:[{qid, chosen, correct}] }
  chapterSeen: {},   // chapterKey -> timestamp
  daily: {},         // 'YYYY-MM-DD' -> { done, correct }
  last: null,        // { type, href, title, sub, t } — continue where you left off
  plan: null,        // study plan { examDate, hoursPerDay, created, days:[{date, tasks:[{key,type,subject,slug,title,hours,done}]}] }
  cards: {},         // cardKey -> { lvl, next }
  settings: { showExplanationInPractice: true, name: '', lang: 'en', onboarded: false }
});
let state = load();
function load() {
  try { const raw = localStorage.getItem(KEY); return raw ? { ...defaults(), ...JSON.parse(raw) } : defaults(); }
  catch { return defaults(); }
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { console.warn('save failed', e); } }

export const store = {
  get() { return state; },
  recordAttempt(qid, correct, ms) {
    const a = state.attempts[qid] || { c: 0, w: 0, last: 0, t: 0 };
    if (correct) a.c++; else a.w++;
    a.last = correct ? 1 : 0; a.t = Date.now();
    if (ms) a.ms = Math.round(ms);
    if (correct) delete a.reason;
    state.attempts[qid] = a; save();
  },
  setReason(qid, reason) { const a = state.attempts[qid]; if (a) { a.reason = reason; save(); } },
  reasonStats() { const r = {}; for (const a of Object.values(state.attempts)) if (a.last === 0 && a.reason) r[a.reason] = (r[a.reason] || 0) + 1; return r; },
  setLast(o) { state.last = { ...o, t: Date.now() }; save(); },
  last() { return state.last; },
  setPlan(p) { state.plan = p; save(); },
  plan() { return state.plan; },
  togglePlanTask(date, key) { const d = state.plan?.days.find((x) => x.date === date); const t = d?.tasks.find((x) => x.key === key); if (t) { t.done = !t.done; save(); } return t?.done; },
  attempt(qid) { return state.attempts[qid]; },
  toggleBookmark(qid) {
    const i = state.bookmarks.indexOf(qid);
    if (i >= 0) state.bookmarks.splice(i, 1); else state.bookmarks.push(qid);
    save(); return i < 0;
  },
  isBookmarked(qid) { return state.bookmarks.includes(qid); },
  saveTest(t) { state.tests.unshift(t); state.tests = state.tests.slice(0, 50); save(); },
  test(id) { return state.tests.find((t) => t.id === id); },
  touchChapter(key) { state.chapterSeen[key] = Date.now(); save(); },
  setSetting(k, v) { state.settings[k] = v; save(); },
  lang() { return 'en'; }, // Kannada UI parked until a full translation ships; data path retained
  chapterStats(qids) {
    let attempted = 0, correct = 0;
    for (const id of qids) { const a = state.attempts[id]; if (a) { attempted++; if (a.last) correct++; } }
    return { attempted, correct, total: qids.length };
  },
  prefixStats(prefix, total) {
    let attempted = 0, correct = 0;
    for (const [id, a] of Object.entries(state.attempts)) if (id.startsWith(prefix)) { attempted++; if (a.last) correct++; }
    return { attempted, correct, total };
  },
  wrongQids() { return Object.entries(state.attempts).filter(([, a]) => a.last === 0).map(([id]) => id); },
  today() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); },
  daily(date) { return state.daily[date]; },
  setDaily(date, v) { state.daily[date] = v; save(); },
  streak() {
    let n = 0; const d = new Date();
    if (!state.daily[this.today()]) d.setDate(d.getDate() - 1);
    for (;;) { const k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); if (!state.daily[k]) break; n++; d.setDate(d.getDate() - 1); }
    return n;
  },
  card(key) { return state.cards[key] || { lvl: 0, next: 0 }; },
  rateCard(key, ok) {
    const c = this.card(key); const days = [1, 3, 7, 14, 30, 60];
    if (ok) { c.lvl = Math.min(c.lvl + 1, 5); c.next = Date.now() + days[c.lvl - 1] * 86400000; } else { c.lvl = 0; c.next = Date.now(); }
    state.cards[key] = c; save(); return c;
  },
  reset() { state = defaults(); save(); },
  export() { return JSON.stringify(state); },
  import(json) { const obj = JSON.parse(json); state = { ...defaults(), ...obj }; save(); }
};
