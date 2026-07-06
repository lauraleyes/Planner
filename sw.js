const CACHE = 'planner-v6';
const ASSETS = ['./index.html', './manifest.json', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  e.waitUntil(clients.claim());
});

self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});

self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SCHEDULE_NOTIFICATIONS') {
    scheduleAll(e.data.activities);
  }
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow('./index.html'));
});

// Store timers
const timers = {};

function scheduleAll(activities) {
  // Clear existing timers
  Object.values(timers).forEach(t => clearTimeout(t));
  Object.keys(timers).forEach(k => delete timers[k]);

  const trackable = activities.filter(a => a.type === 'study' || a.type === 'dark');
  
  trackable.forEach(act => {
    const [h, m] = act.time.split(':').map(Number);
    const now = new Date();
    const target = new Date();
    target.setHours(h, m, 0, 0);
    
    let delay = target - now;
    if (delay < 0) delay += 24 * 60 * 60 * 1000;
    
    timers[act.id] = setTimeout(() => {
      self.registration.showNotification('✦ ' + act.label, {
        body: 'Son las ' + act.time + ' — hora de ' + act.label.toLowerCase(),
        icon: './icons/icon-192.png',
        badge: './icons/icon-192.png',
        tag: act.id,
        requireInteraction: false
      });
      // Reschedule for next day
      timers[act.id] = setTimeout(() => scheduleAll(activities), delay + 1000);
    }, delay);
  });
}
