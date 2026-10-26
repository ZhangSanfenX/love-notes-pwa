const CACHE='lovenotes-pwa-1.0.0-release';
const FILES=['./','./index.html','./app.css','./app.js','./core.js','./manifest.webmanifest','./assets/couple.png','./assets/mood_atlas.png','./assets/icon.svg','./assets/icon-192.png','./assets/icon-512.png','./vendor/fflate.js'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('lovenotes-pwa-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('message',event=>{if(event.data==='ACTIVATE_UPDATE')self.skipWaiting();});
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin)return;event.respondWith(caches.open(CACHE).then(async cache=>{const cached=await cache.match(event.request);if(cached)return cached;try{const response=await fetch(event.request);return response;}catch(error){if(event.request.mode==='navigate')return cache.match('./index.html');throw error;}}));});
