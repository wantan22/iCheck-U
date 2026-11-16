/* iCheck-U service worker: keeps the app usable with no internet.
 * - App shell (HTML, JS, CSS, icons) is cached at install, so the app opens offline.
 * - Page navigations: network first, fall back to the cached app (works for every route).
 * - Map tiles: cached as you view them, so areas you have opened stay visible offline.
 */
const SHELL = 'icu-shell-v2';
const TILES = 'icu-tiles-v1';
const MAX_TILES = 600;
const CORE = ['/', '/index.html', '/manifest.webmanifest', '/favicon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL);
    await cache.addAll(CORE);
    // Built asset names are hashed, so read them from index.html and cache them too.
    try {
      const html = await (await fetch('/index.html', { cache: 'no-store' })).text();
      const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((m) => m[1]);
      await cache.addAll(assets);
    } catch { /* offline during install: runtime caching will fill in */ }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keep = [SHELL, TILES];
    for (const key of await caches.keys()) if (!keep.includes(key)) await caches.delete(key);
    await self.clients.claim();
  })());
});

async function trimTiles() {
  const cache = await caches.open(TILES);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - MAX_TILES; i += 1) await cache.delete(keys[i]);
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // OpenStreetMap tiles: cache first, then network (tiles you have seen work offline)
  if (url.hostname.endsWith('tile.openstreetmap.org')) {
    event.respondWith((async () => {
      const cache = await caches.open(TILES);
      const hit = await cache.match(req);
      if (hit) return hit;
      try {
        const res = await fetch(req);
        if (res.ok || res.type === 'opaque') { cache.put(req, res.clone()); trimTiles(); }
        return res;
      } catch {
        return new Response('', { status: 504, statusText: 'Offline' });
      }
    })());
    return;
  }

  if (url.origin !== self.location.origin) return;

  // Page navigations: try the network, fall back to the cached app shell
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const res = await fetch(req);
        const cache = await caches.open(SHELL);
        cache.put('/index.html', res.clone());
        return res;
      } catch {
        return (await caches.match('/index.html')) || (await caches.match('/')) || Response.error();
      }
    })());
    return;
  }

  // Static files: serve from cache, refresh in the background
  event.respondWith((async () => {
    const cache = await caches.open(SHELL);
    const hit = await cache.match(req);
    const network = fetch(req).then((res) => {
      if (res.ok) cache.put(req, res.clone());
      return res;
    }).catch(() => null);
    return hit || (await network) || Response.error();
  })());
});

// Tapping an emergency notification opens (or focuses) the app on the right screen.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const w of wins) {
      if ('focus' in w) { await w.focus(); if ('navigate' in w) w.navigate(url).catch(() => {}); return; }
    }
    await self.clients.openWindow(url);
  })());
});
