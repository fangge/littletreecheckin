// ============================================================
// 轻量级前端缓存层
// 功能：TTL 缓存 + 请求去重（同一时刻相同 URL 只发一次请求）
// 用途：避免页面切换、下拉刷新等场景下的重复网络请求
// ============================================================

interface CacheEntry<T> {
  data: T;
  ts: number;
}

// 默认缓存有效期：30秒
const DEFAULT_TTL = 30_000;

// 内存缓存存储
const cacheStore = new Map<string, CacheEntry<unknown>>();

// 正在进行的请求（用于去重：同一 URL 并发时只发一次）
const pendingRequests = new Map<string, Promise<unknown>>();

/**
 * 带缓存的请求包装器
 * @param url 请求 URL（作为缓存 key）
 * @param fetchFn 实际的 fetch 函数
 * @param ttl 缓存有效期（毫秒），默认 30 秒
 * @param forceRefresh 强制刷新，跳过缓存
 */
export async function cachedRequest<T>(
  url: string,
  fetchFn: () => Promise<T>,
  ttl: number = DEFAULT_TTL,
  forceRefresh = false,
): Promise<T> {
  // 强制刷新时清除缓存
  if (forceRefresh) {
    cacheStore.delete(url);
  }

  // 检查缓存是否有效
  const cached = cacheStore.get(url);
  if (cached && !forceRefresh && Date.now() - cached.ts < ttl) {
    return cached.data as T;
  }

  // 请求去重：如果有相同 URL 的请求正在进行中，复用该 Promise
  if (pendingRequests.has(url)) {
    return pendingRequests.get(url)() as Promise<T>;
  }

  // 发起新请求
  const promise = fetchFn().finally(() => {
    pendingRequests.delete(url);
  });

  pendingRequests.set(url, promise);

  try {
    const data = await promise;
    // 写入缓存
    cacheStore.set(url, { data, ts: Date.now() });
    return data;
  } catch (error) {
    throw error;
  }
}

/**
 * 清除指定 URL 的缓存
 */
export function invalidateCache(urlPattern?: string): void {
  if (!urlPattern) {
    cacheStore.clear();
    return;
  }
  for (const key of cacheStore.keys()) {
    if (key.includes(urlPattern)) {
      cacheStore.delete(key);
    }
  }
}

/**
 * 清除所有与指定 childId 相关的缓存
 */
export function invalidateChildCache(childId: string): void {
  for (const key of cacheStore.keys()) {
    if (key.includes(childId)) {
      cacheStore.delete(key);
    }
  }
}
