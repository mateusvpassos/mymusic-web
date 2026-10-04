import { createApp } from 'vue'
import './style.css'
import App from './App.vue'

// sem PWA: se algum service worker velho ainda estiver registrado, sai
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(async (rs) => {
    if (!rs.length) return;
    await Promise.all(rs.map((r) => r.unregister()));
    if ('caches' in window) for (const k of await caches.keys()) await caches.delete(k);
    location.reload();
  });
}

createApp(App).mount('#app')
