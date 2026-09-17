#!/usr/bin/env node
// Mechanical KaTeX repairs for PYQ files: \,^ and \,_ spacing, double-escaped commands outside environments,
// and matrix row breaks (\\ + row) that must stay double inside \begin{...}...\end{...}.
import fs from 'node:fs';
const KNOWN = new Set('text dfrac frac tfrac sqrt sin cos tan cot sec csc ln log alpha beta gamma delta theta lambda mu pi sigma omega phi cdot cdots vdots ddots ldots times dots end begin left right hline vec hat bar overline underline mathrm mathbf quad qquad infty partial int sum prod le ge ne neq leq geq pm mp to rightarrow Rightarrow Delta Sigma Omega Gamma Theta Lambda Phi Psi epsilon varepsilon eta rho tau nu kappa chi zeta xi upsilon displaystyle textbf operatorname det lim max min hspace tag cdotp circ degree deg mathbb mathcal binom choose langle rangle lfloor rfloor lceil rceil cap cup subset subseteq in notin forall exists neg lor land equiv approx propto perp parallel angle triangle nabla oint iint bigcup bigcap cosec arcsin arccos arctan sinh cosh tanh varphi vartheta varsigma ell hbar Re Im mid nmid because therefore implies iff'.split(' '));
const fixStr = (s) => {
  if (typeof s !== 'string') return s;
  let t = s.replace(/\\,\^/g, '\\,{}^').replace(/\\,_/g, '\\,{}_');
  // Work only inside $...$ math
  t = t.replace(/\$([^$]*)\$/g, (m, math) => {
    let out = '';
    // split into env blocks and plain parts
    const re = /\\begin\{(\w+\*?)\}([\s\S]*?)\\end\{\1\}/g; let last = 0, mm;
    const plain = (x) => x.replace(/\\\\([a-zA-Z]+)/g, '\\$1'); // outside envs: \\word -> \word
    const env = (body) => body.replace(/(?<!\\)\\([a-zA-Z]+)/g, (a, w) => (KNOWN.has(w) ? a : '\\\\' + w)); // inside: unknown \word -> \\word (row break)
    while ((mm = re.exec(math))) { out += plain(math.slice(last, mm.index)) + `\\begin{${mm[1]}}` + env(mm[2]) + `\\end{${mm[1]}}`; last = re.lastIndex; }
    out += plain(math.slice(last));
    return '$' + out + '$';
  });
  return t;
};
const root = new URL('../', import.meta.url).pathname + 'data/pyq/';
const only = process.argv.slice(2);
let files = 0, strings = 0;
for (const f of fs.readdirSync(root).filter((x) => /^\d{4}-\w+\.json$/.test(x))) {
  if (only.length && !only.includes(f)) continue;
  const p = root + f; const d = JSON.parse(fs.readFileSync(p, 'utf8')); let n = 0;
  const F = (v) => { const w = fixStr(v); if (w !== v) n++; return w; };
  for (const q of d.questions) { q.q = F(q.q); q.options = q.options.map(F); q.explanation = F(q.explanation); if (q.note) q.note = F(q.note); }
  if (n) { fs.writeFileSync(p, JSON.stringify(d, null, 2)); files++; strings += n; }
}
console.log(`fix-katex: ${files} files, ${strings} strings changed`);
