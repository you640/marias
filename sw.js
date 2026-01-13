
const CACHE_NAME = 'marias-pro-v1';
const assets = [
  '/',
  '/index.html',
  '/manifest.json',
  '/index.tsx'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(assets))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
