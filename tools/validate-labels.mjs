#!/usr/bin/env node
// Checks research/prediction/labels/<subject>.jsonl against templates/<subject>.json and the PYQ archive.
import fs from 'node:fs';
const root = new URL('../', import.meta.url).pathname;
const subject = process.argv[2]; if (!subject) { console.log('usage: node tools/validate-labels.mjs <physics|chemistry|maths>'); process.exit(2); }
const tpl = JSON.parse(fs.readFileSync(`${root}research/prediction/templates/${subject}.json`, 'utf8'));
const tids = new Map(tpl.templates.map((t) => [t.id, t]));
const lines = fs.existsSync(`${root}research/prediction/labels/${subject}.jsonl`) ? fs.readFileSync(`${root}research/prediction/labels/${subject}.jsonl`, 'utf8').trim().split('\n').filter(Boolean) : [];
const labels = new Map(); let problems = 0;
for (const l of lines) { let o; try { o = JSON.parse(l); } catch { console.log('bad json line:', l.slice(0, 80)); problems++; continue; } if (labels.has(o.id)) { console.log('duplicate label', o.id); problems++; } labels.set(o.id, o.template); }
const byChapter = {}; let total = 0, missing = 0, unknown = 0, chapterMismatch = 0; const use = new Map();
for (let y = 2009; y <= 2026; y++) {
  const d = JSON.parse(fs.readFileSync(`${root}data/pyq/${y}-${subject}.json`, 'utf8'));
  for (const q of d.questions) {
    total++; const id = `${y}-${subject}-${q.n}`; const t = labels.get(id);
    if (!t) { missing++; if (missing <= 5) console.log('unlabelled', id); continue; }
    if (!tids.has(t)) { unknown++; if (unknown <= 10) console.log('unknown template', id, t); continue; }
    use.set(t, (use.get(t) || 0) + 1);
    if (tids.get(t).chapter !== q.chapter) { chapterMismatch++; if (chapterMismatch <= 10) console.log('chapter mismatch', id, q.chapter, '->', t, tids.get(t).chapter); }
  }
}
for (const t of tpl.templates) { if (!t.id || !t.chapter || !t.name) { console.log('template missing id/chapter/name', JSON.stringify(t).slice(0, 80)); problems++; } }
const unused = tpl.templates.filter((t) => !use.has(t.id)).length;
const sizes = [...use.values()].sort((a, b) => b - a);
console.log(`${subject}: ${total} questions, ${labels.size} labelled, ${missing} missing, ${unknown} unknown template ids, ${chapterMismatch} chapter mismatches, ${tpl.templates.length} templates (${unused} unused), largest template ${sizes[0] || 0} questions, singletons ${sizes.filter((x) => x === 1).length}`);
process.exit(problems || missing || unknown ? 1 : 0);
