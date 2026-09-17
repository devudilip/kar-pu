// Loads syllabus and chapter question files (cached in memory; service worker caches on disk).
import { store } from './store.js';
const cache = new Map();
async function getJSON(url) {
  if (cache.has(url)) return cache.get(url);
  const p = fetch(url).then((r) => { if (!r.ok) throw new Error(`${r.status} ${url}`); return r.json(); });
  cache.set(url, p);
  try { return await p; } catch (e) { cache.delete(url); throw e; }
}

export const SUBJECTS = [
  { id: 'physics', name: 'Physics', short: 'PHY' },
  { id: 'chemistry', name: 'Chemistry', short: 'CHE' },
  { id: 'maths', name: 'Mathematics', short: 'MAT' }
];
export const PFX = { physics: 'phy', chemistry: 'che', maths: 'mat' };
export const KCET = { questionsPerSubject: 60, minutesPerSubject: 80, marksPerQuestion: 1, negative: 0 };

export async function syllabus() { return getJSON('data/syllabus.json'); }
export async function chapter(subject, slug) {
  const syl = await syllabus();
  const meta = syl[subject].find((c) => c.slug === slug);
  if (!meta) throw new Error('Unknown chapter');
  let content = { notes: '', questions: [] };
  if (meta.file) {
    try { content = await getJSON(`data/questions/${subject}/${meta.file}`); } catch (e) { console.warn(e); }
  }
  let kn = null;
  if (store.lang() === 'kn') { try { kn = await getJSON(`data/kn/${subject}/${meta.file}`); } catch { kn = null; } }
  const questions = (content.questions || []).map((q) => {
    const out = { ...q, subject, chapter: slug };
    if (kn?.explanations?.[q.id]) { out.explanation_en = q.explanation; out.explanation = kn.explanations[q.id]; }
    if (kn?.questions?.[q.id]) { out.q_en = q.q; out.q = kn.questions[q.id]; }
    return out;
  });
  return { ...meta, subject, notes: (kn?.notes) || content.notes || '', notes_en: content.notes || '', questions, kn: !!kn };
}
export async function allQuestions(subjects) {
  const syl = await syllabus();
  const out = [];
  for (const s of subjects) {
    for (const c of syl[s]) { if (!c.count) continue; const ch = await chapter(s, c.slug); out.push(...ch.questions); }
  }
  return out;
}
export async function questionById(id) {
  // ids look like phy-um-001; find via all chapters (cheap thanks to cache)
  const all = await allQuestions(SUBJECTS.map((s) => s.id));
  return all.find((q) => q.id === id);
}
export async function flashcards(subject) { try { return await getJSON(`data/flashcards/${subject}.json`); } catch { return { chapters: [] }; } }
export function seededRandom(seed) { let x = seed >>> 0 || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }
export function seededShuffle(arr, rnd) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
export async function pyqIndex() { return getJSON('data/pyq/index.json'); }
export async function pyqPaper(file) { return getJSON(`data/pyq/${file}`); }

export function shuffle(arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

// Chapter weightage from real previous-year papers (needs question.chapter = slug or chapter title in the PYQ files).
export async function pyqWeights() {
  const idx = await pyqIndex();
  const syl = await syllabus();
  const out = { physics: {}, chemistry: {}, maths: {}, years: [] };
  for (const p of idx.papers) {
    let paper; try { paper = await pyqPaper(p.file); } catch { continue; }
    if (!out.years.includes(p.year)) out.years.push(p.year);
    const chapters = syl[p.subject] || [];
    for (const q of paper.questions) {
      if (!q.chapter) continue;
      const key = String(q.chapter).toLowerCase().trim();
      const matches = chapters.filter((x) => x.slug === key || x.title.toLowerCase() === key || x.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') === key);
      const c = matches.length > 1 ? (matches.find((x) => x.puc === 2) || matches[0]) : matches[0];
      if (!c) continue;
      const w = out[p.subject][c.slug] ||= {};
      w[p.year] = (w[p.year] || 0) + 1;
    }
  }
  out.years.sort((a, b) => b - a);
  return out;
}
export async function rankData() { return getJSON('data/rank-bands.json'); }
