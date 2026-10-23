const CACHE_NAME = 'diary-v8';

// При установке сразу активируемся
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// При активации удаляем ВСЕ старые кэши
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Перехватываем запросы
self.addEventListener('fetch', (event) => {
  // Не трогаем запросы, которые не являются GET (например, POST)
  if (event.request.method !== 'GET') return;
  
  // Игнорируем запросы с других доменов (например, шрифты Google)
  if (!event.request.url.startsWith('http')) return;
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;

  // Для version.json и index.html всегда идём в сеть (без кэша)
  if (
    url.pathname.endsWith('version.json') || 
    url.pathname.endsWith('index.html') || 
    url.pathname === '/'
  ) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // Для картинок и иконок пытаемся взять из сети, если нет — из кэша
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
