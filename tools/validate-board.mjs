#!/usr/bin/env node
// Validates data/board/<subject>/<slug>.json files and reports coverage of 2nd PUC chapters.
import fs from 'node:fs';
const root = new URL('../', import.meta.url).pathname;
const syl = JSON.parse(fs.readFileSync(root + 'data/syllabus.json', 'utf8'));
let problems = 0, files = 0, qs = 0; const missing = [];
for (const s of ['physics', 'chemistry', 'maths']) for (const c of syl[s]) {
  if (c.puc !== 2) continue;
  const p = `${root}data/board/${s}/${c.slug}.json`;
  if (!fs.existsSync(p)) { missing.push(`${s}/${c.slug}`); continue; }
  files++;
  let d; try { d = JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { console.log('INVALID JSON', p); problems++; continue; }
  if (!d.pattern || d.pattern.length < 60) { console.log(`${s}/${c.slug}: pattern missing/short`); problems++; }
  const ids = new Set();
  for (const q of d.questions || []) {
    qs++; const bad = [];
    if (!q.q || !q.answer) bad.push('q/answer');
    if (![1, 2, 3, 5].includes(q.marks)) bad.push('marks');
    if (!['very often', 'often', 'sometimes'].includes(q.frequency)) bad.push('frequency');
    if (!Array.isArray(q.keywords) || !q.keywords.length) bad.push('keywords');
    if (ids.has(q.id)) bad.push('dup id'); ids.add(q.id);
    if (((q.q + q.answer).match(/\$/g) || []).length % 2) bad.push('odd $');
    if (/\\,\^/.test(q.q + q.answer)) bad.push('\\,^');
    if (bad.length) { console.log(`${s}/${c.slug} ${q.id}: ${bad.join(', ')}`); problems++; }
  }
  if ((d.questions || []).length < 12) { console.log(`${s}/${c.slug}: only ${(d.questions || []).length} questions`); problems++; }
}
console.log(`${files} board files, ${qs} questions, ${problems} problems, ${missing.length} 2nd-PUC chapters missing${missing.length ? ': ' + missing.join(', ') : ''}`);
process.exit(problems ? 1 : 0);
