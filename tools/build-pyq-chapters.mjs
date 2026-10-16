#!/usr/bin/env node
// Run: node tools/build-pyq-chapters.mjs
// Builds data/pyq/chapters/<subject>/<slug>.json — every real KCET question (2009 onwards) tagged with that
// chapter, newest year first, so the chapter page's "Past KCET" tab loads one small file instead of 18 papers.
// Questions tagged "Old syllabus: …" are left out. Maths has two chapters titled "Relations and Functions" and
// two titled "Probability" (1st and 2nd PUC); a question tagged with such a title goes to both, because the tag
// does not say which year. Re-run after adding or fixing a paper (after tools/validate-pyq.mjs).
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PFX = { physics: 'phy', chemistry: 'che', maths: 'mat' };
const FIELDS = ['q', 'options', 'answer', 'alsoCorrect', 'grace', 'disputed', 'note', 'figure', 'explanation'];
// Stable id of a past-paper question; the app records attempts and bookmarks under it (see pyqId in js/data.js).
export const pyqId = (year, subject, n) => `kcet-${year}-${PFX[subject]}-${String(n).padStart(2, '0')}`;

const syl = JSON.parse(readFileSync(join(root, 'data/syllabus.json'), 'utf8'));
const idx = JSON.parse(readFileSync(join(root, 'data/pyq/index.json'), 'utf8'));
const outDir = join(root, 'data/pyq/chapters');
rmSync(outDir, { recursive: true, force: true });

let written = 0, placed = 0, unplaced = 0;
for (const subject of Object.keys(PFX)) {
  const bySlug = {};
  for (const c of syl[subject]) bySlug[c.slug] = { subject, slug: c.slug, title: c.title, puc: c.puc, questions: [] };
  const byTitle = {};
  for (const c of syl[subject]) (byTitle[c.title.toLowerCase()] ||= []).push(c.slug);
  for (const p of idx.papers.filter((x) => x.subject === subject)) {
    const paper = JSON.parse(readFileSync(join(root, 'data/pyq', p.file), 'utf8'));
    for (const q of paper.questions) {
      if (!q.chapter || /^old syllabus/i.test(q.chapter)) continue;
      const slugs = byTitle[String(q.chapter).toLowerCase().trim()];
      if (!slugs) { unplaced++; console.warn(`  no chapter for ${p.file} Q${q.n}: ${q.chapter}`); continue; }
      const out = { id: pyqId(p.year, subject, q.n), year: p.year, n: q.n, file: p.file };
      for (const f of FIELDS) if (q[f] !== undefined) out[f] = q[f];
      for (const s of slugs) bySlug[s].questions.push(out);
      placed++;
    }
  }
  mkdirSync(join(outDir, subject), { recursive: true });
  for (const ch of Object.values(bySlug)) {
    ch.questions.sort((a, b) => b.year - a.year || a.n - b.n);
    const years = [...new Set(ch.questions.map((q) => q.year))];
    writeFileSync(join(outDir, subject, ch.slug + '.json'), JSON.stringify({ ...ch, total: ch.questions.length, years }));
    written++;
  }
  console.log(`${subject}: ${Object.values(bySlug).map((c) => c.questions.length).join(' ')}`);
}
console.log(`Wrote ${written} chapter files, ${placed} questions placed, ${unplaced} unplaced.`);
if (unplaced) process.exit(1);
