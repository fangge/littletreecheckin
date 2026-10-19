import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { verifyTokenWithKeys } from '../src/services/supabaseJwt.js';

const ISSUER = 'https://example.supabase.co/auth/v1';
const KID = 'test-key-1';

const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });

const publicJwk = publicKey.export({ format: 'jwk' }) as Record<string, string>;

const keys = new Map([
  [KID, { ...publicJwk, alg: 'ES256', kid: KID, use: 'sig' }],
]);

const base64url = (input: string | Buffer): string =>
  Buffer.from(input).toString('base64url');

interface ClaimOverrides {
  [key: string]: unknown;
}

const makeToken = (
  claims: ClaimOverrides = {},
  headerOverrides: Record<string, unknown> = {},
): string => {
  const now = Math.floor(Date.now() / 1000);

  const header = { alg: 'ES256', kid: KID, typ: 'JWT', ...headerOverrides };
  const payload = {
    sub: 'user-123',
    email: 'parent@example.com',
    user_metadata: { username: 'mama' },
    aud: 'authenticated',
    iss: ISSUER,
    iat: now,
    exp: now + 3600,
    ...claims,
  };

  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const signature = sign('sha256', Buffer.from(signingInput), {
    key: privateKey,
    dsaEncoding: 'ieee-p1363',
  });

  return `${signingInput}.${base64url(signature)}`;
};

const verify = (token: string) =>
  verifyTokenWithKeys(token, keys, { issuer: ISSUER, audience: 'authenticated' });

test('合法 ES256 令牌验签通过并返回声明', () => {
  const claims = verify(makeToken());

  assert.ok(claims);
  assert.equal(claims?.sub, 'user-123');
  assert.equal(claims?.email, 'parent@example.com');
  assert.equal(claims?.user_metadata?.username, 'mama');
});

test('篡改 payload 后验签失败', () => {
  const [header, , signature] = makeToken().split('.');
  const forgedPayload = base64url(
    JSON.stringify({
      sub: 'attacker',
      aud: 'authenticated',
      iss: ISSUER,
      exp: Math.floor(Date.now() / 1000) + 3600,
    }),
  );

  assert.equal(verify(`${header}.${forgedPayload}.${signature}`), null);
});

test('过期令牌被拒绝', () => {
  const now = Math.floor(Date.now() / 1000);
  assert.equal(verify(makeToken({ exp: now - 60 })), null);
});

test('未生效令牌（nbf 在未来）被拒绝', () => {
  const now = Math.floor(Date.now() / 1000);
  assert.equal(verify(makeToken({ nbf: now + 600 })), null);
});

test('issuer 不匹配被拒绝', () => {
  assert.equal(verify(makeToken({ iss: 'https://evil.example.com/auth/v1' })), null);
});

test('audience 不匹配被拒绝', () => {
  assert.equal(verify(makeToken({ aud: 'anon' })), null);
});

test('拒绝 HS256 算法（防算法混淆）', () => {
  // 用对称密钥伪装成 HS256：即使内容自洽也不能通过
  const header = base64url(JSON.stringify({ alg: 'HS256', kid: KID, typ: 'JWT' }));
  const payload = base64url(
    JSON.stringify({
      sub: 'attacker',
      aud: 'authenticated',
      iss: ISSUER,
      exp: Math.floor(Date.now() / 1000) + 3600,
    }),
  );

  assert.equal(verify(`${header}.${payload}.${base64url('signature')}`), null);
});

test('未知 kid 被拒绝', () => {
  assert.equal(verify(makeToken({}, { kid: 'unknown-kid' })), null);
});

test('格式非法的令牌返回 null', () => {
  assert.equal(verify('not-a-token'), null);
  assert.equal(verify('a.b'), null);
});

test('缺少 sub 声明被拒绝', () => {
  assert.equal(verify(makeToken({ sub: undefined })), null);
});

