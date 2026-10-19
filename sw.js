// Offline shell: serve from cache, refresh the cache in the background.
const CACHE = 'nooruz-v3';
const ASSETS = ['./', './index.html', './app.html', './styles.css', './mockup.css', './mockup.js', './app.js', './logic.js', './data.js', './manifest.webmanifest', './icons/icon.svg', './icons/icon-192.png'];

self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS))); self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith(caches.open(CACHE).then(async cache => {
    const hit = await cache.match(req, { ignoreSearch: true });
    const net = fetch(req).then(res => { if (res.ok && (res.type === 'basic' || res.type === 'cors')) cache.put(req, res.clone()); return res; }).catch(() => hit);
    return hit || net;
  }));
});
