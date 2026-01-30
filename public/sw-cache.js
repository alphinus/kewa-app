/**
 * KEWA Service Worker - Caching Module
 * Handles offline caching with cache-first (static) and network-first (pages) strategies
 * Phase: 27-pwa-foundation
 *
 * Loaded by sw.js via importScripts('/sw-cache.js')
 */

const CACHE_VERSION = 'kewa-v1'
const NETWORK_TIMEOUT = 3000 // 3 seconds before falling back to cache

/**
 * Helper: Check if URL is a static asset
 */
function isStaticAsset(url) {
  const pathname = url.pathname
  const staticExtensions = ['.js', '.css', '.woff', '.woff2', '.ttf', '.png', '.jpg', '.jpeg', '.svg', '.ico', '.webp']
  return staticExtensions.some(ext => pathname.endsWith(ext)) || pathname.includes('/_next/static/')
}

/**
 * Network-first with timeout fallback
 */
async function networkFirstWithTimeout(request) {
  try {
    // Race between fetch and timeout
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Network timeout')), NETWORK_TIMEOUT)
    )

    const response = await Promise.race([
      fetch(request),
      timeoutPromise
    ])

    // Cache successful response
    if (response && response.status === 200) {
      const cache = await caches.open(CACHE_VERSION)
      cache.put(request, response.clone())
    }

    return response
  } catch (error) {
    // Network failed or timeout - try cache
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }

    // No cache available - return basic offline response
    return new Response('Offline', { status: 503 })
  }
}

/**
 * Cache-first with network fallback
 */
async function cacheFirst(request) {
  // Try cache first
  const cachedResponse = await caches.match(request)
  if (cachedResponse) {
    return cachedResponse
  }

  // Not in cache - fetch from network
  try {
    const response = await fetch(request)

    // Cache successful response
    if (response && response.status === 200) {
      const cache = await caches.open(CACHE_VERSION)
      cache.put(request, response.clone())
    }

    return response
  } catch (error) {
    // Network failed and not in cache
    return undefined
  }
}

/**
 * Install handler - no pre-caching, just activate immediately
 */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(() => self.skipWaiting())
  )
})

/**
 * Activate handler - clean up old caches
 */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('kewa-') && name !== CACHE_VERSION)
          .map((name) => caches.delete(name))
      )
    }).then(() => self.clients.claim())
  )
})

/**
 * Fetch handler - route requests to appropriate caching strategy
 */
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) {
    return
  }

  // Skip API requests, manifest, and extensions
  if (url.pathname.startsWith('/api/') ||
      url.pathname === '/manifest.webmanifest' ||
      url.protocol === 'chrome-extension:' ||
      url.protocol === 'moz-extension:') {
    return
  }

  // Only cache GET requests
  if (event.request.method !== 'GET') {
    return
  }

  // Navigation requests: network-first with timeout
  if (event.request.mode === 'navigate') {
    event.respondWith(networkFirstWithTimeout(event.request))
    return
  }

  // Static assets: cache-first
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(event.request))
    return
  }

  // Everything else: pass through to network (no caching)
})
