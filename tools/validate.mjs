#!/usr/bin/env node
// Validates every chapter file listed in data/syllabus.json and writes question counts back into it.
import fs from 'node:fs';
const root = new URL('../', import.meta.url).pathname;
const sylPath = root + 'data/syllabus.json';
const syl = JSON.parse(fs.readFileSync(sylPath, 'utf8'));
const ids = new Set(); let total = 0, problems = 0, missing = [];
for (const s of ['physics', 'chemistry', 'maths']) for (const c of syl[s]) {
  const p = `${root}data/questions/${s}/${c.file}`;
  if (!fs.existsSync(p)) { missing.push(`${s}/${c.slug}`); c.count = 0; continue; }
  let d; try { d = JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { console.log('INVALID JSON', p, e.message); problems++; c.count = 0; continue; }
  const qs = d.questions || [];
  qs.forEach((q, i) => {
    const bad = [];
    if (!q.id) bad.push('no id'); else if (ids.has(q.id)) bad.push('duplicate id'); ids.add(q.id);
    if (!q.q) bad.push('no question');
    if (!Array.isArray(q.options) || q.options.length !== 4 || q.options.some((o) => !String(o).trim())) bad.push('options');
    if (!(Number.isInteger(q.answer) && q.answer >= 0 && q.answer <= 3)) bad.push('answer');
    if (!q.explanation) bad.push('no explanation');
    if (q.difficulty && !['easy', 'medium', 'hard'].includes(q.difficulty)) bad.push('difficulty');
    if (bad.length) { console.log(`${s}/${c.slug} #${i + 1} ${q.id || ''}: ${bad.join(', ')}`); problems++; }
  });
  if (qs.length < 10) console.log(`WARN ${s}/${c.slug}: only ${qs.length} questions`);
  if (!d.notes || d.notes.length < 400) console.log(`WARN ${s}/${c.slug}: notes short/missing`);
  c.count = qs.length; total += qs.length;
}
fs.writeFileSync(sylPath, JSON.stringify(syl, null, 2));
console.log(`\n${total} questions, ${problems} problems, ${missing.length} chapters without files`);
if (missing.length) console.log(missing.join(', '));
process.exit(problems ? 1 : 0);
