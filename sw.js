const CACHE_NAME = 'my-expenses-app-v2'; // Updated cache version
const urlsToCache = [
  './',
  'index.html',
  'style.css', // New file
  'app.js'    // New file
];

const cdnUrlsToCache = [
    'https://cdn.tailwindcss.com?plugins=typography',
    'https://unpkg.com/lucide@latest',
    'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js', // Updated Firebase version
    'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js', // Updated Firebase version
    'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js' // Updated Firebase version
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        const localCachePromise = cache.addAll(urlsToCache);

        const cdnCachePromises = cdnUrlsToCache.map(url => {
            return fetch(url, { mode: 'no-cors' })
                .then(response => {
                    if (response.status === 200 || response.type === 'opaque') {
                       return cache.put(url, response);
                    }
                    return Promise.resolve(); // Don't reject for non-200 or non-opaque
                })
                .catch(err => {
                    console.error('Failed to cache CDN resource:', url, err);
                });
        });

        return Promise.all([localCachePromise, ...cdnCachePromises]);
      })
  );
});


self.addEventListener('fetch', event => {
    const requestUrl = new URL(event.request.url);

    // Allow Firebase requests to go directly to network
    if (requestUrl.hostname.includes('firebaseio.com') || requestUrl.hostname.includes('googleapis.com') || requestUrl.hostname.includes('gstatic.com')) {
        event.respondWith(fetch(event.request));
        return;
    }

    event.respondWith(
        caches.open(CACHE_NAME).then(cache => {
            return cache.match(event.request).then(response => {
                const fetchPromise = fetch(event.request).then(networkResponse => {
                    // Cache the new network response
                    if (networkResponse && networkResponse.status === 200) {
                        cache.put(event.request, networkResponse.clone());
                    }
                    return networkResponse;
                }).catch(err => {
                    console.error('Fetch failed; returning offline page instead.', err);
                    // Optionally, return a specific offline page if the main request fails
                    // return caches.match('offline.html');
                });

                // Return cached response immediately if available, otherwise fetch from network
                return response || fetchPromise;
            });
        })
    );
});


self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            // Delete old caches
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

