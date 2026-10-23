const CACHE_NAME = 'diary-v7';

// При установке просто активируемся
self.addEventListener('install', e => {
  self.skipWaiting(); 
});

// При активации удаляем ВСЕ старые кэши
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(keys.map(k => caches.delete(k)));
    }).then(() => self.clients.claim())
  );
});

// Каждый запрос всегда идём в интернет!
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (!e.request.url.startsWith('http')) return;
  
  // Просто всегда берем свежую версию из сети, кэш не используем
  e.respondWith(fetch(e.request));
});
