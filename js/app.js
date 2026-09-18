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
import { showTour } from './views/tour.js';
import report from './views/report.js';
import sheet from './views/sheet.js';

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
route('report', report);
route('sheet', sheet);
route('*', () => { const d = document.createElement('div'); d.className = 'empty'; d.textContent = 'Page not found.'; return d; });

const app = document.getElementById('app');
// Global loading indicator driven by data.js progress events
const loader = document.createElement('div'); loader.id = 'loader'; loader.className = 'loader hidden'; loader.innerHTML = '<div class="loader-box"><div class="spin"></div><div class="loader-text">Loading…</div><div class="progress"><span style="width:0%"></span></div><div class="muted" style="font-size:.8rem;margin-top:6px">First time on a chapter needs internet. After that it works offline.</div></div>';
document.body.appendChild(loader);
let loaderTimer;
window.addEventListener('kcet:loading', (e) => {
  const { done, total, label } = e.detail;
  loader.querySelector('.loader-text').textContent = `${label} ${done}/${total}`;
  loader.querySelector('.progress span').style.width = (total ? 100 * done / total : 0) + '%';
  clearTimeout(loaderTimer);
  if (done >= total) loaderTimer = setTimeout(() => loader.classList.add('hidden'), 250); else loader.classList.remove('hidden');
});
let cleanup = null;

if (!store.get().settings.onboarded) setTimeout(showTour, 400);

start(async (build, name) => {
  if (typeof cleanup === 'function') { try { cleanup(); } catch {} cleanup = null; }
  window.scrollTo(0, 0);
  document.querySelectorAll('.bottomnav a').forEach((a) => a.classList.toggle('active', a.dataset.nav === name || (name === 'subject' || name === 'chapter' || name === 'sheet') && a.dataset.nav === 'home' || (name === 'exam' || name === 'result' || name === 'speed' || name === 'pyq') && a.dataset.nav === 'tests' || (name === 'plan' || name === 'rank' || name === 'report') && a.dataset.nav === 'progress'));
  app.innerHTML = '<div class="loading"><div class="spin"></div>Loading…</div>';
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
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; window.__installPrompt = e; installBtn.classList.remove('hidden'); window.dispatchEvent(new Event('kcet:installable')); });
installBtn.addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  if (outcome === 'accepted') toast('App installed. Works offline now.');
  deferredPrompt = null; installBtn.classList.add('hidden');
});
window.addEventListener('appinstalled', () => installBtn.classList.add('hidden'));

if ('serviceWorker' in navigator) {
  // When a new version takes control, reload once so the page runs the new code (not on first install).
  let hadController = !!navigator.serviceWorker.controller, refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadController && !refreshing) { refreshing = true; toast('Updating to the latest version…', 1500); setTimeout(() => location.reload(), 600); } hadController = true; });
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').then((reg) => {
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        nw?.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) toast('New version ready…', 2000);
        });
      });
    }).catch((e) => console.warn('SW failed', e));
  });
}
window.addEventListener('offline', () => toast('You are offline. Saved chapters still work.'));
