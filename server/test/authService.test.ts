import assert from 'node:assert/strict';
import test from 'node:test';

process.env.JWT_SECRET = 'test-only-jwt-secret';
process.env.TZ = 'Asia/Shanghai';

const {
  consumeResetToken,
  createOpaqueToken,
  hashPassword,
  hashToken,
  signAccessToken,
  verifyAccessToken,
  verifyPassword,
} = await import('../src/services/authService.js');

test('hashes and verifies passwords without storing the plaintext', async () => {
  const passwordHash = await hashPassword('correct horse battery staple');

  assert.notEqual(passwordHash, 'correct horse battery staple');
  assert.equal(await verifyPassword('correct horse battery staple', passwordHash), true);
  assert.equal(await verifyPassword('wrong password', passwordHash), false);
});

test('signs access tokens with the local user claims and rejects expired tokens', () => {
  const token = signAccessToken({ id: 'user-1', username: 'Jo' });
  const payload = verifyAccessToken(token);

  assert.equal(payload.sub, 'user-1');
  assert.equal(payload.username, 'Jo');
  assert.equal(payload.role, 'parent');

  const shortLivedToken = signAccessToken({ id: 'user-1', username: 'Jo' }, { expiresIn: '1s' });
  assert.throws(
    () => verifyAccessToken(shortLivedToken, { clockTimestamp: Math.floor(Date.now() / 1000) + 10 }),
    /expired/i,
  );
});

test('opaque refresh tokens are random and only their hashes are persisted', () => {
  const first = createOpaqueToken();
  const second = createOpaqueToken();

  assert.notEqual(first.token, second.token);
  assert.notEqual(first.token, first.tokenHash);
  assert.equal(hashToken(first.token), first.tokenHash);
  assert.equal(first.tokenHash.length, 64);
});

test('a password reset token can be consumed only once and before expiry', async () => {
  const { token, tokenHash } = createOpaqueToken();
  let consumeCount = 0;
  const record = { token_hash: tokenHash, expires_at: new Date(Date.now() + 60_000), used_at: null };
  const markUsed = async () => {
    consumeCount += 1;
    return true;
  };

  assert.equal(await consumeResetToken(token, record, markUsed), true);
  assert.equal(await consumeResetToken(token, { ...record, used_at: new Date() }, markUsed), false);
  assert.equal(await consumeResetToken(token, { ...record, expires_at: new Date(Date.now() - 1) }, markUsed), false);
  assert.equal(consumeCount, 1);
});

test('treats MySQL DATETIME reset expiry values as UTC', async () => {
  const { token, tokenHash } = createOpaqueToken();
  const mysqlUtcExpiry = new Date(Date.now() + 60_000).toISOString().slice(0, 23).replace('T', ' ');

  assert.equal(await consumeResetToken(token, {
    token_hash: tokenHash,
    expires_at: mysqlUtcExpiry,
    used_at: null,
  }, async () => true), true);
});
