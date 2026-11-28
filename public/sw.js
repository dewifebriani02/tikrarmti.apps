// Self-unregistering kill-switch Service Worker for Tikrar MTI Apps
// Clears stale PWA / home-screen shortcut caches and reloads active tabs to the latest version.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      } catch (e) {
        // ignore cache deletion errors
      }
      try {
        await self.registration.unregister();
      } catch (e) {
        // ignore unregister errors
      }
      try {
        const clientsList = await self.clients.matchAll({ type: 'window' });
        for (const client of clientsList) {
          if (client.url && 'navigate' in client) {
            client.navigate(client.url);
          }
        }
      } catch (e) {
        // ignore client navigation errors
      }
    })()
  );
});
