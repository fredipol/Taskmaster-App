const CACHE_NAME = 'taskmaster-app-v3';
const APP_FILES = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './special-elite.ttf',
  './Crimson%20Wax%20Seal%20with%20ST%20Imprint.png',
  './music.mp3',
  './Little%20Fred%20and%20the%20Pebble.m4a'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const clients = await self.clients.matchAll({includeUncontrolled:true, type:'window'});
    for (const [index, file] of APP_FILES.entries()) {
      await cache.add(file);
      const progress = {type:'offline-cache-progress', completed:index+1, total:APP_FILES.length, file:file.split('/').pop() || 'app page'};
      clients.forEach(client => client.postMessage(progress));
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith('taskmaster-app-') && name !== CACHE_NAME)
      .map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cached = await caches.match(event.request);
    if (cached) return cached;
    try {
      return await fetch(event.request);
    } catch {
      if (event.request.mode === 'navigate') {
        return (await caches.match('./index.html')) || Response.error();
      }
      return Response.error();
    }
  })());
});
