/* Service Worker · Plataforma Agroclimática Los Olmos */
const CACHE = 'olmos-agroclima-v3';
const CORE = ['./','./index.html','./datos.json','./config.json','./manifest.webmanifest',
  './icon-192.png','./icon-512.png','./apple-touch-icon.png',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c =>
    Promise.all(CORE.map(u => c.add(new Request(u, {mode: u.startsWith('http') ? 'cors' : 'same-origin'})).catch(() => {})))
  ));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('message', e => { if (e.data === 'skipWaiting') self.skipWaiting(); });

function cacheable(url) {
  const u = new URL(url);
  if (u.origin === self.location.origin) return true;
  return /cdnjs\.cloudflare\.com|fonts\.googleapis\.com|fonts\.gstatic\.com/.test(u.hostname);
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // documento, datos y configuración: primero la red, así llegan las actualizaciones
  const vivo = req.mode === 'navigate' || req.destination === 'document' ||
               /\/(datos|config)\.json$/.test(url.pathname);
  if (vivo) {
    e.respondWith(
      fetch(req).then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); return r; })
        .catch(() => caches.match(req, {ignoreSearch: true})
          .then(r => r || caches.match('./index.html')))
    );
    return;
  }

  if (!cacheable(req.url)) return;  // teselas de mapas y otros externos van directo a la red

  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
    if (r && r.ok) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); }
    return r;
  }).catch(() => hit)));
});
