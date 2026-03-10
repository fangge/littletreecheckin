// ============================================================
// Service Worker - 成就丛林 PWA 缓存策略
// ============================================================

const CACHE_NAME = 'happygrow-v1';
const STATIC_CACHE_NAME = 'happygrow-static-v1';

// 需要预缓存的静态资源
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  '/logo.png',
  '/logo2.png',
];

// API 请求前缀 - 这些请求走网络优先策略
const API_PREFIX = '/api/';

// Google Fonts 等外部资源前缀
const EXTERNAL_PREFIXES = [
  'https://fonts.googleapis.com',
  'https://fonts.gstatic.com',
];

// ============================================================
// 安装阶段：预缓存静态资源
// ============================================================
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching static assets');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => {
      // 立即激活，不等待旧 SW 关闭
      return self.skipWaiting();
    })
  );
});

// ============================================================
// 激活阶段：清理旧版本缓存
// ============================================================
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== STATIC_CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      // 立即接管所有页面
      return self.clients.claim();
    })
  );
});

// ============================================================
// 请求拦截：根据资源类型选择缓存策略
// ============================================================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 只处理 GET 请求
  if (request.method !== 'GET') return;

  // API 请求：网络优先，失败时不缓存（保证数据实时性）
  if (url.pathname.startsWith(API_PREFIX)) {
    event.respondWith(networkFirst(request));
    return;
  }

  // 外部字体资源：缓存优先（字体不常变化）
  if (EXTERNAL_PREFIXES.some((prefix) => request.url.startsWith(prefix))) {
    event.respondWith(cacheFirst(request, CACHE_NAME));
    return;
  }

  // 同域静态资源（JS/CSS/图片等）：Stale-While-Revalidate
  if (url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }
});

// ============================================================
// 缓存策略实现
// ============================================================

/**
 * 网络优先策略：先请求网络，失败时回退到缓存
 * 适用于：API 接口
 */
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    const cachedResponse = await caches.match(request);
    if (cachedResponse) return cachedResponse;
    // 返回离线提示页面
    return new Response(
      JSON.stringify({ error: '网络连接失败，请检查网络后重试' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * 缓存优先策略：先查缓存，缓存不存在时请求网络并缓存
 * 适用于：外部字体、不常变化的资源
 */
async function cacheFirst(request, cacheName) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) return cachedResponse;

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('[SW] Cache and network both failed:', request.url);
    return new Response('', { status: 408 });
  }
}

/**
 * Stale-While-Revalidate 策略：立即返回缓存，同时后台更新缓存
 * 适用于：同域 JS/CSS/图片等静态资源
 */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);

  // 后台更新缓存（不阻塞响应）
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(() => null);

  // 有缓存立即返回，没有缓存等待网络
  return cachedResponse || fetchPromise;
}

// ============================================================
// 推送通知处理（预留，后续可扩展）
// ============================================================
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body || '你有新的消息',
    icon: '/logo.png',
    badge: '/logo.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
    },
    actions: [
      { action: 'open', title: '立即查看' },
      { action: 'close', title: '稍后再说' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || '成就丛林', options)
  );
});

// 点击推送通知
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') return;

  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // 如果已有窗口打开，聚焦并跳转
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      // 否则打开新窗口
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
