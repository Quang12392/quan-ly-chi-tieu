// Service Worker v3 - lưu sẵn giao diện để app mở được khi không có mạng.
// Dữ liệu (Google Apps Script, POST, khác domain) không đi qua cache này.
const CACHE_NAME = 'fam-exp-pwa-v3';
// Máy chủ có thể gửi 'Vary' (vd. Origin, Accept-Encoding); file tĩnh không đổi theo các header này.
const MATCH = { ignoreVary: true };
const SHELL_PAGE = './index.html';
const STATIC_FILES = [
  './manifest.json?v=2',
  './favicon.png?v=2',
  './apple-touch-icon.png?v=2',
  './icon-192.png?v=2',
  './icon-512.png?v=2',
];

// Lấy danh sách file JS/CSS (tên có mã băm, thay đổi mỗi lần build) từ index.html.
function assetsIn(html) {
  return Array.from(html.matchAll(/(?:src|href)="\.?\/?(assets\/[^"]+)"/g), (m) => './' + m[1]);
}

// Lưu index.html mới cùng đúng các file nó cần, rồi bỏ các file build cũ.
async function cacheShell(cache, response) {
  const html = await response.clone().text();
  const assets = assetsIn(html);
  await Promise.all(assets.map(async (asset) => {
    if (!(await cache.match(asset, MATCH))) await cache.add(asset);
  }));
  await cache.put(SHELL_PAGE, response);
  const keep = new Set(assets.map((asset) => new URL(asset, self.registration.scope).href));
  const keys = await cache.keys();
  await Promise.all(keys
    .filter((request) => request.url.includes('/assets/') && !keep.has(request.url))
    .map((request) => cache.delete(request)));
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(STATIC_FILES.map((file) => cache.add(file).catch(() => undefined)));
    const response = await fetch(SHELL_PAGE, { cache: 'no-store' });
    if (response.ok) await cacheShell(cache, response);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Trang chính: ưu tiên mạng để luôn có bản mới; mất mạng thì dùng bản đã lưu.
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const response = await fetch(request);
        if (response.ok) event.waitUntil(cacheShell(cache, response.clone()).catch(() => undefined));
        return response;
      } catch (error) {
        const cached = await cache.match(SHELL_PAGE, MATCH);
        if (cached) return cached;
        throw error;
      }
    })());
    return;
  }

  // File build có mã băm trong tên: không bao giờ đổi nội dung, lấy từ cache trước.
  if (url.pathname.includes('/assets/')) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request, MATCH);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) event.waitUntil(cache.put(request, response.clone()));
      return response;
    })());
    return;
  }

  // Icon và manifest: dùng bản đã lưu, cập nhật ngầm khi có mạng.
  if (/\.(png|svg|json)$/.test(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request, MATCH);
      const network = fetch(request).then((response) => {
        if (response.ok) cache.put(request, response.clone());
        return response;
      });
      if (cached) {
        event.waitUntil(network.catch(() => undefined));
        return cached;
      }
      return network;
    })());
  }
});
