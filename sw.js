// Define the cache name
const CACHE_NAME = 'my-expenses-cache-v1';
// List of URLs to cache (your main HTML file)
const urlsToCache = [
    'index.html', // Assuming your main file is named index.html
    'manifest.json', // Your web app manifest
    // Since all CSS/JS is embedded in index.html, we only need to cache index.html
    // If you had external CSS or JS files, you would list them here as well.
    // Example: 'style.css', 'app.js'
];

// Install event: Caches all listed assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache during install');
                return cache.addAll(urlsToCache);
            })
            .catch(error => {
                console.error('Failed to cache during install:', error);
            })
    );
});

// Fetch event: Intercepts network requests and serves from cache if available
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Cache hit - return response
                if (response) {
                    return response;
                }
                // No cache hit - fetch from network
                return fetch(event.request);
            })
            .catch(error => {
                console.error('Fetch failed for:', event.request.url, error);
                // You can return a fallback page here for offline mode if needed
                // For example: return caches.match('/offline.html');
            })
    );
});

// Activate event: Cleans up old caches
self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        // Delete old caches
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});