importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');

const CACHE_NAME = 'contratista-v2';
const APP_SHELL = ['./', './index.html', './app.js', './styles.css', './manifest.webmanifest'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL).catch(() => {}))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // ✅ NO interceptar peticiones con Range (streaming de video/audio)
  // Esto evita el error "Failed to convert value to 'Response'" en <video> y <audio>
  if (req.headers.has('range')) {
    return;
  }

  // ✅ NO interceptar archivos multimedia (mp4, mp3, webm, mov, ogg, wav, m4a)
  // El navegador los maneja directamente sin pasar por el SW
  if (/\.(mp4|mp3|webm|mov|ogg|wav|m4a|avi|mkv)(\?|$)/i.test(url.pathname + url.search)) {
    return;
  }

  // ✅ NO interceptar contenido multimedia de Cloudinary (videos y audios)
  if (url.hostname === 'res.cloudinary.com' && /\/video\/upload\//.test(url.pathname)) {
    return;
  }

  // version.json SIEMPRE desde la red, nunca caché
  if (url.pathname.endsWith('/version.json')) {
    event.respondWith(fetch(req, { cache: 'no-store' }).catch(() => new Response('{}', { headers: { 'Content-Type': 'application/json' } })));
    return;
  }

  // HTML, JS y CSS: network-first (red primero, caché como respaldo)
  const isAppShell = /\.(html|js|css)$/.test(url.pathname) || url.pathname.endsWith('/');
  if (isAppShell && url.origin === location.origin) {
    event.respondWith(
      fetch(req, { cache: 'no-store' }).then(res => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match(req))
    );
    return;
  }

  // Resto: red con fallback a caché
  event.respondWith(fetch(req).catch(() => caches.match(req)));
});
