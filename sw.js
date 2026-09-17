/* KCET Prep service worker: offline-first for app shell, network-first for data with cache fallback. */
const VERSION = 'kcet-v10';
const SHELL = [
  './', './index.html', './manifest.webmanifest', './css/style.css',
  './js/app.js', './js/router.js', './js/store.js', './js/data.js', './js/ui.js',
  './js/views/home.js', './js/views/subject.js', './js/views/chapter.js',
  './js/views/tests.js', './js/views/exam.js', './js/views/result.js',
  './js/views/pyq.js', './js/views/progress.js', './js/views/settings.js', './js/views/today.js', './js/views/flashcards.js', './js/views/speed.js', './js/views/plan.js', './js/views/rank.js', './data/rank-bands.json',
  './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png',
  './data/syllabus.json', './data/pyq/index.json', './data/flashcards/physics.json', './data/flashcards/chemistry.json', './data/flashcards/maths.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Question data: network first (so new questions arrive), fall back to cache.
  if (url.pathname.includes('/data/')) {
    e.respondWith(
      fetch(req, { cache: 'no-cache' }).then((res) => {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req))
    );
    return;
  }

  // Everything else (shell, KaTeX CDN): cache first, then network and store.
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok && (url.origin === location.origin || url.hostname === 'cdn.jsdelivr.net' || url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com')) {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(req, copy));
      }
      return res;
    }).catch(() => (req.mode === 'navigate' ? caches.match('./index.html') : undefined)))
  );
});

self.addEventListener('message', (e) => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});
