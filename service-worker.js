// ==================== SERVICE WORKER ====================
// Дневник.ру — фоновый воркер для PWA
// Версия для сброса кэша при обновлении
const SW_VERSION = 'diary-sw-v1';
const CACHE_NAME = 'diary-cache-v1';

// Файлы для кэширования (работа офлайн)
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './icon.png'
];

// ==================== INSTALL ====================
// Устанавливаем SW и кэшируем основные файлы
self.addEventListener('install', event => {
  console.log('[SW] Install', SW_VERSION);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(PRECACHE_URLS).catch(err => {
          // Если какой-то файл не нашёлся — не падаем
          console.warn('[SW] Precache partial fail:', err);
        });
      })
      .then(() => self.skipWaiting())
  );
});

// ==================== ACTIVATE ====================
// Удаляем старые кэши при активации
self.addEventListener('activate', event => {
  console.log('[SW] Activate', SW_VERSION);
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// ==================== FETCH ====================
// Стратегия: cache-first для статики, network для остального
self.addEventListener('fetch', event => {
  const req = event.request;
  // Только GET
  if (req.method !== 'GET') return;
  // Не кэшируем запросы к IndexedDB / data URI
  if (req.url.startsWith('data:') || req.url.startsWith('blob:')) return;

  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(response => {
        // Кэшируем успешные GET-ответы того же origin
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(req, clone).catch(() => {});
          });
        }
        return response;
      }).catch(() => {
        // При офлайн-запросе к навигации — отдаём index.html
        if (req.mode === 'navigate') {
          return caches.match('./index.html');
        }
        return new Response('Offline', { status: 503 });
      });
    })
  );
});

// ==================== PUSH ====================
// Пуш-уведомления от сервера (если когда-то появится)
self.addEventListener('push', event => {
  let data = { title: 'Дневник.ру', body: 'Новое уведомление' };
  try {
    if (event.data) data = event.data.json();
  } catch (e) {
    if (event.data) data.body = event.data.text();
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: './icon.png',
      badge: './icon.png',
      vibrate: [80, 40, 80],
      tag: data.tag || 'default',
      requireInteraction: false,
      data: data.url || './'
    })
  );
});

// ==================== NOTIFICATION CLICK ====================
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // Если приложение открыто — фокусируемся на нём
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      // Иначе открываем новое окно
      if (clients.openWindow) return clients.openWindow('./');
    })
  );
});

// ==================== BACKGROUND SYNC ====================
// (опционально) синхронизация в фоне — при появлении сети
self.addEventListener('sync', event => {
  if (event.tag === 'diary-sync') {
    event.waitUntil(Promise.resolve());
  }
});

// ==================== MESSAGE ====================
// Приём сообщений от страницы (например, показать уведомление)
self.addEventListener('message', event => {
  const data = event.data || {};
  if (data.type === 'SHOW_NOTIFICATION') {
    self.registration.showNotification(data.title || 'Дневник.ру', {
      body: data.body || '',
      icon: './icon.png',
      badge: './icon.png',
      vibrate: [80, 40, 80],
      tag: data.tag || 'reminder-' + Date.now(),
      requireInteraction: false
    });
  }
  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});