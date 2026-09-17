#!/usr/bin/env node
// Sets each chapter's "weight" in data/syllabus.json to the average number of KCET questions in the last 5 papers (min 1).
import fs from 'node:fs';
const root = new URL('../', import.meta.url).pathname;
const syl = JSON.parse(fs.readFileSync(root + 'data/syllabus.json', 'utf8'));
const idx = JSON.parse(fs.readFileSync(root + 'data/pyq/index.json', 'utf8'));
const years = [...new Set(idx.papers.map((p) => p.year))].sort((a, b) => b - a).slice(0, 5);
const counts = {};
for (const p of idx.papers.filter((p) => years.includes(p.year))) {
  const paper = JSON.parse(fs.readFileSync(root + 'data/pyq/' + p.file, 'utf8'));
  for (const q of paper.questions) {
    const key = String(q.chapter || '').toLowerCase();
    const matches = syl[p.subject].filter((c) => c.title.toLowerCase() === key || c.slug === key);
    const c = matches.length > 1 ? (matches.find((x) => x.puc === 2) || matches[0]) : matches[0];
    if (c) counts[p.subject + '/' + c.slug] = (counts[p.subject + '/' + c.slug] || 0) + 1;
  }
}
let changed = 0;
for (const s of Object.keys(syl)) for (const c of syl[s]) {
  const avg = (counts[s + '/' + c.slug] || 0) / years.length;
  const w = Math.max(1, Math.round(avg));
  if (w !== c.weight) { c.weight = w; changed++; }
  c.pyqAvg = Math.round(avg * 10) / 10;
}
fs.writeFileSync(root + 'data/syllabus.json', JSON.stringify(syl, null, 2));
console.log(`weights from KCET ${years.join(', ')}: ${changed} chapters changed`);
