// Light / dark theme. Stored in localStorage 'kcet.theme' as 'light' | 'dark' | 'auto' (default).
// 'auto' follows the phone's system setting (prefers-color-scheme) and updates live when it changes.
// The resolved theme is written to <html data-theme="light|dark">; css/style.css does the rest.

const KEY = 'kcet.theme';
const MODES = ['auto', 'light', 'dark'];
const FALLBACK_BG = { light: '#fbf1ec', dark: '#1b1512' };
let mql = null;

function readMode() {
  try {
    const v = localStorage.getItem(KEY);
    return MODES.includes(v) ? v : 'auto';
  } catch { return 'auto'; }
}

export function getTheme() { return readMode(); }

function systemDark() {
  return !!(mql && mql.matches);
}

function apply(mode) {
  const resolved = mode === 'auto' ? (systemDark() ? 'dark' : 'light') : mode;
  const root = document.documentElement;
  root.dataset.theme = resolved;
  root.dataset.themeMode = mode;
  let bg = '';
  try { bg = getComputedStyle(root).getPropertyValue('--bg').trim(); } catch { /* ignore */ }
  // The stylesheet may not be parsed yet; fall back to the known values.
  if (!bg) bg = FALLBACK_BG[resolved];
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', bg);
  return resolved;
}

export function initTheme() {
  if (typeof matchMedia === 'function' && !mql) {
    mql = matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => { if (readMode() === 'auto') apply('auto'); };
    if (mql.addEventListener) mql.addEventListener('change', onChange);
    else if (mql.addListener) mql.addListener(onChange);
  }
  return apply(readMode());
}

export function setTheme(mode) {
  if (!MODES.includes(mode)) mode = 'auto';
  try { localStorage.setItem(KEY, mode); } catch { /* private mode: still apply for this session */ }
  return apply(mode);
}

export function themeControlHtml() {
  const cur = readMode();
  const btn = (m, label) => `<button type="button" data-theme-set="${m}" aria-pressed="${cur === m}">${label}</button>`;
  return `<div class="seg" role="group" aria-label="Theme">${btn('auto', 'Auto')}${btn('light', 'Light')}${btn('dark', 'Dark')}</div>`;
}

export function bindThemeControl(root) {
  if (!root) return;
  const buttons = root.querySelectorAll('[data-theme-set]');
  buttons.forEach((b) => b.addEventListener('click', () => {
    setTheme(b.dataset.themeSet);
    buttons.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  }));
}
