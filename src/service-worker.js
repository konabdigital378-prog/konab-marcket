/* eslint-disable no-restricted-globals */

import { clientsClaim } from 'workbox-core';
import { ExpirationPlugin } from 'workbox-expiration';
import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate } from 'workbox-strategies';

clientsClaim();

precacheAndRoute(self.__WB_MANIFEST);

const fileExtensionRegexp = new RegExp('/[^/?]+\\.[^/]+$');
registerRoute(
  ({ request, url }) => {
    if (request.mode !== 'navigate') return false;
    if (url.pathname.startsWith('/_')) return false;
    if (url.pathname.match(fileExtensionRegexp)) return false;
    return true;
  },
  createHandlerBoundToURL(process.env.PUBLIC_URL + '/index.html')
);

registerRoute(
  ({ url }) => url.origin === self.location.origin && url.pathname.endsWith('.png'),
  new StaleWhileRevalidate({
    cacheName: 'images',
    plugins: [new ExpirationPlugin({ maxEntries: 50 })],
  })
);

const DB_NAME = 'konab-notif-badge';
const STORE_NAME = 'count';

function openDB() {
  return new Promise((resolve) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}

async function getBadgeCount() {
  const db = await openDB();
  if (!db) return 0;
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get('unread');
    req.onsuccess = () => resolve(req.result || 0);
    req.onerror = () => resolve(0);
  });
}

async function setBadgeCount(count) {
  const db = await openDB();
  if (!db) return;
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).put(count, 'unread');
  if ('setAppBadge' in self.registration) {
    try {
      if (count > 0) {
        await self.registration.setAppBadge(count);
      } else {
        await self.registration.setAppBadge(0);
      }
    } catch (_) {}
  }
}

async function incrementBadge() {
  const current = await getBadgeCount();
  await setBadgeCount(current + 1);
  return current + 1;
}

function notifyClientsPlaySound() {
  self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
    windowClients.forEach((client) => {
      client.postMessage({ type: 'PLAY_NOTIF_SOUND' });
    });
  });
}

self.addEventListener('push', (event) => {
  let data = { title: 'Konab Marcket', body: '', icon: '/logokb.png', badge: '/logokb.png', url: '/' };
  try {
    const parsed = event.data ? event.data.json() : {};
    data = { ...data, ...parsed };
  } catch (_) { data.body = event.data?.text() || ''; }

  event.waitUntil(
    (async () => {
      const count = await incrementBadge();
      notifyClientsPlaySound();

      await self.registration.showNotification(data.title, {
        body: data.body,
        icon: data.icon,
        badge: data.badge,
        data: { url: data.url || '/', count },
        vibrate: [300, 100, 300, 100, 300],
        requireInteraction: true,
        silent: false,
        renotify: true,
        tag: data.url || 'default',
        actions: [
          { action: 'open', title: 'Voir' },
          { action: 'close', title: 'Fermer' },
        ],
      });
    })()
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  const count = event.notification.data?.count || 0;

  if (event.action === 'close') {
    event.waitUntil((async () => {
      const newCount = Math.max(0, count - 1);
      await setBadgeCount(newCount);
    })());
    return;
  }

  event.waitUntil(
    (async () => {
      await setBadgeCount(0);
      const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) {
          client.postMessage({ type: 'CLEAR_BADGE' });
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })()
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SET_BADGE') {
    setBadgeCount(event.data.count || 0);
  }
  if (event.data?.type === 'CLEAR_BADGE') {
    setBadgeCount(0);
  }
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
