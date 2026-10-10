#!/usr/bin/env node
// Builds data/likely/<subject>.json (the "Most likely questions" page) from research/prediction/predict-<year>-<subject>.json.
// Run after `node tools/predict-backtest.mjs --predict <year>`. Usage: node tools/build-likely.mjs [year]
import fs from 'node:fs';
const root = new URL('../', import.meta.url).pathname;
const year = +(process.argv[2] || 2027);
const syl = JSON.parse(fs.readFileSync(root + 'data/syllabus.json', 'utf8'));
fs.mkdirSync(root + 'data/likely', { recursive: true });
for (const s of ['physics', 'chemistry', 'maths']) {
  const p = JSON.parse(fs.readFileSync(`${root}research/prediction/predict-${year}-${s}.json`, 'utf8'));
  const slug = Object.fromEntries(syl[s].map((c) => [c.title, c.slug]));
  const chapters = {};
  for (const x of p.practiceList) {
    if (x.chapter.startsWith('Old syllabus')) continue;
    const ch = (chapters[x.chapter] ||= { title: x.chapter, slug: slug[x.chapter] || null, expected: Math.round(((p.chapterQuota[x.chapter] || 0) * 60) / p.method.list), items: [] });
    const [y, , n] = x.sample.split('-');
    ch.items.push({ id: x.template, name: x.name, desc: x.desc, p: x.probability, asked: x.timesAsked, last: x.lastAsked, sample: { file: `${y}-${s}.json`, n: +n } });
  }
  const list = Object.values(chapters).sort((a, b) => b.expected - a.expected || b.items.length - a.items.length);
  const total = list.reduce((a, c) => a + c.items.length, 0);
  fs.writeFileSync(`${root}data/likely/${s}.json`, JSON.stringify({ subject: s, basedOn: `${Object.keys(p.chapterQuota).length ? 18 : 0} KCET papers 2009-${year - 1}`, total, coverage: { 60: 26, 120: 50, 200: 78 }, chapters: list }));
  console.log(s, list.length, 'chapters', total, 'question types');
}
