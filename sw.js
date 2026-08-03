/* OneSignal: si el CDN falla, el SW propio debe seguir vivo. */
try{
  importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');
}catch(e){
  console.warn('[SW] No se pudo cargar OneSignal, se continúa sin push:', e);
}

const CACHE_NAME = 'contratista-v3';
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

/* Respaldo seguro: caches.match() puede resolver a undefined y
   respondWith(undefined) lanza "Failed to convert value to 'Response'". */
async function respaldoCache_(req){
  try{
    const hit = await caches.match(req);
    if (hit) return hit;
    if (req.mode === 'navigate') {
      const shell = await caches.match('./index.html');
      if (shell) return shell;
    }
  }catch(_){}
  return new Response('', { status: 504, statusText: 'Sin conexión' });
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch (_) { return; }

  // ⛔ NO tocar NADA de otro origen (backend Apps Script, CDNs, Cloudinary, OneSignal…).
  //    Apps Script responde /exec con un 302 hacia script.googleusercontent.com
  //    usando una clave de un solo uso; si el SW reenvía esa petición la clave ya
  //    está gastada y Google devuelve una página HTML 404 -> el front reventaba con
  //    "Unexpected token '<', "<!DOCTYPE "... is not valid JSON".
  if (url.origin !== self.location.origin) return;

  // ✅ NO interceptar peticiones con Range (streaming de video/audio)
  if (req.headers.has('range')) return;

  // ✅ NO interceptar archivos multimedia
  if (/\.(mp4|mp3|webm|mov|ogg|wav|m4a|avi|mkv)(\?|$)/i.test(url.pathname + url.search)) return;

  // version.json SIEMPRE desde la red, nunca caché
  if (url.pathname.endsWith('/version.json')) {
    event.respondWith(
      fetch(req, { cache: 'no-store' })
        .catch(() => new Response('{}', { headers: { 'Content-Type': 'application/json' } }))
    );
    return;
  }

  // HTML, JS y CSS propios: red primero, caché como respaldo
  const isAppShell = /\.(html|js|css)$/.test(url.pathname) || url.pathname.endsWith('/');
  if (isAppShell) {
    event.respondWith(
      fetch(req, { cache: 'no-store' }).then(res => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => respaldoCache_(req))
    );
    return;
  }

  // Resto del mismo origen: red con respaldo a caché
  event.respondWith(fetch(req).catch(() => respaldoCache_(req)));
});
