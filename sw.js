const CACHE_NAME = 'expense-app-cache-v3.0'; // Updated version
const urlsToCache = [
    './index.html',
    // We don't cache style.css or app.js because they are now embedded in index.html
    './manifest.json',
    'https://unpkg.com/lucide@latest/dist/umd/lucide.js',
    'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap',
    'https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js',
    'https://www.gstatic.com/firebasejs/8.10.1/firebase-auth.js',
    'https://www.gstatic.com/firebasejs/8.10.1/firebase-firestore.js'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
            .catch(err => console.error("Cache addAll failed:", err))
    );
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => Promise.all(
            cacheNames.map(cacheName => {
                if (!cacheWhitelist.includes(cacheName)) {
                    return caches.delete(cacheName);
                }
            })
        ))
    );
    return self.clients.claim();
});

self.addEventListener('fetch', event => {
    if (event.request.url.includes('firestore.googleapis.com')) {
        return; // Network only for API calls
    }
    
    event.respondWith(
        fetch(event.request)
            .catch(() => caches.match(event.request))
    );
});
