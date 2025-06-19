const CACHE_NAME = 'expense-app-cache-v2.0'; // Updated version
// قائمة بالملفات الأساسية التي يحتاجها التطبيق ليعمل
const urlsToCache = [
    './', // Caches the root URL
    './index.html',
    './style.css',
    './app.js',
    './manifest.json',
    'https://unpkg.com/lucide@latest/dist/umd/lucide.js',
    'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap',
    'https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js',
    'https://www.gstatic.com/firebasejs/8.10.1/firebase-auth.js',
    'https://www.gstatic.com/firebasejs/8.10.1/firebase-firestore.js'
];

// 1. عند "تثبيت" العامل في الخلفية، قم بتخزين الملفات الأساسية
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache and caching essential assets');
                return cache.addAll(urlsToCache);
            })
            .catch(err => console.error("Cache addAll failed:", err))
    );
    self.skipWaiting(); // تفعيل العامل فورًا
});

// 2. عند "تفعيل" العامل، قم بتنظيف أي ذاكرة مؤقتة قديمة
self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => Promise.all(
            cacheNames.map(cacheName => {
                if (!cacheWhitelist.includes(cacheName)) {
                    console.log('Deleting old cache:', cacheName);
                    return caches.delete(cacheName);
                }
            })
        ))
    );
    return self.clients.claim(); // التحكم في الصفحات المفتوحة فورًا
});

// 3. عند طلب أي ملف (fetch)، اعترضه وطبق استراتيجية التخزين
self.addEventListener('fetch', event => {
    // For Firebase API calls, always go to the network and never cache.
    if (event.request.url.includes('firestore.googleapis.com')) {
        return; // Let the browser handle it (network only).
    }
    
    // For all other requests (app shell, fonts, etc.), use a "Cache then Network" strategy.
    // This makes the app load instantly from cache.
    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                // If we find a match in the cache, return it immediately.
                const fetchPromise = fetch(event.request).then(networkResponse => {
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, networkResponse.clone());
                    });
                    return networkResponse;
                });

                // Return the cached response if it exists, otherwise wait for the network.
                return cachedResponse || fetchPromise;
            })
    );
});