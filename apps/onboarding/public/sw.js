const CACHE_VERSION = 2;
const CACHE_NAME = `ph-cache-v${CACHE_VERSION}`;
const OFFLINE_URL = '/offline.html';

const PRECACHE_ASSETS = [
  '/',
  '/offline.html',
  '/favicon.ico',
  '/logo192.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (
    request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    (url.protocol !== 'http:' && url.protocol !== 'https:') ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/socket.io/')
  ) {
    return;
  }

  if (url.pathname.startsWith('/assets/') || url.pathname.match(/\.(js|css|png|jpg|webp|avif|svg|woff2?)$/)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, clone).catch(() => {});
            });
          }
          return response;
        });
      })
    );
    return;
  }

  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, clone).catch(() => {});
            });
          }
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match(OFFLINE_URL)))
    );
    return;
  }

  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
