// Run: node tests/theme.test.mjs   — tests js/theme.js (auto/light/dark, storage, theme-color meta) with a fake DOM.
import assert from 'node:assert/strict';

const mem = {}; globalThis.localStorage = { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: (k) => { delete mem[k]; } };
const meta = { attrs: {}, setAttribute(k, v) { this.attrs[k] = v; } };
globalThis.document = { documentElement: { dataset: {} }, querySelector: () => meta, head: { appendChild() {} } };
globalThis.getComputedStyle = () => ({ getPropertyValue: () => '' }); // stylesheet not loaded: use fallbacks
let sysDark = false; const listeners = [];
globalThis.matchMedia = () => ({ get matches() { return sysDark; }, addEventListener: (_, fn) => listeners.push(fn) });

const { initTheme, setTheme, getTheme, themeControlHtml } = await import('../js/theme.js');
const root = document.documentElement;
let passed = 0; const t = (name, fn) => { fn(); passed++; console.log('ok  ', name); };

t('default is auto, follows a light system', () => { assert.equal(initTheme(), 'light'); assert.equal(getTheme(), 'auto'); assert.equal(root.dataset.theme, 'light'); assert.equal(meta.attrs.content, '#fbf1ec'); });
t('auto follows a system switch to dark live', () => { sysDark = true; listeners.forEach((f) => f()); assert.equal(root.dataset.theme, 'dark'); assert.equal(meta.attrs.content, '#1b1512'); });
t('explicit light overrides a dark system and is stored', () => { assert.equal(setTheme('light'), 'light'); assert.equal(mem['kcet.theme'], 'light'); listeners.forEach((f) => f()); assert.equal(root.dataset.theme, 'light'); });
t('explicit dark', () => { sysDark = false; assert.equal(setTheme('dark'), 'dark'); assert.equal(root.dataset.theme, 'dark'); });
t('junk value falls back to auto', () => { mem['kcet.theme'] = 'purple'; assert.equal(getTheme(), 'auto'); assert.equal(initTheme(), 'light'); });
t('control marks the current mode pressed', () => { setTheme('dark'); const h = themeControlHtml(); assert.match(h, /data-theme-set="dark" aria-pressed="true"/); assert.match(h, /data-theme-set="auto" aria-pressed="false"/); });
console.log(`\n${passed} passed`);
