/**
 * sw.js  —  AetherTrack Service Worker
 *
 * Strategy:
 *   - App shell (HTML/JS/CSS): Cache-First with background refresh
 *   - API requests:            Network-First with 5 s timeout, fallback to cache
 *   - Images & avatars:        Cache-First (long TTL)
 *   - Mutations (POST/PUT/DELETE): Network-only; queue offline, replay on reconnect
 *
 * This file is placed in /public/sw.js and referenced by vite-plugin-pwa
 * (see vite.config.js injectManifest option).
 */

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute }      from 'workbox-routing';
import { CacheFirst, NetworkFirst, NetworkOnly } from 'workbox-strategies';
import { ExpirationPlugin }   from 'workbox-expiration';
import { BackgroundSyncPlugin } from 'workbox-background-sync';
import { Queue }              from 'workbox-background-sync';

/* ── Constants ─────────────────────────────────────────────────────────── */
const CACHE_VERSION    = 'v1';
const SHELL_CACHE      = `aethertrack-shell-${CACHE_VERSION}`;
const API_CACHE        = `aethertrack-api-${CACHE_VERSION}`;
const IMAGE_CACHE      = `aethertrack-images-${CACHE_VERSION}`;
const OFFLINE_PAGE     = '/offline.html';
const API_ORIGIN       = self.location.origin;

/* ── Workbox precache ───────────────────────────────────────────────────── */
// __WB_MANIFEST is replaced by vite-plugin-pwa with the built asset list
precacheAndRoute(self.__WB_MANIFEST || []);
cleanupOutdatedCaches();

/* ── Offline mutation queue ─────────────────────────────────────────────── */
const offlineQueue = new Queue('aethertrack-offline-mutations', {
  maxRetentionTime: 24 * 60,   // 24 hours in minutes
  onSync: async ({ queue }) => {
    let entry;
    while ((entry = await queue.shiftRequest())) {
      try {
        await fetch(entry.request.clone());
        console.log('[SW] Replayed queued request:', entry.request.url);
      } catch (err) {
        await queue.unshiftRequest(entry);
        console.error('[SW] Replay failed, re-queued:', err);
        throw err;
      }
    }
  },
});

/* ── App shell — Cache First ────────────────────────────────────────────── */
registerRoute(
  ({ request }) => request.destination === 'document' ||
                   request.destination === 'script'   ||
                   request.destination === 'style',
  new CacheFirst({
    cacheName: SHELL_CACHE,
    plugins: [
      new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 7 * 24 * 60 * 60 }),
    ],
  })
);

/* ── API — Network First with 5 s timeout ───────────────────────────────── */
registerRoute(
  ({ url, request }) =>
    (url.pathname.startsWith('/api/') || url.origin !== self.location.origin) &&
    request.method === 'GET',
  new NetworkFirst({
    cacheName: API_CACHE,
    networkTimeoutSeconds: 5,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 5 * 60,     // 5 minutes
        purgeOnQuotaError: true,
      }),
    ],
  })
);

/* ── API mutations — queue when offline ─────────────────────────────────── */
registerRoute(
  ({ url, request }) =>
    url.pathname.startsWith('/api/') &&
    ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method),
  new NetworkOnly({
    plugins: [
      {
        fetchDidFail: async ({ request }) => {
          await offlineQueue.pushRequest({ request });
          console.log('[SW] Queued offline mutation:', request.url);
        },
      },
    ],
  }),
  'POST'
);

/* ── Images — Cache First, long TTL ────────────────────────────────────── */
registerRoute(
  ({ request }) =>
    request.destination === 'image' ||
    request.url.includes('cloudinary.com') ||
    request.url.includes('res.cloudinary.com'),
  new CacheFirst({
    cacheName: IMAGE_CACHE,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 300,
        maxAgeSeconds: 30 * 24 * 60 * 60,  // 30 days
        purgeOnQuotaError: true,
      }),
    ],
  })
);

/* ── Offline fallback ────────────────────────────────────────────────────── */
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match(OFFLINE_PAGE) ||
        caches.match('/index.html')
      )
    );
  }
});

/* ── Skip waiting / claim clients ───────────────────────────────────────── */
self.addEventListener('install',  () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

/* ── Push notification handler (when app is closed) ────────────────────── */
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;
  try { data = event.data.json(); }
  catch { data = { title: 'AetherTrack', body: event.data.text() }; }

  const options = {
    body:    data.body || '',
    icon:    '/icons/icon-192.png',
    badge:   '/icons/badge-72.png',
    data:    { deepLink: data.deepLink, route: data.route },
    actions: data.actions || [],
    tag:     data.tag     || 'aethertrack',
    renotify: true,
    vibrate: [100, 50, 100],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'AetherTrack', options)
  );
});

/* ── Notification click ─────────────────────────────────────────────────── */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const { deepLink, route } = event.notification.data || {};
  const targetUrl = deepLink || (route ? `${self.location.origin}${route}` : self.location.origin);

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      const existingWindow = windowClients.find(c => c.url.startsWith(self.location.origin) && 'focus' in c);
      if (existingWindow) {
        existingWindow.focus();
        existingWindow.postMessage({ type: 'NAVIGATE', url: targetUrl });
      } else {
        clients.openWindow(targetUrl);
      }
    })
  );
});

/* ── Background sync trigger ─────────────────────────────────────────────── */
self.addEventListener('sync', (event) => {
  if (event.tag === 'aethertrack-offline-mutations') {
    event.waitUntil(offlineQueue.replayRequests());
  }
});
