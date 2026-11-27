const CACHE_NAME = 'wms-app-cache-v1.7.4';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './changelog.js',
    './manifest.json',
    './icon.png'
];

// 1. Установка: кэшируем базовые файлы и сразу активируем новый SW
self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
                console.warn('Не удалось закэшировать часть файлов при установке:', err);
            });
        })
    );
});

// 2. Активация: удаляем старые версии кэша и берем управление вкладками на себя
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        console.log('Удаление устаревшего кэша:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// 3. Перехват запросов: для HTML/JS всегда идем сначала в сеть (Network First)
self.addEventListener('fetch', (event) => {
    // Запросы к API Supabase не кэшируем, пропускаем напрямую в сеть
    if (event.request.url.includes('supabase.co')) {
        return;
    }

    event.request.mode === 'navigate' || event.request.url.endsWith('.html')
        ? event.respondWith(
            fetch(event.request)
                .then((networkResponse) => {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                    return networkResponse;
                })
                .catch(() => caches.match(event.request))
        )
        : event.respondWith(
            fetch(event.request).catch(() => caches.match(event.request))
        );
});
