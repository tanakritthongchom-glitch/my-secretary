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

let scheduledTimers = [];

self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SCHEDULE_NOTIFICATION') {
    const title = e.data.title || '⏰ เตือนความจำ';
    const options = {
      body: e.data.body || 'ได้เวลาทำภารกิจแล้วครับ!',
      icon: './icon-192.png',
      badge: './icon-192.png',
      vibrate: [500, 200, 500, 200, 1000],
      renotify: true,
      tag: e.data.taskId || 'alarm-tag',
      data: { taskId: e.data.taskId }
    };
    self.registration.showNotification(title, options);
  }

  if (e.data && e.data.type === 'SYNC_TASKS') {
    // Clear old timers
    scheduledTimers.forEach(timer => clearTimeout(timer));
    scheduledTimers = [];

    const tasks = e.data.tasks || [];
    const now = new Date();

    tasks.forEach(task => {
      if (!task.time || task.done || task.active === false) return;

      const [hrs, mins] = task.time.split(':').map(Number);
      const targetDate = new Date();
      targetDate.setHours(hrs, mins, 0, 0);

      let delay = targetDate.getTime() - now.getTime();
      if (delay < 0) return; // Passed already today

      const timer = setTimeout(() => {
        const title = `⏰ เตือนความจำเวลา (${task.time} น.)`;
        const body = task.customAlert || `ได้เวลา ${task.title} แล้วครับ!`;
        self.registration.showNotification(title, {
          body: body,
          icon: './icon-192.png',
          badge: './icon-192.png',
          vibrate: [500, 200, 500, 200, 1000],
          renotify: true,
          tag: task.id || 'alarm-tag',
          data: { taskId: task.id }
        });
      }, delay);

      scheduledTimers.push(timer);
    });
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
