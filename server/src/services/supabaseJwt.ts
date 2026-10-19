// ============================================================
// Supabase access token 本地验签
//
// 背景：authMiddleware 原先对每个请求调用 supabase.auth.getUser(token)，
// 这会在每次 API 调用上额外增加一次跨境网络往返（Vercel 函数 → Supabase Auth）。
//
// Supabase 已为项目启用非对称签名密钥（ES256，公钥通过 JWKS 暴露）。
// 因此这里直接用 node:crypto 在进程内验签：
//   - 每个请求只需 ~0.2ms 的 ECDSA 校验，而不是 100~300ms 的网络往返
//   - 公钥集合（JWKS）在进程内缓存 10 分钟，单个 Lambda 实例只拉取一次
//
// 只接受 ES256。历史 HS256 令牌、JWKS 拉取失败、任何校验异常都返回 null，
// 由调用方回退到 supabase.auth.getUser()，保证兼容性且不会放宽校验。
// ============================================================

import { createPublicKey, verify as verifySignature } from 'node:crypto';

export interface SupabaseJwtClaims {
  sub?: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
  aud?: string | string[];
  iss?: string;
  exp?: number;
  nbf?: number;
}

interface Jwk {
  kid?: string;
  kty?: string;
  alg?: string;
  crv?: string;
  use?: string;
  x?: string;
  y?: string;
}

interface VerifyOptions {
  issuer?: string;
  audience?: string;
}

const CLOCK_SKEW_SECONDS = 5;
const JWKS_TTL_MS = 10 * 60 * 1000;
// JWKS 拉取失败后的退避时间，避免故障期间每个请求都去拉一次
const JWKS_RETRY_MS = 30 * 1000;

let keyCache: { keys: Map<string, Jwk>; fetchedAt: number } | null = null;
let inflightFetch: Promise<Map<string, Jwk>> | null = null;
let lastFailureAt = 0;

const decodeSegment = <T>(segment: string): T | null => {
  try {
    return JSON.parse(Buffer.from(segment, 'base64url').toString('utf8')) as T;
  } catch {
    return null;
  }
};

const fetchJwks = async (jwksUrl: string): Promise<Map<string, Jwk>> => {
  const response = await fetch(jwksUrl, { headers: { accept: 'application/json' } });
  if (!response.ok) {
    throw new Error(`JWKS 请求失败: ${response.status}`);
  }

  const body = (await response.json()) as { keys?: Jwk[] };
  const keys = new Map<string, Jwk>();

  for (const key of body.keys ?? []) {
    // 只收验签用的 EC 公钥；其它类型（含 HS256 对称密钥）一律忽略
    if (key.use && key.use !== 'sig') continue;
    if (key.kty !== 'EC') continue;
    if (key.alg && key.alg !== 'ES256') continue;
    if (!key.kid || !key.x || !key.y) continue;
    keys.set(key.kid, key);
  }

  if (keys.size === 0) {
    throw new Error('JWKS 中没有可用的 ES256 公钥');
  }

  return keys;
};

const getSigningKeys = async (jwksUrl: string): Promise<Map<string, Jwk> | null> => {
  const now = Date.now();

  if (keyCache && now - keyCache.fetchedAt < JWKS_TTL_MS) {
    return keyCache.keys;
  }

  // 失败退避：短时间内不重复拉取
  if (!keyCache && now - lastFailureAt < JWKS_RETRY_MS) {
    return null;
  }

  if (!inflightFetch) {
    inflightFetch = fetchJwks(jwksUrl)
      .then((keys) => {
        keyCache = { keys, fetchedAt: Date.now() };
        lastFailureAt = 0;
        return keys;
      })
      .catch((error) => {
        lastFailureAt = Date.now();
        // 已有旧公钥时继续沿用，避免 JWKS 临时故障导致全站 401
        if (keyCache) return keyCache.keys;
        console.warn('[auth] JWKS 拉取失败，回退到远程校验:', error);
        throw error;
      })
      .finally(() => {
        inflightFetch = null;
      });
  }

  try {
    return await inflightFetch;
  } catch {
    return null;
  }
};

/**
 * 用给定公钥集合验签并校验声明（纯函数，便于测试）
 */
export const verifyTokenWithKeys = (
  token: string,
  keys: Map<string, Jwk>,
  options: VerifyOptions = {},
): SupabaseJwtClaims | null => {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [headerSegment, payloadSegment, signatureSegment] = parts;

  const header = decodeSegment<{ alg?: string; kid?: string; typ?: string }>(headerSegment);
  if (!header) return null;
  // 显式拒绝非 ES256（含 HS256），防止算法混淆
  if (header.alg !== 'ES256') return null;

  const key = header.kid ? keys.get(header.kid) : keys.values().next().value;
  if (!key) return null;

  const signature = Buffer.from(signatureSegment, 'base64url');

  let valid = false;
  try {
    const publicKey = createPublicKey({
      key: { kty: key.kty, crv: key.crv, x: key.x, y: key.y },
      format: 'jwk',
    });
    valid = verifySignature(
      'sha256',
      Buffer.from(`${headerSegment}.${payloadSegment}`),
      { key: publicKey, dsaEncoding: 'ieee-p1363' },
      signature,
    );
  } catch {
    return null;
  }

  if (!valid) return null;

  const claims = decodeSegment<SupabaseJwtClaims>(payloadSegment);
  if (!claims) return null;

  const now = Math.floor(Date.now() / 1000);

  if (typeof claims.exp === 'number' && now - CLOCK_SKEW_SECONDS >= claims.exp) {
    return null;
  }
  if (typeof claims.nbf === 'number' && now + CLOCK_SKEW_SECONDS < claims.nbf) {
    return null;
  }
  if (options.issuer && claims.iss !== options.issuer) {
    return null;
  }
  if (options.audience) {
    const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    if (!audiences.includes(options.audience)) return null;
  }
  if (!claims.sub) return null;

  return claims;
};

/**
 * 校验 Supabase access token（读取 SUPABASE_URL 构造 JWKS 地址）
 * 返回 null 表示本地无法确认，调用方应回退到 supabase.auth.getUser()
 */
export const verifySupabaseJwt = async (token: string): Promise<SupabaseJwtClaims | null> => {
  const supabaseUrl = process.env.SUPABASE_URL;
  if (!supabaseUrl) return null;

  const jwksUrl = `${supabaseUrl.replace(/\/+$/, '')}/auth/v1/.well-known/jwks.json`;
  const keys = await getSigningKeys(jwksUrl);
  if (!keys) return null;

  return verifyTokenWithKeys(token, keys, {
    issuer: `${supabaseUrl.replace(/\/+$/, '')}/auth/v1`,
    audience: 'authenticated',
  });
};

/**
 * 冷启动预热：模块加载时就去拉一次 JWKS（不阻塞请求）。
 * 这样实例处理第一个请求时公钥通常已就绪，把一次网络往返挪出请求路径。
 */
if (process.env.SUPABASE_URL) {
  getSigningKeys(
    `${process.env.SUPABASE_URL.replace(/\/+$/, '')}/auth/v1/.well-known/jwks.json`,
  ).catch(() => {
    // 预热失败不影响请求路径，真正的失败退避在 verifySupabaseJwt 里处理
  });
}

/** 仅供测试使用：重置模块内缓存 */
export const __resetJwksCacheForTests = (): void => {
  keyCache = null;
  inflightFetch = null;
  lastFailureAt = 0;
};
