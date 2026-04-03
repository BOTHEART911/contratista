// 1) Agrega handlers INMEDIATAMENTE (evaluación inicial)
self.addEventListener('message', (event) => {
  // Puedes dejarlo vacío; lo importante es que exista desde el inicio.
  // OneSignal también usa message internamente.
});

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

// 2) Importa OneSignal DESPUÉS
importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');
