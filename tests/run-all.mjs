// Run: node tests/run-all.mjs   — runs every tests/*.test.mjs in its own node process, one after another; exits 1 if any fails.
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const dir = fileURLToPath(new URL('.', import.meta.url));
const files = readdirSync(dir).filter((f) => f.endsWith('.test.mjs')).sort();
let failed = 0;
for (const f of files) {
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [dir + f], { encoding: 'utf8' });
  const out = (r.stdout || '') + (r.stderr || '');
  const ok = r.status === 0;
  const last = out.trim().split('\n').filter(Boolean).pop() || '';
  const skips = (out.match(/KNOWN BUG:/g) || []).length;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${f}  (${Date.now() - t0} ms)${ok ? '  ' + last.trim() : ''}${ok && skips && !/KNOWN BUG/.test(last) ? `  [${skips} known bug]` : ''}`);
  if (!ok) { failed++; console.log(out.replace(/^/gm, '      ')); }
}
console.log(`\n${files.length - failed}/${files.length} test files passed`);
process.exit(failed ? 1 : 0);
