/* Quaderno — service worker: fa funzionare l'app anche senza internet.
   Quando modifichi index.html, aumenta il numero di VERSION qui sotto. */
var VERSION = 'quaderno-v9';
var APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './firebase-config.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/favicon-32.png',
  './icons/apple-touch-icon-180.png'
];

self.addEventListener('install', function(event){
  event.waitUntil(caches.open(VERSION).then(function(cache){ return cache.addAll(APP_SHELL); }).then(function(){ return self.skipWaiting(); }));
});

self.addEventListener('activate', function(event){
  event.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(k){ return k !== VERSION; }).map(function(k){ return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});

self.addEventListener('fetch', function(event){
  var req = event.request;
  if(req.method !== 'GET') return;
  var url = new URL(req.url);

  // Pagina dell'app: prima la rete (così ricevi gli aggiornamenti), se offline usa la copia salvata
  if(req.mode === 'navigate'){
    event.respondWith(
      fetch(req).then(function(res){
        var copy = res.clone();
        caches.open(VERSION).then(function(c){ c.put('./index.html', copy); });
        return res;
      }).catch(function(){ return caches.match('./index.html'); })
    );
    return;
  }

  // Font Google e libreria Firebase: usa la copia salvata e aggiornala in background
  if(url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com' || (url.hostname === 'www.gstatic.com' && url.pathname.indexOf('/firebasejs/') === 0)){
    event.respondWith(caches.open(VERSION).then(function(cache){
      return cache.match(req).then(function(hit){
        var net = fetch(req).then(function(res){ if(res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone()); return res; }).catch(function(){ return hit; });
        return hit || net;
      });
    }));
    return;
  }

  // File dell'app (configurazione, icone, manifest): prima la rete, così gli aggiornamenti arrivano subito; offline usa la copia
  if(url.origin === self.location.origin){
    event.respondWith(
      fetch(req).then(function(res){
        if(res && res.ok){ var copy = res.clone(); caches.open(VERSION).then(function(c){ c.put(req, copy); }); }
        return res;
      }).catch(function(){ return caches.match(req); })
    );
  }
});
