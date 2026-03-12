self.addEventListener('install', (event) => {
    console.log('Service Worker installé');
});

self.addEventListener('activate', (event) => {
    console.log('Service Worker activé');
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(clients.openWindow('/'));
});

self.addEventListener('push', (event) => {
    const options = {
        body: event.data.text(),
        icon: '/icon-192.png',
        badge: '/icon-192.png'
    };
    event.waitUntil(self.registration.showNotification('Assistant Santé', options));
});
