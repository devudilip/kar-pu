import { route, start } from './router.js';
import { toast } from './ui.js';
import { store } from './store.js';
window.__store = store;
import home from './views/home.js';
import subject from './views/subject.js';
import chapter from './views/chapter.js';
import tests from './views/tests.js';
import exam from './views/exam.js';
import result from './views/result.js';
import pyq from './views/pyq.js';
import progress from './views/progress.js';
import settings from './views/settings.js';
import today from './views/today.js';
import flashcards from './views/flashcards.js';
import speed from './views/speed.js';
import plan from './views/plan.js';
import rank from './views/rank.js';

route('home', home);
route('subject', subject);
route('chapter', chapter);
route('tests', tests);
route('exam', exam);
route('result', result);
route('pyq', pyq);
route('progress', progress);
route('settings', settings);
route('today', today);
route('flashcards', flashcards);
route('speed', speed);
route('plan', plan);
route('rank', rank);
route('*', () => { const d = document.createElement('div'); d.className = 'empty'; d.textContent = 'Page not found.'; return d; });

const app = document.getElementById('app');
let cleanup = null;

start(async (build, name) => {
  if (typeof cleanup === 'function') { try { cleanup(); } catch {} cleanup = null; }
  window.scrollTo(0, 0);
  document.querySelectorAll('.bottomnav a').forEach((a) => a.classList.toggle('active', a.dataset.nav === name || (name === 'subject' || name === 'chapter') && a.dataset.nav === 'home' || (name === 'exam' || name === 'result' || name === 'speed' || name === 'pyq') && a.dataset.nav === 'tests' || (name === 'plan' || name === 'rank') && a.dataset.nav === 'progress'));
  app.innerHTML = '<div class="loading">Loading…</div>';
  try {
    const node = await build();
    app.innerHTML = '';
    if (node) { app.appendChild(node); cleanup = node._cleanup || null; }
  } catch (e) {
    console.error(e);
    app.innerHTML = `<div class="card"><h2>Something went wrong</h2><p class="muted">${e.message}</p><a class="btn" href="#/">Go home</a></div>`;
  }
});

// PWA install prompt
let deferredPrompt = null;
const installBtn = document.getElementById('installBtn');
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; installBtn.classList.remove('hidden'); });
installBtn.addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  if (outcome === 'accepted') toast('App installed. Works offline now.');
  deferredPrompt = null; installBtn.classList.add('hidden');
});
window.addEventListener('appinstalled', () => installBtn.classList.add('hidden'));

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').then((reg) => {
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        nw?.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) toast('Update ready. Close and reopen the app.', 4000);
        });
      });
    }).catch((e) => console.warn('SW failed', e));
  });
}
window.addEventListener('offline', () => toast('You are offline. Saved chapters still work.'));
