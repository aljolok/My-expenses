const CACHE_NAME = 'my-expenses-app-v1';  
const urlsToCache = [  
  './',  
  'index.html'  
];  
  
const cdnUrlsToCache = [  
    'https://cdn.tailwindcss.com?plugins=typography',  
    'https://unpkg.com/lucide@latest',  
    'https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js',  
    'https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js',  
    'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js'  
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
                    return Promise.resolve();  
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
  
    if (requestUrl.hostname.includes('firebaseio.com') || requestUrl.hostname.includes('googleapis.com')) {  
        event.respondWith(fetch(event.request));  
        return;  
    }  
  
    event.respondWith(  
        caches.open(CACHE_NAME).then(cache => {  
            return cache.match(event.request).then(response => {  
                const fetchPromise = fetch(event.request).then(networkResponse => {  
                    if (networkResponse && networkResponse.status === 200) {  
                        cache.put(event.request, networkResponse.clone());  
                    }  
                    return networkResponse;  
                }).catch(err => {  
                    console.error('Fetch failed; returning offline page instead.', err);  
                });  
  
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
            return caches.delete(cacheName);  
          }  
        })  
      );  
    })  
  );  
});
