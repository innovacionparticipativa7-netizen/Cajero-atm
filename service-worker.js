const CACHE_NAME = "catalogo-ip-v2";

const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./catalogo.html",
  "./puntos.html",
  "./manifest.json",
  "./Favicon.png",
  "./logo.png",
  "./sync.js"
];

// Instalar y cachear archivos locales
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Promise.allSettled evita que un solo archivo faltante tumbe todo el cacheo
      return Promise.allSettled(
        FILES_TO_CACHE.map(url =>
          cache.add(url).catch(err => {
            console.warn("No se pudo cachear:", url, err);
          })
        )
      );
    })
  );
  self.skipWaiting();
});

// Limpiar caches viejos cuando se activa una nueva versión
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Servir desde cache, con fallback a red, y guardar lo nuevo que se pueda
self.addEventListener("fetch", event => {
  // Solo interceptar peticiones GET del mismo origen (evita romper Firebase/CDN)
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) return cachedResponse;

      return fetch(event.request)
        .then(networkResponse => {
          // Guardar copia en cache para la próxima vez (solo mismo origen)
          if (event.request.url.startsWith(self.location.origin)) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(() => {
          // Sin internet y sin cache: si pedían una página HTML, manda el index como fallback
          if (event.request.headers.get("accept")?.includes("text/html")) {
            return caches.match("./index.html");
          }
        });
    })
  );
});
