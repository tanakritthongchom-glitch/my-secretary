// Service Worker for Personal Secretary PWA

const CACHE_NAME = 'secretary-v1';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './speech.js',
  './notifications.js',
  './manifest.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((res) => res || fetch(e.request))
  );
});

self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SCHEDULE_NOTIFICATION') {
    const title = e.data.title || '⏰ เตือนความจำ';
    const options = {
      body: e.data.body || 'ได้เวลาทำภารกิจแล้วครับ!',
      icon: './icon-192.png',
      badge: './icon-192.png',
      vibrate: [300, 100, 300, 100, 300],
      renotify: true,
      tag: e.data.taskId || 'alarm-tag',
      data: { taskId: e.data.taskId }
    };
    self.registration.showNotification(title, options);
  }
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('./');
      }
    })
  );
});
