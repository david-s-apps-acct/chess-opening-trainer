// Chess Opening Trainer by David Sharman. Copyright © 2026 David Sharman. AGPL-3.0-or-later with an
// attribution term (see LICENSE and NOTICE.md).
//
// The service worker: keeps the app working offline (everything except Lichess) on the online version.
// - The app's own files (index.html, trial.json): from the network when online, so a new version
//   arrives straight away; the saved copy when offline.
// - The libraries, fonts and sounds from jsDelivr: the saved copy first. Their addresses name a fixed
//   version and never change, so a saved copy never goes out of date.
// - Lichess (studies, statistics, login) is never stored here.
// Saved on the first visit; anything else from jsDelivr is saved the first time it's used.
// Change VERSION when the list below changes (e.g. a library's version), so old copies are dropped.

const VERSION = 'v1';
const APP = `cot-app-${VERSION}`, LIBRARIES = `cot-libraries-${VERSION}`;
const CDN = 'https://cdn.jsdelivr.net';

const APP_FILES = ['./', './index.html', './trial.json'];
const LIBRARY_FILES = [
  '/npm/chessground@9.2.1/+esm',
  '/npm/chessops@0.15.1/+esm',
  '/npm/@badrap/result@0.3.1/+esm', // chessops uses it
  '/npm/chessground@9.2.1/assets/chessground.base.css',
  '/npm/chessground@9.2.1/assets/chessground.brown.css',
  '/npm/chessground@9.2.1/assets/chessground.cburnett.css',
  '/npm/@fontsource/noto-sans@5.3.0/400.css',
  '/npm/@fontsource/noto-sans@5.3.0/600.css',
  '/npm/@fontsource/noto-sans@5.3.0/700.css',
  '/npm/@fontsource/noto-sans@5.3.0/files/noto-sans-latin-400-normal.woff2',
  '/npm/@fontsource/noto-sans@5.3.0/files/noto-sans-latin-600-normal.woff2',
  '/npm/@fontsource/noto-sans@5.3.0/files/noto-sans-latin-700-normal.woff2',
  '/npm/@fontsource/noto-sans-symbols-2@5.3.0/400.css',
  '/npm/@fontsource/noto-sans-symbols-2@5.3.0/files/noto-sans-symbols-2-symbols-400-normal.woff2',
  '/gh/lichess-org/lila@b3f190be9d532d5f9cdf746938e9d480b1464e25/public/sound/sfx/Move.mp3',
  '/gh/lichess-org/lila@b3f190be9d532d5f9cdf746938e9d480b1464e25/public/sound/sfx/Capture.mp3',
].map(path => CDN + path);

// Each file on its own, so one that can't be fetched doesn't stop the rest.
const saveAll = async (cacheName, urls) => {
  const cache = await caches.open(cacheName);
  await Promise.all(urls.map(url => cache.add(url).catch(() => {})));
};

self.addEventListener('install', event => {
  event.waitUntil(Promise.all([saveAll(APP, APP_FILES), saveAll(LIBRARIES, LIBRARY_FILES)]).then(() => self.skipWaiting()));
});

// Drops the copies saved by earlier versions, and looks after the open page straight away.
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys()
    .then(names => Promise.all(names.filter(n => n.startsWith('cot-') && n !== APP && n !== LIBRARIES).map(n => caches.delete(n))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin === CDN) event.respondWith(savedFirst(request));
  else if (url.origin === self.location.origin) event.respondWith(networkFirst(request));
  // Anything else (Lichess) goes straight to the network.
});

async function savedFirst(request) {
  const saved = await caches.match(request);
  if (saved) return saved;
  const response = await fetch(request);
  if (response.ok) (await caches.open(LIBRARIES)).put(request, response.clone());
  return response;
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) (await caches.open(APP)).put(request, response.clone());
    return response;
  } catch (e) {
    // Offline: the saved copy (ignoring ?… such as the code on the way back from Lichess).
    const saved = await caches.match(request, { ignoreSearch: true }) || (request.mode === 'navigate' && await caches.match('./index.html'));
    if (saved) return saved;
    throw e;
  }
}
