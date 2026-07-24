const CACHE_NAME = 'market-sentinel-v3';
const LATEST = new URL('latest_mobile.html', self.registration.scope).href;
const OFFLINE = new URL('offline.html', self.registration.scope).href;
const SHELL = [OFFLINE, new URL('manifest.webmanifest', self.registration.scope).href, new URL('icon.svg', self.registration.scope).href];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(SHELL);
    try {
      const latest = await fetch(LATEST, { cache: 'no-store' });
      if (latest.ok) await cache.put(LATEST, latest.clone());
    } catch (_) {}
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request, { cache: 'no-store' });
    if (response.ok) await cache.put(request.url === LATEST ? LATEST : request, response.clone());
    return response;
  } catch (_) {
    return (await cache.match(request)) || (await cache.match(LATEST)) || (await cache.match(OFFLINE));
  }
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.mode === 'navigate' || url.href === LATEST) {
    event.respondWith(networkFirst(event.request));
  }
});
