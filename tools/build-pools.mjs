// Run: node tools/build-pools.mjs [YYYY-MM-DD]
// Builds data/pools/<subject>.json — a ~300-question stratified sample per subject (share per chapter
// proportional to syllabus `weight`, at least 6 per chapter that has questions) so a full 60-question
// single-subject mock loads ONE file instead of ~28 chapter files. Deterministic: the shuffle is seeded
// from the date string. Re-run whenever chapter questions change.
import { readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const TARGET = 300, MIN_PER_CHAPTER = 6;
const built = process.argv[2] || new Date().toISOString().slice(0, 10);
const FIELDS = ['id', 'q', 'options', 'answer', 'explanation', 'trick', 'tip', 'difficulty'];

function hash(str) { let h = 2166136261; for (const ch of str) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function seededRandom(seed) { let x = seed >>> 0 || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }
function shuffle(arr, rnd) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

const syl = JSON.parse(readFileSync(join(root, 'data/syllabus.json'), 'utf8'));
mkdirSync(join(root, 'data/pools'), { recursive: true });
console.log(`Pools built ${built}`);
for (const subject of ['physics', 'chemistry', 'maths']) {
  const rnd = seededRandom(hash(`${built}:${subject}`));
  const chapters = [];
  for (const c of syl[subject] || []) {
    if (!c.file || !c.count) continue;
    let qs = [];
    try { qs = JSON.parse(readFileSync(join(root, 'data/questions', subject, c.file), 'utf8')).questions || []; } catch (e) { console.warn(`  skip ${subject}/${c.file}: ${e.message}`); }
    if (qs.length) chapters.push({ c, qs, w: c.weight || 1 });
  }
  const totalW = chapters.reduce((a, x) => a + x.w, 0);
  const questions = [];
  for (const { c, qs, w } of chapters) {
    const n = Math.min(qs.length, Math.max(MIN_PER_CHAPTER, Math.round(TARGET * w / totalW)));
    for (const q of shuffle(qs, rnd).slice(0, n)) {
      const out = {};
      for (const f of FIELDS) if (q[f] !== undefined) out[f] = q[f];
      out.chapter = c.slug; out.subject = subject;
      questions.push(out);
    }
  }
  const file = join(root, 'data/pools', `${subject}.json`);
  writeFileSync(file, JSON.stringify({ built, questions }));
  const kb = (statSync(file).size / 1024).toFixed(1);
  console.log(`  ${subject.padEnd(10)} ${String(questions.length).padStart(4)} questions from ${chapters.length} chapters  ${kb} KB`);
}
