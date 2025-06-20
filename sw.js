const CACHE_NAME = 'expense-pwa-cache-v1';
const urlsToCache = [
    './', // Caches the index.html
    './index.html',
    './manifest.json',
    'https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
    'https://www.gstatic.com/firebasejs/9.6.0/firebase-app.js',
    'https://www.gstatic.com/firebasejs/9.6.0/firebase-auth.js',
    'https://www.gstatic.com/firebasejs/9.6.0/firebase-firestore.js',
    // You might also want to cache your icons here:
    // './icons/icon-192x192.png',
    // './icons/icon-512x512.png'
];

// Install event: Caches the essential app shell files
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
            .catch(error => {
                console.error('Failed to cache during install:', error);
            })
    );
});

// Activate event: Cleans up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Fetch event: Network-first for data, cache-first for assets
self.addEventListener('fetch', (event) => {
    // For Firebase/API requests, try network first, then fall back to cache (if available)
    // Firebase SDKs manage their own offline persistence for data
    if (event.request.url.includes('firebase') || event.request.url.includes('googleapis.com')) {
        event.respondWith(
            fetch(event.request).catch(() => {
                // If network fails, try to return from cache if it was previously cached
                return caches.match(event.request);
            })
        );
    } else {
        // For other requests (app shell, assets), try cache first
        event.respondWith(
            caches.match(event.request)
                .then((response) => {
                    // Cache hit - return response
                    if (response) {
                        return response;
                    }
                    // No cache hit - fetch from network
                    return fetch(event.request).then((networkResponse) => {
                        // Cache the newly fetched response for future use
                        return caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, networkResponse.clone());
                            return networkResponse;
                        });
                    }).catch(() => {
                        // If both cache and network fail, you can serve an offline page
                        // For simplicity, we're not adding an explicit offline page here
                        console.log('Offline: Could not fetch from network or cache:', event.request.url);
                        // You could return a placeholder or an error page here
                    });
                })
        );
    }
});


