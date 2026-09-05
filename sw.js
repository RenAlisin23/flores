/* Service worker: deja que las flores abran sin internet. */
var CACHE = "flores-v1";
var BASE = [
  "./",
  "index.html",
  "manifest.json",
  "icon-192.png",
  "icon-512.png",
  "apple-touch-icon.png"
];
var FUENTES = ["fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return c.addAll(BASE);
    }).catch(function () {}).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (llaves) {
      return Promise.all(llaves.map(function (k) {
        return k === CACHE ? null : caches.delete(k);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;

  var url;
  try { url = new URL(req.url); } catch (err) { return; }

  var mismoOrigen = url.origin === self.location.origin;
  var esFuente = FUENTES.indexOf(url.hostname) !== -1;
  if (!mismoOrigen && !esFuente) return;

  // La página: red primero (para recibir cambios), caché si no hay señal.
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).then(function (res) {
        var copia = res.clone();
        caches.open(CACHE).then(function (c) { c.put("index.html", copia); });
        return res;
      }).catch(function () {
        return caches.match("index.html").then(function (r) {
          return r || caches.match("./");
        });
      })
    );
    return;
  }

  // Todo lo demás: caché primero.
  e.respondWith(
    caches.match(req).then(function (guardado) {
      if (guardado) return guardado;
      return fetch(req).then(function (res) {
        if (res && (res.status === 200 || res.type === "opaque")) {
          var copia = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copia); });
        }
        return res;
      });
    })
  );
});
