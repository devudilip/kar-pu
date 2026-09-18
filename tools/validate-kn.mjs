#!/usr/bin/env node
// Checks Kannada translation files against the English source: completeness, formula fidelity, Kannada script share.
import fs from 'node:fs';
const root = new URL('../', import.meta.url).pathname;
const syl = JSON.parse(fs.readFileSync(root + 'data/syllabus.json', 'utf8'));
const mathOf = (s) => (String(s).match(/\$[^$]*\$/g) || []).map((m) => m.replace(/\s+/g, '')).sort().join('|');
const knShare = (s) => { const t = String(s).replace(/\$[^$]*\$/g, '').replace(/<[^>]+>/g, '').replace(/\([^)]*\)/g, '').replace(/[^\p{L}]/gu, ''); const latin = (t.match(/[A-Za-z]/g) || []).length; if (t.length < 25 || latin < 15) return 1; const kn = (t.match(/[ಀ-೿]/g) || []).length; return kn / t.length; };
let files = 0, missing = [], problems = 0, total = 0;
for (const s of ['physics', 'chemistry', 'maths']) for (const c of syl[s]) {
  const ep = `${root}data/questions/${s}/${c.file}`, kp = `${root}data/kn/${s}/${c.file}`;
  if (!fs.existsSync(kp)) { missing.push(`${s}/${c.slug}`); continue; }
  files++;
  let kn; try { kn = JSON.parse(fs.readFileSync(kp, 'utf8')); } catch (e) { console.log('INVALID JSON', kp); problems++; continue; }
  const en = JSON.parse(fs.readFileSync(ep, 'utf8'));
  if (!kn.notes || kn.notes.length < 300) { console.log(`${s}/${c.slug}: notes missing/short`); problems++; }
  else if (knShare(kn.notes) < 0.5) { console.log(`${s}/${c.slug}: notes not mostly Kannada (${Math.round(100 * knShare(kn.notes))}%)`); problems++; }
  for (const q of en.questions) {
    total++;
    const t = kn.explanations?.[q.id];
    if (!t) { console.log(`${q.id}: no translation`); problems++; continue; }
    if ((t.match(/\$/g) || []).length % 2) { console.log(`${q.id}: unbalanced $`); problems++; }
    if (knShare(t) < 0.4) { console.log(`${q.id}: not Kannada (${Math.round(100 * knShare(t))}%)`); problems++; }
    const a = mathOf(q.explanation), b = mathOf(t);
    if (a !== b) { const ea = a.split('|').filter(Boolean), eb = b.split('|').filter(Boolean); const lost = ea.filter((x) => !eb.includes(x)); if (lost.length > Math.max(1, ea.length * 0.34)) { console.log(`${q.id}: formulas differ (${lost.length}/${ea.length} lost)`); problems++; } }
  }
}
console.log(`\n${files} kn files, ${total} explanations checked, ${problems} problems, ${missing.length} chapters without kn file`);
if (missing.length) console.log(missing.join(', '));
process.exit(problems ? 1 : 0);
