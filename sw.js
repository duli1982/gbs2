const CACHE_NAME = 'gbs-hub-v4';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/shared/theme.css',
  '/shared/sidebar.css',
  '/shared/sidebar.js',
  '/shared/v2-buttons.css',
  '/shared/v2-cards.css',
  '/shared/v2-footer.js',
  '/shared/ai-service.js',
  '/shared/export-utils.js',
  '/shared/scripts/analytics.js',
  '/shared/scripts/ai-governance.js',
  '/shared/scripts/copy-prompt.js',
  '/shared/scripts/lazy-loading.js',
  '/shared/scripts/smooth-scroll.js'
];

// Install event - cache static assets
self.addEventListener('install', event => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .catch(error => console.log('Cache failed:', error))
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Skip external requests
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }

        return fetch(event.request)
          .then(response => {
            // Cache successful responses
            if (response.status === 200) {
              const responseClone = response.clone();
              caches.open(CACHE_NAME)
                .then(cache => cache.put(event.request, responseClone));
            }
            return response;
          });
      })
      .catch(error => {
        console.log('Fetch failed:', error);
        // Return offline page for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      })
  );
});
