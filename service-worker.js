const CACHE_NAME = 'espagnolai-v20';

// Assets statiques à mettre en cache
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon.svg',
];

// Patterns d'URLs dynamiques → toujours network first
const NETWORK_FIRST_PATTERNS = [
  '/api/',
  'api.groq.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
];

// Installation: mise en cache des assets statiques
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activation: suppression des anciens caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Fetch: cache-first pour assets statiques, network-first pour APIs
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // Network-first pour les APIs et fonts
  const isNetworkFirst = NETWORK_FIRST_PATTERNS.some(p => url.includes(p));
  if (isNetworkFirst) {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match(event.request).then(r => r || new Response('', { status: 503 }))
      )
    );
    return;
  }

  // Cache-first pour les assets statiques
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Ne cache que les réponses valides
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        const toCache = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, toCache));
        return response;
      }).catch(() => new Response('', { status: 503 }));
    })
  );
});
