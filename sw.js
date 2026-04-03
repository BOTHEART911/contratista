// 1) Listener(s) obligatorios "temprano" (antes de importScripts)
//    Esto evita el warning: "Event handler of 'message' event must be added on the initial evaluation..."
self.addEventListener('message', (event) => {
  // Puedes dejarlo vacío; lo importante es que exista desde el arranque.
  // Si quieres, puedes manejar comandos del cliente aquí.
});

// Opcional (pero buena práctica)
self.addEventListener('notificationclick', (event) => {
  // Permite que al tocar la notificación se enfoque/abra la app
  event.notification?.close?.();
  event.waitUntil(
    (async () => {
      const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
      const urlToOpen = new URL('/contratista/', self.location.origin).href;

      for (const client of allClients) {
        if ('focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(urlToOpen);
    })()
  );
});

// 2) Ahora sí: carga OneSignal SW
importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');

// 3) Tu lógica propia (si la necesitas)
// OJO: tu fetch handler puede interferir con cosas del SW de OneSignal.
// Si no lo necesitas para offline, lo mejor es quitarlo.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());

// Si realmente necesitas esto, mantenlo, pero si ves comportamientos raros con push,
// prueba comentarlo.
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
