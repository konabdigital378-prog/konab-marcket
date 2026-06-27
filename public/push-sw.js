self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(clients.claim()));

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

function playBeep() {
  try {
    const sampleRate = 22050;
    const duration = 0.35;
    const numSamples = Math.floor(sampleRate * duration);
    const buffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buffer);

    const writeString = (offset, str) => {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + numSamples * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, numSamples * 2, true);

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const freq1 = 880;
      const freq2 = 1100;
      const env = t < 0.05 ? t / 0.05 : t < 0.25 ? 1.0 : Math.max(0, 1 - (t - 0.25) / 0.1);
      const sample = Math.sin(2 * Math.PI * freq1 * t) * 0.5 + Math.sin(2 * Math.PI * freq2 * t) * 0.3;
      view.setInt16(44 + i * 2, Math.floor(sample * env * 0.5 * 32767), true);
    }

    const blob = new Blob([buffer], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);

    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      if (clients.length > 0) {
        clients.forEach((client) => {
          client.postMessage({ type: 'PLAY_NOTIF_SOUND', url });
        });
      }
    });

    setTimeout(() => URL.revokeObjectURL(url), 5000);
  } catch (_) {}
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
      playBeep();

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
          { action: 'open', title: '👁️ Voir' },
          { action: 'close', title: '✕ Fermer' },
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

      const clientList = await clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) {
          client.postMessage({ type: 'CLEAR_BADGE' });
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
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
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
