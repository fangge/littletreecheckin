// ============================================================
// Service Worker - 成就丛林 PWA 缓存策略
// ============================================================

const CACHE_NAME = 'happygrow-v1';
const STATIC_CACHE_NAME = 'happygrow-static-v1';

// 缓存容量上限（MB），超过时清理最旧缓存
const MAX_CACHE_SIZE_MB = 50;

// 需要预缓存的静态资源
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  '/logo2.png',
  '/logo2-16.png',
  '/logo2-32.png',
  '/logo2-180.png',
  '/logo2-192.png',
  '/logo2-512.png',
  '/logo.png',
];

// API 请求前缀 - 这些请求走网络优先策略
const API_PREFIX = '/api/';

// 外部字体资源前缀（国内 CDN 加速）
const EXTERNAL_PREFIXES = [
  'https://fonts.loli.net',
  'https://gstatic.loli.net',
];

// 离线回退页面
const OFFLINE_FALLBACK_URL = null; // 设为 '/offline.html' 可启用自定义离线页

// ============================================================
// 消息处理：允许客户端触发跳过等待
// ============================================================
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ============================================================
// 安装阶段：预缓存静态资源
// ============================================================
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching static assets');
      // 逐个缓存，某个资源失败不影响其他
      return Promise.allSettled(
        STATIC_ASSETS.map((url) =>
          cache.add(url).catch((err) => console.warn(`[SW] 预缓存失败: ${url}`, err))
        )
      );
    }).then(() => {
      // 立即激活，不等待旧 SW 关闭
      return self.skipWaiting();
    })
  );
});

// ============================================================
// 激活阶段：清理旧版本缓存 + 容量控制
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
      return clients.claim();
    }).then(() => {
      // 激活后执行一次缓存容量清理
      enforceCacheQuota();
    })
  );
});

// ============================================================
// 请求拦截：根据资源类型选择缓存策略
// ============================================================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 只处理 GET 请求和同源导航请求
  if (request.method !== 'GET') return;
  // 忽略 chrome-extension / non-http(s) 请求
  if (!url.protocol.startsWith('http')) return;

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
 * 网络优先策略：先请求网络，失败时回退到缓存或离线页面
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
    // 返回离线提示
    return createOfflineResponse(request);
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
      const cache = await openCacheWithEviction(cacheName);
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
  const cacheName = CACHE_NAME;
  const cache = await openCacheWithEviction(cacheName);
  const cachedResponse = await cache.match(request);

  // 后台更新缓存（不阻塞响应）
  const fetchPromise = fetch(request).then(async (networkResponse) => {
    if (networkResponse.ok) {
      await enforceCacheQuota();
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(() => null);

  // 导航请求（HTML）：网络失败时尝试缓存，再失败返回离线页面
  if (request.mode === 'navigate') {
    try {
      return (await fetchPromise) || cachedResponse || (await caches.match('/')) || createOfflineResponse();
    } catch {
      return cachedResponse || createOfflineResponse();
    }
  }

  // 有缓存立即返回，没有缓存等待网络
  return cachedResponse || fetchPromise;
}

// ============================================================
// 辅助工具
// ============================================================

/**
 * 创建离线响应
 */
function createOfflineResponse(request) {
  // 如果配置了自定义离线页面，尝试返回它
  if (OFFLINE_FALLBACK_URL) {
    const offlinePage = caches.match(OFFLINE_FALLBACK_URL);
    if (offlinePage) return offlinePage;
  }

  // 根据 request 类型返回合适的离线响应
  const url = request ? new URL(request.url) : null;
  const isNavigation = url && url.origin === self.location.origin &&
    (request?.mode === 'navigate' || url.pathname === '/' ||
     url.pathname.endsWith('.html'));

  if (isNavigation) {
    // HTML 导航请求 → 返回友好的离线提示页面
    return new Response(
      `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>成就丛林 - 离线模式</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Noto Sans SC',sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f0fdf4;color:#166534;text-align:center;padding:20px}
    .container{max-width:400px}
    .icon{font-size:64px;margin-bottom:16px}🌳
    h1{font-size:24px;font-weight:700;margin-bottom:8px}
    p{font-size:15px;line-height:1.6;color:#15803d;margin-bottom:24px}
    button{background:#16a34a;color:#fff;border:none;padding:12px 28px;border-radius:12px;font-size:15px;font-weight:600;cursor:pointer}
    button:hover{background:#15803d}
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">🌳</div>
    <h1>网络连接不可用</h1>
    <p>成就丛林当前处于离线状态。请检查网络连接后点击下方按钮重试。</p>
    <button onclick="location.reload()">重新连接</button>
  </div>
</body>
</html>`,
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      }
    );
  }

  // 非 HTML 请求 → 返回 JSON 错误
  return new Response(
    JSON.stringify({ error: '网络连接失败，请检查网络后重试' }),
    { status: 503, headers: { 'Content-Type': 'application/json' } }
  );
}

/**
 * 打开缓存并在超限时执行淘汰（LRU 近似：删除最旧的条目）
 */
async function openCacheWithEviction(cacheName) {
  await enforceCacheQuota();
  return caches.open(cacheName);
}

/**
 * 强制执行缓存容量限制
 */
async function enforceCacheQuota() {
  try {
    const maxSizeBytes = MAX_CACHE_SIZE_MB * 1024 * 1024;
    let totalSize = 0;
    const entries = [];

    for (const cacheName of [CACHE_NAME, STATIC_CACHE_NAME]) {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      for (const request of keys) {
        const response = await cache.match(request);
        if (response) {
          const size = (response.headers.get('content-length')
            ? parseInt(response.headers.get('content-length'), 10)
            : 0) || 0;
          totalSize += size;
          entries.push({ cache, request, size, time: response.headers.get('date') || '' });
        }
      }
    }

    if (totalSize > maxSizeBytes) {
      console.warn(`[SW] 缓存总大小 ${(totalSize / 1024 / 1024).toFixed(1)}MB 超过上限 ${MAX_CACHE_SIZE_MB}MB，开始清理...`);
      // 按 date 排序，删除最旧的
      entries.sort((a, b) => (a.time > b.time ? 1 : -1));
      let freed = 0;
      for (const entry of entries) {
        if (totalSize - freed <= maxSizeBytes * 0.8) break; // 清理到 80% 为止
        await entry.cache.delete(entry.request);
        freed += entry.size;
      }
      console.log(`[SW] 已清理 ${(freed / 1024 / 1024).toFixed(1)}MB 缓存`);
    }
  } catch (err) {
    console.warn('[SW] 缓存容量检查出错:', err);
  }
}
