// Poker Trainer Service Worker
// Cache-first strategy for offline play

const CACHE_NAME = 'poker-trainer-v1';

// On install: skip waiting so the new SW activates immediately
self.addEventListener('install', () => {
  self.skipWaiting();
});

// On activate: clean up old caches and claim all clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// On fetch: cache-first, fall back to network, then cache the response
self.addEventListener('fetch', (event) => {
  // Only handle GET requests for same-origin or CDN resources
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        // Only cache successful, basic (same-origin) responses
        if (
          !response ||
          response.status !== 200 ||
          (response.type !== 'basic' && response.type !== 'cors')
        ) {
          return response;
        }

        // Cache a clone (response body can only be consumed once)
        const toCache = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, toCache));
        return response;
      }).catch(() => {
        // If network fails and nothing cached: return offline fallback for navigation
        if (event.request.mode === 'navigate') {
          return caches.match('/poker-trainer/index.html');
        }
      });
    })
  );
});
