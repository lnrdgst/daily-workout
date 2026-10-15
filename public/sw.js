const CACHE_NAME = 'daily-workout-v2';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll([
        '/',
        '/manifest.webmanifest',
        '/manifest.webmanifest?v=teal-1',
        '/manifest.webmanifest?v=teal-2',
        '/favicon.svg',
        '/favicon.svg?v=teal-1',
        '/favicon.ico?v=teal-2',
        '/favicon-32.teal-2.png',
        '/apple-touch-icon.teal-2.png',
        '/icon-192.svg',
        '/icon-192.svg?v=teal-1',
        '/icon-512.svg',
        '/icon-512.svg?v=teal-1',
        '/icon-192.teal-2.png',
        '/icon-512.teal-2.png',
        '/icon-maskable-192.teal-2.png',
        '/icon-maskable-512.teal-2.png',
      ]),
    ),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
          return Promise.resolve(false);
        }),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        return cache.match('/');
      }),
    );
    return;
  }

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  // Vite reutiliza as mesmas URLs de modulo durante o desenvolvimento.
  // Cachea-las faria o service worker servir codigo antigo apos uma alteracao.
  const isViteModuleRequest =
    requestUrl.pathname.startsWith('/src/') ||
    requestUrl.pathname.startsWith('/@vite/') ||
    requestUrl.pathname.startsWith('/node_modules/') ||
    requestUrl.pathname === '/@react-refresh';

  if (isViteModuleRequest) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request)
        .then((response) => {
          const clonedResponse = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clonedResponse);
          });
          return response;
        })
        .catch(() => caches.match('/'));
    }),
  );
});
