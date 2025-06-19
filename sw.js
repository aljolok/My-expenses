// Enhanced Service Worker for Expense Management App
// Version 2.0.0 - Professional PWA Implementation

const CACHE_NAME = 'expense-manager-v2.0.0';
const STATIC_CACHE_NAME = 'expense-manager-static-v2.0.0';
const DYNAMIC_CACHE_NAME = 'expense-manager-dynamic-v2.0.0';
const OFFLINE_PAGE = '/offline.html';

// Enhanced Cache Strategy Configuration
const CACHE_STRATEGIES = {
    CACHE_FIRST: 'cache-first',
    NETWORK_FIRST: 'network-first',
    STALE_WHILE_REVALIDATE: 'stale-while-revalidate',
    NETWORK_ONLY: 'network-only',
    CACHE_ONLY: 'cache-only'
};

// Enhanced Static Assets to Cache
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/style.css',
    '/app.js',
    '/manifest.json',
    '/sw.js',
    
    // Enhanced External Dependencies
    'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js',
    'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js',
    'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js',
    'https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800&family=Tajawal:wght@300;400;500;700;900&display=swap',
    'https://unpkg.com/lucide@latest/dist/umd/lucide.js',
    
    // Enhanced Offline Fallbacks
    'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTMuMDkgOC4yNkwyMCA5TDEzLjA5IDE1Ljc0TDEyIDIyTDEwLjkxIDE1Ljc0TDQgOUwxMC45MSA4LjI2TDEyIDJaIiBmaWxsPSIjM0I4MkY2Ii8+Cjwvc3ZnPgo='
];

// Enhanced Cache Patterns
const CACHE_PATTERNS = [
    {
        pattern: /^https:\/\/fonts\.googleapis\.com/,
        strategy: CACHE_STRATEGIES.STALE_WHILE_REVALIDATE,
        cacheName: 'google-fonts-stylesheets',
        maxAge: 60 * 60 * 24 * 365, // 1 year
        maxEntries: 30
    },
    {
        pattern: /^https:\/\/fonts\.gstatic\.com/,
        strategy: CACHE_STRATEGIES.CACHE_FIRST,
        cacheName: 'google-fonts-webfonts',
        maxAge: 60 * 60 * 24 * 365, // 1 year
        maxEntries: 30
    },
    {
        pattern: /^https:\/\/unpkg\.com/,
        strategy: CACHE_STRATEGIES.STALE_WHILE_REVALIDATE,
        cacheName: 'unpkg-resources',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        maxEntries: 50
    },
    {
        pattern: /^https:\/\/www\.gstatic\.com\/firebasejs/,
        strategy: CACHE_STRATEGIES.STALE_WHILE_REVALIDATE,
        cacheName: 'firebase-sdk',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        maxEntries: 20
    },
    {
        pattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
        strategy: CACHE_STRATEGIES.CACHE_FIRST,
        cacheName: 'images',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        maxEntries: 100
    },
    {
        pattern: /\.(?:js|css)$/,
        strategy: CACHE_STRATEGIES.STALE_WHILE_REVALIDATE,
        cacheName: 'static-resources',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        maxEntries: 50
    }
];

// Enhanced Utility Functions
const utils = {
    // Enhanced Cache Management
    async openCache(cacheName) {
        return await caches.open(cacheName);
    },

    // Enhanced Response Cloning
    cloneResponse(response) {
        return response.clone();
    },

    // Enhanced Network Timeout
    async fetchWithTimeout(request, timeout = 5000) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        try {
            const response = await fetch(request, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    },

    // Enhanced Cache Expiry Check
    isExpired(response, maxAge) {
        if (!response) return true;
        
        const dateHeader = response.headers.get('date');
        if (!dateHeader) return false;
        
        const responseTime = new Date(dateHeader).getTime();
        const now = Date.now();
        return (now - responseTime) > (maxAge * 1000);
    },

    // Enhanced Request Matching
    matchPattern(url, pattern) {
        if (pattern instanceof RegExp) {
            return pattern.test(url);
        }
        return url.includes(pattern);
    },

    // Enhanced Cache Key Generation
    generateCacheKey(request) {
        const url = new URL(request.url);
        // Remove cache-busting parameters
        url.searchParams.delete('_');
        url.searchParams.delete('v');
        url.searchParams.delete('version');
        return url.toString();
    },

    // Enhanced Error Response
    createErrorResponse(message = 'خدمة غير متاحة') {
        return new Response(
            JSON.stringify({
                error: true,
                message,
                timestamp: new Date().toISOString()
            }),
            {
                status: 503,
                statusText: 'Service Unavailable',
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache'
                }
            }
        );
    },

    // Enhanced Offline Page
    createOfflineResponse() {
        const offlineHTML = `
            <!DOCTYPE html>
            <html lang="ar" dir="rtl">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>غير متصل - إدارة المصروفات</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body {
                        font-family: 'Cairo', -apple-system, BlinkMacSystemFont, sans-serif;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        min-height: 100vh;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: white;
                        text-align: center;
                        padding: 2rem;
                    }
                    .container {
                        max-width: 500px;
                        background: rgba(255, 255, 255, 0.1);
                        backdrop-filter: blur(20px);
                        border-radius: 2rem;
                        padding: 3rem;
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                    }
                    .icon {
                        width: 80px;
                        height: 80px;
                        margin: 0 auto 2rem;
                        background: rgba(255, 255, 255, 0.2);
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 2rem;
                    }
                    h1 {
                        font-size: 2rem;
                        margin-bottom: 1rem;
                        font-weight: 700;
                    }
                    p {
                        font-size: 1.1rem;
                        margin-bottom: 2rem;
                        opacity: 0.9;
                        line-height: 1.6;
                    }
                    .retry-btn {
                        background: rgba(255, 255, 255, 0.2);
                        border: 2px solid rgba(255, 255, 255, 0.3);
                        color: white;
                        padding: 1rem 2rem;
                        border-radius: 1rem;
                        font-size: 1rem;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        text-decoration: none;
                        display: inline-block;
                    }
                    .retry-btn:hover {
                        background: rgba(255, 255, 255, 0.3);
                        transform: translateY(-2px);
                        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
                    }
                    .features {
                        margin-top: 2rem;
                        text-align: right;
                    }
                    .feature {
                        display: flex;
                        align-items: center;
                        margin-bottom: 1rem;
                        font-size: 0.9rem;
                        opacity: 0.8;
                    }
                    .feature-icon {
                        width: 20px;
                        height: 20px;
                        margin-left: 0.5rem;
                        background: rgba(255, 255, 255, 0.3);
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 0.8rem;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="icon">📱</div>
                    <h1>غير متصل بالإنترنت</h1>
                    <p>يبدو أنك غير متصل بالإنترنت حالياً. يمكنك الاستمرار في استخدام التطبيق مع البيانات المحفوظة محلياً.</p>
                    
                    <div class="features">
                        <div class="feature">
                            <div class="feature-icon">✓</div>
                            <span>عرض المصروفات المحفوظة</span>
                        </div>
                        <div class="feature">
                            <div class="feature-icon">✓</div>
                            <span>إضافة مصروفات جديدة (ستُحفظ عند الاتصال)</span>
                        </div>
                        <div class="feature">
                            <div class="feature-icon">✓</div>
                            <span>عرض الإحصائيات المحلية</span>
                        </div>
                    </div>
                    
                    <button class="retry-btn" onclick="window.location.reload()">
                        إعادة المحاولة
                    </button>
                </div>
                
                <script>
                    // Auto-retry when online
                    window.addEventListener('online', () => {
                        window.location.reload();
                    });
                    
                    // Check connection status
                    setInterval(() => {
                        if (navigator.onLine) {
                            window.location.reload();
                        }
                    }, 5000);
                </script>
            </body>
            </html>
        `;
        
        return new Response(offlineHTML, {
            headers: {
                'Content-Type': 'text/html; charset=utf-8',
                'Cache-Control': 'no-cache'
            }
        });
    }
};

// Enhanced Cache Strategies Implementation
const cacheStrategies = {
    // Enhanced Cache First Strategy
    async cacheFirst(request, cacheName, maxAge) {
        const cache = await utils.openCache(cacheName);
        const cacheKey = utils.generateCacheKey(request);
        const cachedResponse = await cache.match(cacheKey);
        
        if (cachedResponse && !utils.isExpired(cachedResponse, maxAge)) {
            return cachedResponse;
        }
        
        try {
            const networkResponse = await utils.fetchWithTimeout(request);
            if (networkResponse.ok) {
                cache.put(cacheKey, utils.cloneResponse(networkResponse));
            }
            return networkResponse;
        } catch (error) {
            if (cachedResponse) {
                return cachedResponse;
            }
            throw error;
        }
    },

    // Enhanced Network First Strategy
    async networkFirst(request, cacheName, maxAge) {
        const cache = await utils.openCache(cacheName);
        const cacheKey = utils.generateCacheKey(request);
        
        try {
            const networkResponse = await utils.fetchWithTimeout(request);
            if (networkResponse.ok) {
                cache.put(cacheKey, utils.cloneResponse(networkResponse));
            }
            return networkResponse;
        } catch (error) {
            const cachedResponse = await cache.match(cacheKey);
            if (cachedResponse) {
                return cachedResponse;
            }
            throw error;
        }
    },

    // Enhanced Stale While Revalidate Strategy
    async staleWhileRevalidate(request, cacheName, maxAge) {
        const cache = await utils.openCache(cacheName);
        const cacheKey = utils.generateCacheKey(request);
        const cachedResponse = await cache.match(cacheKey);
        
        // Start network request in background
        const networkPromise = utils.fetchWithTimeout(request)
            .then(response => {
                if (response.ok) {
                    cache.put(cacheKey, utils.cloneResponse(response));
                }
                return response;
            })
            .catch(() => null);
        
        // Return cached response immediately if available
        if (cachedResponse) {
            // Update cache in background if expired
            if (utils.isExpired(cachedResponse, maxAge)) {
                networkPromise.catch(() => {}); // Ignore errors for background update
            }
            return cachedResponse;
        }
        
        // Wait for network if no cache
        return await networkPromise;
    },

    // Enhanced Network Only Strategy
    async networkOnly(request) {
        return await utils.fetchWithTimeout(request);
    },

    // Enhanced Cache Only Strategy
    async cacheOnly(request, cacheName) {
        const cache = await utils.openCache(cacheName);
        const cacheKey = utils.generateCacheKey(request);
        return await cache.match(cacheKey);
    }
};

// Enhanced Cache Management
const cacheManager = {
    // Enhanced Cache Cleanup
    async cleanupExpiredCaches() {
        const cacheNames = await caches.keys();
        const currentCaches = [CACHE_NAME, STATIC_CACHE_NAME, DYNAMIC_CACHE_NAME];
        
        const deletePromises = cacheNames
            .filter(cacheName => !currentCaches.includes(cacheName))
            .map(cacheName => caches.delete(cacheName));
        
        await Promise.all(deletePromises);
    },

    // Enhanced Cache Size Management
    async limitCacheSize(cacheName, maxEntries) {
        const cache = await utils.openCache(cacheName);
        const keys = await cache.keys();
        
        if (keys.length > maxEntries) {
            const keysToDelete = keys.slice(0, keys.length - maxEntries);
            await Promise.all(keysToDelete.map(key => cache.delete(key)));
        }
    },

    // Enhanced Preload Critical Resources
    async preloadCriticalResources() {
        const cache = await utils.openCache(STATIC_CACHE_NAME);
        
        const preloadPromises = STATIC_ASSETS.map(async (asset) => {
            try {
                const response = await fetch(asset);
                if (response.ok) {
                    await cache.put(asset, response);
                }
            } catch (error) {
                console.warn(`Failed to preload: ${asset}`, error);
            }
        });
        
        await Promise.all(preloadPromises);
    }
};

// Enhanced Request Router
const requestRouter = {
    // Enhanced Route Request
    async routeRequest(request) {
        const url = new URL(request.url);
        
        // Handle navigation requests
        if (request.mode === 'navigate') {
            return await this.handleNavigationRequest(request);
        }
        
        // Handle API requests
        if (url.pathname.startsWith('/api/') || url.hostname.includes('firestore') || url.hostname.includes('firebase')) {
            return await this.handleApiRequest(request);
        }
        
        // Handle static assets
        return await this.handleStaticRequest(request);
    },

    // Enhanced Navigation Request Handler
    async handleNavigationRequest(request) {
        try {
            const networkResponse = await utils.fetchWithTimeout(request, 3000);
            return networkResponse;
        } catch (error) {
            // Return cached index.html or offline page
            const cache = await utils.openCache(STATIC_CACHE_NAME);
            const cachedResponse = await cache.match('/index.html') || await cache.match('/');
            
            if (cachedResponse) {
                return cachedResponse;
            }
            
            return utils.createOfflineResponse();
        }
    },

    // Enhanced API Request Handler
    async handleApiRequest(request) {
        try {
            return await cacheStrategies.networkFirst(request, DYNAMIC_CACHE_NAME, 300); // 5 minutes
        } catch (error) {
            return utils.createErrorResponse('خدمة API غير متاحة حالياً');
        }
    },

    // Enhanced Static Request Handler
    async handleStaticRequest(request) {
        const url = request.url;
        
        // Find matching cache pattern
        const pattern = CACHE_PATTERNS.find(p => utils.matchPattern(url, p.pattern));
        
        if (pattern) {
            const strategy = cacheStrategies[pattern.strategy.replace('-', '')];
            if (strategy) {
                try {
                    const response = await strategy(request, pattern.cacheName, pattern.maxAge);
                    
                    // Limit cache size
                    if (pattern.maxEntries) {
                        await cacheManager.limitCacheSize(pattern.cacheName, pattern.maxEntries);
                    }
                    
                    return response;
                } catch (error) {
                    console.warn(`Cache strategy failed for ${url}:`, error);
                }
            }
        }
        
        // Fallback to network first
        try {
            return await cacheStrategies.networkFirst(request, DYNAMIC_CACHE_NAME, 3600); // 1 hour
        } catch (error) {
            return utils.createErrorResponse('المورد غير متاح');
        }
    }
};

// Enhanced Background Sync
const backgroundSync = {
    // Enhanced Sync Queue Management
    async addToSyncQueue(data) {
        const cache = await utils.openCache('sync-queue');
        const queueKey = `sync-${Date.now()}-${Math.random()}`;
        
        await cache.put(queueKey, new Response(JSON.stringify(data), {
            headers: { 'Content-Type': 'application/json' }
        }));
    },

    // Enhanced Process Sync Queue
    async processSyncQueue() {
        const cache = await utils.openCache('sync-queue');
        const requests = await cache.keys();
        
        for (const request of requests) {
            try {
                const response = await cache.match(request);
                const data = await response.json();
                
                // Process sync data (implement based on your needs)
                await this.syncData(data);
                
                // Remove from queue on success
                await cache.delete(request);
            } catch (error) {
                console.warn('Sync failed for request:', error);
                // Keep in queue for retry
            }
        }
    },

    // Enhanced Sync Data
    async syncData(data) {
        // Implement your sync logic here
        // This could involve sending data to Firebase when online
        console.log('Syncing data:', data);
    }
};

// Enhanced Service Worker Event Listeners

// Enhanced Install Event
self.addEventListener('install', (event) => {
    console.log('Service Worker installing...');
    
    event.waitUntil(
        (async () => {
            try {
                await cacheManager.preloadCriticalResources();
                console.log('Critical resources preloaded');
                
                // Skip waiting to activate immediately
                await self.skipWaiting();
            } catch (error) {
                console.error('Install failed:', error);
            }
        })()
    );
});

// Enhanced Activate Event
self.addEventListener('activate', (event) => {
    console.log('Service Worker activating...');
    
    event.waitUntil(
        (async () => {
            try {
                await cacheManager.cleanupExpiredCaches();
                console.log('Old caches cleaned up');
                
                // Claim all clients immediately
                await self.clients.claim();
                
                // Process any pending sync operations
                await backgroundSync.processSyncQueue();
            } catch (error) {
                console.error('Activation failed:', error);
            }
        })()
    );
});

// Enhanced Fetch Event
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests and chrome-extension requests
    if (event.request.method !== 'GET' || event.request.url.startsWith('chrome-extension://')) {
        return;
    }
    
    event.respondWith(
        (async () => {
            try {
                return await requestRouter.routeRequest(event.request);
            } catch (error) {
                console.error('Fetch failed:', error);
                
                // Return appropriate fallback
                if (event.request.mode === 'navigate') {
                    return utils.createOfflineResponse();
                }
                
                return utils.createErrorResponse();
            }
        })()
    );
});

// Enhanced Background Sync Event
self.addEventListener('sync', (event) => {
    console.log('Background sync triggered:', event.tag);
    
    if (event.tag === 'expense-sync') {
        event.waitUntil(backgroundSync.processSyncQueue());
    }
});

// Enhanced Push Event
self.addEventListener('push', (event) => {
    console.log('Push message received:', event);
    
    const options = {
        body: event.data ? event.data.text() : 'إشعار جديد من تطبيق إدارة المصروفات',
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'explore',
                title: 'فتح التطبيق',
                icon: '/icon-192x192.png'
            },
            {
                action: 'close',
                title: 'إغلاق',
                icon: '/icon-192x192.png'
            }
        ],
        requireInteraction: true,
        silent: false
    };
    
    event.waitUntil(
        self.registration.showNotification('إدارة المصروفات', options)
    );
});

// Enhanced Notification Click Event
self.addEventListener('notificationclick', (event) => {
    console.log('Notification clicked:', event);
    
    event.notification.close();
    
    if (event.action === 'explore') {
        event.waitUntil(
            self.clients.openWindow('/')
        );
    }
});

// Enhanced Message Event
self.addEventListener('message', (event) => {
    console.log('Message received:', event.data);
    
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'CACHE_URLS') {
        event.waitUntil(
            (async () => {
                const cache = await utils.openCache(DYNAMIC_CACHE_NAME);
                await Promise.all(
                    event.data.urls.map(url => 
                        fetch(url).then(response => {
                            if (response.ok) {
                                return cache.put(url, response);
                            }
                        }).catch(() => {})
                    )
                );
            })()
        );
    }
});

// Enhanced Periodic Background Sync (if supported)
if ('periodicSync' in self.registration) {
    self.addEventListener('periodicsync', (event) => {
        console.log('Periodic sync triggered:', event.tag);
        
        if (event.tag === 'expense-cleanup') {
            event.waitUntil(
                (async () => {
                    await cacheManager.cleanupExpiredCaches();
                    await backgroundSync.processSyncQueue();
                })()
            );
        }
    });
}

// Enhanced Error Handling
self.addEventListener('error', (event) => {
    console.error('Service Worker error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
    console.error('Service Worker unhandled rejection:', event.reason);
});

console.log('Enhanced Service Worker loaded successfully - Version 2.0.0');

