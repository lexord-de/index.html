/* LEXORD Admin Service Worker — Web Push Notifications
 * Empfaengt Push vom Cloudflare Worker -> zeigt Notification auf Sperrbildschirm
 * Funktioniert auch wenn Browser/PWA komplett geschlossen
 */
'use strict';

const SW_VERSION = 'lxrd-admin-sw-v1';

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(self.clients.claim());
});

/* Push-Empfang: Cloudflare Worker sendet payload -> Notification anzeigen */
self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch(e){ data = { title: 'LEXORD', body: (event.data && event.data.text()) || 'Neues Ereignis' }; }

  const title = data.title || '🎮 LEXORD';
  const options = {
    body: data.body || 'Neue Aktivität',
    icon: data.icon || '/IMG_7023.png',
    badge: data.badge || '/IMG_7023.png',
    tag: data.tag || ('lxrd-'+Date.now()),
    renotify: true,
    requireInteraction: data.requireInteraction !== false,
    vibrate: data.vibrate || [200, 100, 200, 100, 300],
    timestamp: Date.now(),
    data: {
      url: data.url || '/admin.html',
      orderNr: data.orderNr || null,
      type: data.type || 'order'
    },
    actions: data.actions || [
      { action: 'open', title: '📋 Öffnen' },
      { action: 'close', title: '✕ Schliessen' }
    ]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

/* Klick auf die Notification -> Admin-Panel oeffnen oder Fokus */
self.addEventListener('notificationclick', event => {
  event.notification.close();
  if(event.action === 'close') return;
  const url = (event.notification.data && event.notification.data.url) || '/admin.html';
  event.waitUntil(
    self.clients.matchAll({ type:'window', includeUncontrolled:true }).then(list => {
      for(const c of list){
        if(c.url.includes('/admin.html')){
          c.focus();
          return c.navigate(url);
        }
      }
      return self.clients.openWindow(url);
    })
  );
});

self.addEventListener('pushsubscriptionchange', event => {
  /* Sub abgelaufen -> neue Sub anfordern und an Backend schicken */
  event.waitUntil(
    self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: event.oldSubscription && event.oldSubscription.options.applicationServerKey
    }).then(sub => {
      return fetch('/admin/push/refresh', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ old: event.oldSubscription, sub })
      });
    })
  );
});
