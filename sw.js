const CACHE_NAME = 'expense-app-cache-v6.0'; // Final Version
const urlsToCache = [
    './index.html',
    './manifest.json',
    'https://unpkg.com/lucide@latest/dist/umd/lucide.js',
    'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap',
    'https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js',
    'https://www.gstatic.com/firebasejs/8.10.1/firebase-auth.js',
    'https://www.gstatic.com/firebasejs/8.10.1/firebase-firestore.js'
];

self.addEventListener('install', event => {
    event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache)));
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(caches.keys().then(names => Promise.all(names.map(name => { if (!cacheWhitelist.includes(name)) { return caches.delete(name); } }))));
    return self.clients.claim();
});

self.addEventListener('fetch', event => {
    if (event.request.url.includes('firestore.googleapis.com')) {
        return; 
    }
    event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
