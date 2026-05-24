const CACHE = 'espanol-ai-v1';
const SHELL = ['./index.html', './app.js', './style.css', './icons/icon.svg', './manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // Only cache same-origin shell requests — never intercept Ollama API calls
  const url = new URL(e.request.url);
  if (url.port === '11434') return;
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
