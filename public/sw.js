importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js');

workbox.core.clientsClaim();
workbox.core.skipWaiting();

// Network-first strategy for pages to ensure offline fallback functionality
workbox.routing.registerRoute(
    ({request}) => request.mode === 'navigate',
    new workbox.strategies.NetworkFirst({
        cacheName: 'pages-cache',
        plugins: [
            new workbox.cacheableResponse.CacheableResponsePlugin({statuses: [200]}),
        ]
    })
);

// Stale-while-revalidate for assets
workbox.routing.registerRoute(
    ({request}) => request.destination === 'style' || request.destination === 'script' || request.destination === 'worker',
    new workbox.strategies.StaleWhileRevalidate({
        cacheName: 'assets-cache',
    })
);

// Cache-first for images
workbox.routing.registerRoute(
    ({request}) => request.destination === 'image',
    new workbox.strategies.CacheFirst({
        cacheName: 'images-cache',
        plugins: [
            new workbox.expiration.ExpirationPlugin({maxEntries: 100}),
        ]
    })
);
