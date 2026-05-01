const CACHE_NAME = "90-days-tracker-v2026-05-01-01";

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", (event) => {
  // Activate the new service worker immediately after GitHub update
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL).catch(() => null);
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => {
        return Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
            return null;
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  // Only handle GET requests
  if (request.method !== "GET") {
    return;
  }

  // For HTML/page navigation:
  // Always try GitHub first, so phone gets latest index.html faster.
  if (request.mode === "navigate" || request.destination === "document") {
    event.respondWith(
      fetch(request, { cache: "no-store" })
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put("./index.html", copy);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match("./index.html").then((cached) => {
            return cached || caches.match("./");
          });
        })
    );
    return;
  }

  // For sw.js itself:
  // Never cache service worker file, always update from GitHub.
  if (request.url.includes("/sw.js")) {
    event.respondWith(fetch(request, { cache: "no-store" }));
    return;
  }

  // For manifest/icons/assets:
  // Use cache first for offline speed, then update cache in background.
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request, { cache: "no-store" })
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, copy);
            });
          }
          return response;
        })
        .catch(() => cached);

      return cached || fetchPromise;
    })
  );
});
