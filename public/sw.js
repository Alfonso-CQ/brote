/* ==========================================================================
   Brote – Service worker
   Estrategia: "red primero". Intenta descargar la versión más nueva y, si no
   hay conexión, entrega la copia guardada. Las llamadas a /api/ y el video
   nunca se guardan en caché.
   ========================================================================== */

// Al cambiar este nombre, el navegador instala una versión nueva y borra las copias viejas
const VERSION = "brote-v3";

// Archivos que se guardan desde el inicio para poder abrir la página sin conexión
const BASE = [
  "/",
  "/index.html",
  "/css/estilos.css",
  "/js/app.js",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

// Instalación: guarda los archivos base
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(BASE)));
  self.skipWaiting();
});

// Activación: borra las cachés de versiones anteriores
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((claves) => Promise.all(claves.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

// Cada solicitud de la página pasa por aquí
self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);

  const noGuardar =
    req.method !== "GET" ||
    url.origin !== location.origin ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/video/");
  if (noGuardar) return;

  e.respondWith(
    fetch(req)
      .then((res) => {
        const copia = res.clone();
        caches.open(VERSION).then((c) => c.put(req, copia));
        return res;
      })
      .catch(() => caches.match(req).then((m) => m || caches.match("/")))
  );
});