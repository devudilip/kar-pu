#!/usr/bin/env node
// Validates data/pyq/<file>.json papers and rebuilds data/pyq/index.json.
import fs from 'node:fs';
const root = new URL('../', import.meta.url).pathname;
const syl = JSON.parse(fs.readFileSync(root + 'data/syllabus.json', 'utf8'));
const dir = root + 'data/pyq/';
const files = fs.readdirSync(dir).filter((f) => /^\d{4}-(physics|chemistry|maths)\.json$/.test(f)).sort();
const only = process.argv[2];
// Key provenance from the research archive's PAIRING-STATUS.tsv (if present)
const prov = {};
const tsv = process.env.PYQ_PAIRING || '/Users/devudilip/projects/ideas/puc/research/kcet-papers/PAIRING-STATUS.tsv';
if (fs.existsSync(tsv)) { const rows = fs.readFileSync(tsv, 'utf8').trim().split('\n').map((r) => r.split('\t')); const h = rows[0]; for (const r of rows.slice(1)) { const o = Object.fromEntries(h.map((k, i) => [k, r[i]])); prov[`${o.year}-${o.subject === 'mathematics' ? 'maths' : o.subject}`] = o; } }
let problems = 0; const papers = [];
for (const f of files) {
  if (only && f !== only) continue;
  let p; try { p = JSON.parse(fs.readFileSync(dir + f, 'utf8')); } catch (e) { console.log('INVALID JSON', f, e.message); problems++; continue; }
  const [year, subject] = f.replace('.json', '').split('-');
  const titles = new Set(syl[subject].map((c) => c.title.toLowerCase()));
  const nums = new Set();
  for (const q of p.questions || []) {
    const bad = [];
    if (!q.q) bad.push('no q');
    if (!Array.isArray(q.options) || q.options.length !== 4 || q.options.some((o) => !String(o).trim())) bad.push('options');
    if (!(Number.isInteger(q.answer) && q.answer >= 0 && q.answer <= 3)) bad.push('answer');
    if (!q.explanation) bad.push('no explanation');
    if (!q.chapter) bad.push('no chapter'); else if (!titles.has(String(q.chapter).toLowerCase()) && !/^old syllabus:/i.test(q.chapter)) bad.push('chapter not in syllabus: ' + q.chapter);
    if (nums.has(q.n)) bad.push('duplicate n'); nums.add(q.n);
    const all = [q.q, ...(q.options || []), q.explanation].join(' '); if ((all.match(/\$/g) || []).length % 2) bad.push('odd $');
    if (bad.length) { console.log(`${f} Q${q.n}: ${bad.join(', ')}`); problems++; }
  }
  const n = (p.questions || []).length;
  if (n < 50 && !p.missing?.length) { console.log(`WARN ${f}: only ${n} questions`); }
  if (!p.code) console.log(`WARN ${f}: no paper code recorded`);
  const pv = prov[`${year}-${subject}`] || {};
  const disputed = (p.questions || []).filter((q) => q.disputed).length;
  papers.push({ year: +year, subject, file: f, count: n, code: p.code || '', disputed, keyProvenance: pv.key_provenance || '', keyFinality: pv.key_finality || '', note: [p.excluded?.length ? `${p.excluded.length} excluded by KEA` : '', p.missing?.length ? `${p.missing.length} missing in source` : ''].filter(Boolean).join(' · ') });
}
if (!only) {
  const idx = JSON.parse(fs.readFileSync(dir + 'index.json', 'utf8'));
  idx.papers = papers.sort((a, b) => b.year - a.year || a.subject.localeCompare(b.subject));
  fs.writeFileSync(dir + 'index.json', JSON.stringify(idx, null, 2));
}
console.log(`${papers.length} papers, ${papers.reduce((a, p) => a + p.count, 0)} questions, ${problems} problems`);
process.exit(problems ? 1 : 0);
