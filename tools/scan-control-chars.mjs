#!/usr/bin/env node
// Finds control characters inside JSON string values. They appear when LaTeX is written with a single
// backslash in JSON: "\tan" -> TAB + "an", "\frac" -> FORM FEED + "rac", "\beta" -> BACKSPACE + "eta",
// "\nu"/"\neq" -> NEWLINE + ..., "\rho" -> CARRIAGE RETURN + "ho". Pass --fix to repair them.
import fs from 'node:fs'; import path from 'node:path';
const root = new URL('../', import.meta.url).pathname; const fix = process.argv.includes('--fix');
const NAMES = { 8: 'b', 9: 't', 12: 'f', 13: 'r' }; // newline (10) is legitimate in question text; only flagged when it starts a LaTeX command
const NL_CMDS = ['nu', 'neq', 'ne', 'nabla', 'neg', 'notin', 'nmid', 'not'];
const isLetter = (ch) => ch !== undefined && ((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z'));
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? (e.name === 'raw' ? [] : walk(path.join(d, e.name))) : e.name.endsWith('.json') ? [path.join(d, e.name)] : []);
let found = 0, fixedFiles = 0;
for (const f of walk(root + 'data')) {
  let changed = false;
  const visit = (v, p) => {
    if (typeof v === 'string') {
      let out = '';
      for (let i = 0; i < v.length; i++) {
        const c = v.charCodeAt(i);
        const rest = v.slice(i + 1, i + 6);
        const nlCmd = c === 10 && NL_CMDS.some((w) => ('n' + rest).startsWith(w) && !isLetter(('n' + rest)[w.length]) && v.lastIndexOf('$', i) > v.lastIndexOf(' ', i) - 40 && (v.slice(0, i).split('$').length % 2 === 0));
        const suspicious = c < 32 && c !== 10 ? (NAMES[c] ? isLetter(v[i + 1]) : true) : nlCmd;
        if (suspicious) { found++; console.log(`${path.relative(root, f)} ${p}: code ${c} before "${v.slice(i + 1, i + 8)}"`); if (NAMES[c] || nlCmd) { out += '\\' + (NAMES[c] || 'n'); changed = true; continue; } }
        out += v[i];
      }
      return out;
    }
    if (Array.isArray(v)) return v.map((x, i) => visit(x, `${p}[${i}]`));
    if (v && typeof v === 'object') { for (const k of Object.keys(v)) v[k] = visit(v[k], `${p}.${k}`); return v; }
    return v;
  };
  let data; try { data = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { console.log('PARSE ERROR', f, e.message); continue; }
  data = visit(data, '');
  if (fix && changed) { fs.writeFileSync(f, JSON.stringify(data, null, 2)); fixedFiles++; }
}
console.log(`\n${found} control characters found${fix ? `, ${fixedFiles} files repaired` : ''}`);
process.exit(found && !fix ? 1 : 0);
