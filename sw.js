/* Service worker — Carte de visite numérique
   RÈGLE : incrémenter VERSION à chaque modification de index.html. */
const VERSION = 'carte-v29';
const SHELL = ['./', './?v=qr', './index.html', './manifest.json',
  './icon.svg', './icon.png', './logo-blanc.png'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VERSION)
      // addAll rejette en bloc si un seul fichier manque : on met en cache
      // fichier par fichier pour qu'un absent ne bloque pas l'installation.
      .then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // polices Google : réseau direct

  // Navigation : réseau d'abord, pour que les mises à jour arrivent tout de suite.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(VERSION).then(c => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html').then(r => r || caches.match('./')))
    );
    return;
  }

  // Reste : cache d'abord.
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res && res.status === 200 && res.type === 'basic') {
        const copy = res.clone();
        caches.open(VERSION).then(c => c.put(req, copy));
      }
      return res;
    }))
  );
});
