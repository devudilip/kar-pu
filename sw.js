/* KCET Prep service worker: offline-first for app shell, network-first for data with cache fallback. */
const VERSION = 'kcet-v24';
const SHELL = [
  './', './manifest.webmanifest', './css/style.css',
  './js/app.js', './js/router.js', './js/store.js', './js/data.js', './js/ui.js',
  './js/views/home.js', './js/views/subject.js', './js/views/chapter.js',
  './js/views/tests.js', './js/views/exam.js', './js/views/result.js',
  './js/views/pyq.js', './js/views/progress.js', './js/views/settings.js', './js/views/today.js', './js/views/flashcards.js', './js/views/speed.js', './js/views/tour.js', './js/views/report.js', './js/views/sheet.js', './js/views/examday.js', './css/sheet.css', './js/views/plan.js', './js/views/rank.js', './data/rank-bands.json',
  './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png',
  './data/syllabus.json', './data/pyq/index.json', './data/flashcards/physics.json', './data/flashcards/chemistry.json', './data/flashcards/maths.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then(async (c) => { for (const u of SHELL) { try { const r = await fetch(u + (u.includes('?') ? '&' : '?') + 'v=' + VERSION, { cache: 'no-cache' }); if (r.ok && !r.redirected) await c.put(u, r); } catch {} } }).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Never cache a redirected response: Safari refuses to use it ("Response served by service worker has redirections").
const cacheable = (res, url) => res && res.ok && !res.redirected && (url.origin === location.origin || url.hostname === 'cdn.jsdelivr.net' || url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com');

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Page navigations: network first, app shell from cache when offline.
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match('./')));
    return;
  }

  // Question data: network first (so new questions arrive), fall back to cache.
  if (url.pathname.includes('/data/')) {
    e.respondWith(
      fetch(req, { cache: 'no-cache' }).then((res) => {
        if (cacheable(res, url)) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
        return res;
      }).catch(() => caches.match(req))
    );
    return;
  }

  // Everything else (shell, KaTeX CDN): cache first, then network and store.
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (cacheable(res, url)) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
      return res;
    }))
  );
});

self.addEventListener('message', (e) => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});
