// 1. Agregamos la librería de OneSignal al principio
importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');

// 2. Aquí empieza tu código original (no borres nada de lo que sigue)
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());

// Red primero; si falla, intenta caché (si existe)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
