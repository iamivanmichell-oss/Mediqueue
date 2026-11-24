/* MediQueue Progressive Web App - Service Worker (Offline Support & Shell Cache) */

const CACHE_NAME = "mediqueue-v1";

// Core application shell and static assets required to run completely offline
const SHELL_ASSETS = [
  "./",
  "./index.html",
  "./staff.html",
  "./styles.css",
  "./app.js",
  "./shared.js",
  "./staff.js",
  "./manifest.json",
  "./logo.png"
];

// Optional CDN assets pre-cached when network is available
const CDN_ASSETS = [
  "https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700;800&display=swap",
  "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css",
  "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js",
  "https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js"
];

// 1. Install event: Pre-cache app shell and static resources
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      // Pre-cache core local files first
      await cache.addAll(SHELL_ASSETS);

      // Best-effort pre-caching for CDNs (won't abort install if CDN is unreachable)
      await Promise.allSettled(
        CDN_ASSETS.map(url =>
          fetch(url, { mode: "cors" })
            .then(res => {
              if (res.ok || res.type === "opaque") {
                return cache.put(url, res);
              }
            })
            .catch(() => {
              // Ignore CDN fetch failure during install; will be fetched or handled at runtime
            })
        )
      );
    })
  );
  // Force waiting service worker to become the active service worker
  self.skipWaiting();
});

// 2. Activate event: Clean up previous cache versions and claim clients
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log("[MediQueue SW] Removing obsolete cache:", key);
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// 3. Fetch event: Cache-First for static shell, Network-First with offline fallback for APIs
self.addEventListener("fetch", event => {
  const req = event.request;
  const url = new URL(req.url);

  // Ignore non-GET requests (e.g. POST requests cannot be cached)
  if (req.method !== "GET") return;

  // Navigation requests (HTML pages)
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then(response => {
          // If valid response from network, update cache
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
          }
          return response;
        })
        .catch(async () => {
          // Network failed or offline: serve matching cached page or index.html fallback
          const cached = await caches.match(req);
          if (cached) return cached;
          if (url.pathname.endsWith("staff.html")) {
            return (await caches.match("./staff.html")) || caches.match("staff.html");
          }
          return (await caches.match("./index.html")) || caches.match("index.html");
        })
    );
    return;
  }

  // Handle live external APIs (Nominatim geocoding, EmailJS, Leaflet map tiles)
  const isLiveApi =
    url.hostname.includes("nominatim.openstreetmap.org") ||
    url.hostname.includes("emailjs.com") ||
    url.hostname.includes("arcgisonline.com") ||
    url.hostname.includes("tile.openstreetmap");

  if (isLiveApi) {
    // Network-First with graceful offline handling
    event.respondWith(
      fetch(req)
        .then(networkRes => {
          // Cache tile responses if successful
          if (networkRes && networkRes.ok && url.hostname.includes("arcgisonline.com")) {
            const clone = networkRes.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
          }
          return networkRes;
        })
        .catch(async () => {
          // Check if tile or response was cached earlier
          const cached = await caches.match(req);
          if (cached) return cached;

          // For JSON API requests, return an explicit offline JSON payload
          if (req.headers.get("accept") && req.headers.get("accept").includes("application/json")) {
            return new Response(
              JSON.stringify({
                offline: true,
                message: "You are currently offline. Live API data cannot be retrieved."
              }),
              {
                headers: { "Content-Type": "application/json" },
                status: 503,
                statusText: "Service Unavailable (Offline)"
              }
            );
          }

          // Otherwise return 503 offline response
          return new Response("Offline - Live API data unavailable without an active network connection", {
            status: 503,
            statusText: "Offline"
          });
        })
    );
    return;
  }

  // Core Shell & Static Assets: Cache-First strategy
  event.respondWith(
    caches.match(req).then(cachedResponse => {
      if (cachedResponse) {
        // Return from cache immediately; refresh in background if online
        fetch(req)
          .then(networkRes => {
            if (networkRes && networkRes.status === 200) {
              caches.open(CACHE_NAME).then(cache => cache.put(req, networkRes));
            }
          })
          .catch(() => {
            // Offline: cachedResponse already returned
          });
        return cachedResponse;
      }

      // Not in cache: fetch from network and store in cache
      return fetch(req)
        .then(networkResponse => {
          if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(req, responseToCache);
          });
          return networkResponse;
        })
        .catch(() => {
          // Asset unavailable offline and not in cache
          return new Response("Resource unavailable offline", {
            status: 503,
            statusText: "Offline"
          });
        });
    })
  );
});
