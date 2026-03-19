const CACHE_NAME = 'natal-chart-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.30.1/moment.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/moment-timezone/0.5.45/moment-timezone-with-data.min.js',
  'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500&family=DM+Sans:wght@400;500;600&display=swap'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // Для API геокодинга — только онлайн (не кешируем)
  if (e.request.url.includes('geocoding-api.open-meteo.com')) {
    e.respondWith(fetch(e.request).catch(() => new Response('{"results":[]}', { headers: { 'Content-Type': 'application/json' } })));
    return;
  }
  // Для WASM и CDN — cache first, then network
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(resp => {
        if (resp.ok) {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return resp;
      });
    }).catch(() => new Response('Нет соединения', { status: 503 }))
  );
});
