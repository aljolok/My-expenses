// Define the cache name
const CACHE_NAME = 'my-expenses-cache-v2'; // Updated cache name for new version
// List of URLs to cache (your main HTML file and external assets)
const urlsToCache = [
    './', // Cache the root path
    'index.html', // Assuming your main file is named index.html
    'manifest.json', // Your web app manifest
    'https://cdn.tailwindcss.com', // Tailwind CSS CDN
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap', // Google Fonts
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css', // Font Awesome CSS
    // Firebase SDKs - These are crucial for offline support if Firebase is loaded client-side
    'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js',
    'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js',
    'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js'
    // Add any other external assets your app relies on here
];

// Install event: Caches all listed assets
self.addEventListener('install', (event) => {
    // Force the service worker to activate immediately upon installation,
    // skipping the waiting phase. This ensures that the new service worker
    // takes control of the page as soon as it's installed.
    self.skipWaiting(); 
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Service Worker: Opened cache during install');
                // Use cache.addAll to fetch and cache all specified URLs
                // This will fail if any resource fails to fetch, so ensure all URLs are correct.
                return cache.addAll(urlsToCache);
            })
            .catch(error => {
                console.error('Service Worker: Failed to cache during install:', error);
            })
    );
});

// Fetch event: Intercepts network requests and serves from cache if available
self.addEventListener('fetch', (event) => {
    // Only handle GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Cache hit - return response from cache
                if (response) {
                    console.log(`Service Worker: Serving from cache: ${event.request.url}`);
                    return response;
                }
                // No cache hit - try to fetch from network
                return fetch(event.request)
                    .then(networkResponse => {
                        // If successfully fetched, cache the new response for future use
                        // Do not cache opaque responses, as they cannot be used for all purposes.
                        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                            const responseToCache = networkResponse.clone();
                            caches.open(CACHE_NAME)
                                .then(cache => {
                                    cache.put(event.request, responseToCache);
                                });
                        }
                        return networkResponse;
                    })
                    .catch(error => {
                        console.error('Service Worker: Fetch failed for:', event.request.url, error);
                        // You can return a fallback page here for offline mode if needed
                        // For example: return caches.match('/offline.html');
                        // For now, we just let the request fail if network and cache fail
                        throw error; // Re-throw the error to indicate failure
                    });
            })
    );
});

// Activate event: Cleans up old caches
self.addEventListener('activate', (event) => {
    // Claim clients immediately to ensure the new service worker takes control
    // of all open tabs associated with the scope.
    event.waitUntil(self.clients.claim()); 

    const cacheWhitelist = [CACHE_NAME]; // Only keep the current cache version
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    // Delete old caches that are not in the whitelist
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        console.log('Service Worker: Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
