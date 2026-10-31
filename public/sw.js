// LaborApp Service Worker — cache básico para PWA
const CACHE = 'laborapp-v1'
const ASSETS = ['/feed', '/manifest.json']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// Estrategia: network-first para datos, cache-first para assets
self.addEventListener('fetch', (event) => {
  const { request } = event
  // No cachear llamadas a la API ni a Supabase
  if (request.url.includes('/api/') || request.url.includes('supabase')) {
    return
  }
  event.respondWith(
    fetch(request)
      .then((response) => {
        const clone = response.clone()
        caches.open(CACHE).then((cache) => cache.put(request, clone))
        return response
      })
      .catch(() => caches.match(request))
  )
})
