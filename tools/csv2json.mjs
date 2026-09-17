#!/usr/bin/env node
// Convert a spreadsheet (CSV) of questions to the app's JSON format.
// Usage:
//   node tools/csv2json.mjs questions.csv > out.json
//   node tools/csv2json.mjs questions.csv --merge data/questions/physics/laws-of-motion.json
//   node tools/csv2json.mjs kcet2024-physics.csv --pyq "KCET 2024 Physics" --subject physics > data/pyq/2024-physics.json
//
// CSV columns (header row required, order does not matter):
//   id, question, a, b, c, d, answer (A/B/C/D or 1-4), explanation, difficulty (easy|medium|hard), tags, tip, chapter
// Use $...$ for maths (KaTeX). Wrap cells containing commas or newlines in double quotes.
import fs from 'node:fs';

const args = process.argv.slice(2);
const file = args[0];
if (!file) { console.error('Usage: node tools/csv2json.mjs <file.csv> [--merge chapter.json] [--pyq "Title" --subject physics]'); process.exit(1); }
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };

function parseCSV(text) {
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim()));
}

const rows = parseCSV(fs.readFileSync(file, 'utf8'));
const header = rows[0].map((h) => h.trim().toLowerCase());
const col = (r, name) => { const i = header.indexOf(name); return i >= 0 ? (r[i] || '').trim() : ''; };
const questions = rows.slice(1).map((r, n) => {
  const ans = col(r, 'answer').toUpperCase();
  const answer = 'ABCD'.includes(ans) && ans ? 'ABCD'.indexOf(ans) : (parseInt(ans, 10) - 1);
  if (!(answer >= 0 && answer <= 3)) throw new Error(`Row ${n + 2}: bad answer "${ans}"`);
  const q = { id: col(r, 'id') || undefined, q: col(r, 'question'), options: [col(r, 'a'), col(r, 'b'), col(r, 'c'), col(r, 'd')], answer, explanation: col(r, 'explanation') || undefined };
  if (col(r, 'difficulty')) q.difficulty = col(r, 'difficulty').toLowerCase();
  if (col(r, 'tags')) q.tags = col(r, 'tags').split(';').map((t) => t.trim()).filter(Boolean);
  if (col(r, 'tip')) q.tip = col(r, 'tip');
  if (col(r, 'chapter')) q.chapter = col(r, 'chapter');
  return q;
});

const merge = opt('--merge');
if (merge) {
  const existing = JSON.parse(fs.readFileSync(merge, 'utf8'));
  const ids = new Set(existing.questions.map((q) => q.id));
  const added = questions.filter((q) => !ids.has(q.id));
  existing.questions.push(...added);
  fs.writeFileSync(merge, JSON.stringify(existing, null, 2));
  console.error(`Merged ${added.length} new questions into ${merge}`);
} else if (opt('--pyq')) {
  console.log(JSON.stringify({ title: opt('--pyq'), subject: opt('--subject'), source: 'KEA official question paper + final key', questions }, null, 2));
} else {
  console.log(JSON.stringify({ notes: '', questions }, null, 2));
}
