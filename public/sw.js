// ============================================================================
// YeBetWeg service worker — offline-first strategy
// ============================================================================
// Designed for intermittent Ethiopian connectivity:
//   - App shell precached (HTML + icons + offline fallback) at install
//   - Navigations: network-first → runtime cache → offline.html fallback
//   - Static assets: cache-first with runtime caching (never re-fetch what we
//     already have until the version bumps)
//   - Cross-origin images (Unsplash CDN): stale-while-revalidate so previously
//     seen images still render offline
//   - Supabase API traffic (rest/auth/functions): always network-only —
//     cached API responses would show stale prices/payments as fresh
//
// Bump CACHE_VERSION whenever the shell changes to invalidate old caches.
// ============================================================================

const CACHE_VERSION = 'yebetweg-v3';
const PRECACHE_CACHE = `${CACHE_VERSION}-precache`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/Logo2x.png',
  '/Logo3x.png',
  '/Logo1x.jpg',
  '/vite.svg',
];

/** Only cache complete, successful, non-partial responses. */
function isCacheableResponse(response) {
  if (!response || !response.ok) return false;
  if (response.status === 206) return false; // 206 Partial Content breaks caches.put
  if (response.status === 204) return false; // no body
  return true;
}

/** Opaque responses (CDN images) can be cached but never inspected. */
function isOpaqueImageResponse(response, request) {
  return request.destination === 'image' && response.type === 'opaque';
}

async function precache() {
  const cache = await caches.open(PRECACHE_CACHE);
  // addAll fails atomically if one URL fails — request them individually so a
  // single missing icon can never break offline support for the whole app.
  await Promise.allSettled(
    PRECACHE_URLS.map(async (url) => {
      try {
        await cache.add(new Request(url, { cache: 'reload' }));
      } catch (err) {
        console.warn(`[SW] precache failed for ${url}:`, err);
      }
    })
  );
}

async function cleanupOldCaches() {
  const keys = await caches.keys();
  await Promise.all(
    keys
      .filter((name) => !name.startsWith(CACHE_VERSION))
      .map((name) => caches.delete(name))
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil(precache());
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(cleanupOldCaches());
  self.clients.claim();
});

// Allow the page to trigger immediate activation of a waiting worker.
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

/** Network-first for navigations: freshest HTML when online, shell when not. */
async function handleNavigation(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const response = await fetch(request);
    if (isCacheableResponse(response)) {
      cache.put('/', response.clone()).catch(() => {});
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch (err) {
    const cached =
      (await caches.match(request)) ||
      (await caches.match('/index.html')) ||
      (await caches.match('/'));
    return (
      cached ||
      (await caches.match('/offline.html')) ||
      new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } })
    );
  }
}

/** Cache-first for same-origin static assets, with runtime cache fill. */
async function handleStaticAsset(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (isCacheableResponse(response)) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch (err) {
    // Offline and never cached: serve the offline page for documents,
    // an empty 504 for everything else (wrong MIME would break CSS/JS).
    const offlinePage = await caches.match('/offline.html');
    if (offlinePage && request.destination === 'document') return offlinePage;
    return new Response('', { status: 504, statusText: 'Offline' });
  }
}

/** Stale-while-revalidate for cross-origin CDN images (offline image fallback). */
async function handleCrossOriginImage(request) {
  const cached = await caches.match(request);
  const fetchPromise = fetch(request)
    .then((response) => {
      if (isOpaqueImageResponse(response, request) || isCacheableResponse(response)) {
        caches
          .open(RUNTIME_CACHE)
          .then((cache) => cache.put(request, response.clone()))
          .catch(() => {});
      }
      return response;
    })
    .catch(() => cached);
  return cached || fetchPromise;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  // Supabase API traffic must never be served from cache.
  if (
    url.pathname.startsWith('/rest/v1/') ||
    url.pathname.startsWith('/auth/v1/') ||
    url.pathname.startsWith('/functions/v1/') ||
    url.pathname.startsWith('/realtime/')
  ) {
    return;
  }

  if (url.origin === self.location.origin) {
    if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
      event.respondWith(handleNavigation(request));
    } else {
      event.respondWith(handleStaticAsset(request));
    }
    return;
  }

  // Cross-origin: pass through by default; SWR cache for CDN images.
  if (request.destination === 'image') {
    event.respondWith(handleCrossOriginImage(request));
  }
});

// Background sync for offline form submissions (future enhancement)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-forms') {
    event.waitUntil(syncForms());
  }
});

async function syncForms() {
  // Placeholder for future form sync
  console.log('Syncing offline forms...');
}
