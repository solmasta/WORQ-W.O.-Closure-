// Service worker: lets the app install and open instantly. It keeps only the app's own files (never anything a
// technician types or any photo). Online, it always fetches the newest files first, so the app never goes stale.
const CACHE = 'worq-app-v1';
const SHELL = ['/', '/catalog.js', '/photo.js', '/photo-worker.js', '/sites.json', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/apple-touch-icon.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL).catch(() => {})).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return; // API calls always go straight to the network
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req, { ignoreSearch: true });
    const network = fetch(req).then((res) => { if (res.ok) cache.put(req, res.clone()); return res; });
    try {
      // newest copy when online; if the network is very slow or down, fall back to the saved copy
      return await Promise.race([network, new Promise((_, rej) => setTimeout(() => rej(new Error('slow')), cached ? 4000 : 20000))]);
    } catch (err) {
      return cached || (req.mode === 'navigate' ? await cache.match('/') : undefined) || Response.error();
    }
  })());
});
