// Unit tests for the broker access-token verifier (server/native-auth.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';

process.env.IDENTITY_TOKEN_SIGNING_SECRET = 'test-shared-secret-do-not-use-in-prod';

const { verifyBrokerToken, BrokerTokenError, ISSUER } = await import('../server/native-auth.js');

const b64url = (buf) =>
  Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

function sign(payload, { alg = 'HS256', key = process.env.IDENTITY_TOKEN_SIGNING_SECRET } = {}) {
  const header = b64url(JSON.stringify({ alg, typ: 'JWT' }));
  const body = b64url(JSON.stringify(payload));
  const sig = b64url(crypto.createHmac('sha256', key).update(`${header}.${body}`).digest());
  return `${header}.${body}.${sig}`;
}

const now = Math.floor(Date.now() / 1000);
const goodPayload = {
  iss: ISSUER,
  sub: 'authentik-uid-123',
  username: 'jacob',
  email: 'jacob@example.com',
  caps: ['homehub.read', 'homehub.write'],
  exp: now + 300,
};

test('accepts a valid token and returns the payload', () => {
  const p = verifyBrokerToken(sign(goodPayload));
  assert.equal(p.email, 'jacob@example.com');
  assert.deepEqual(p.caps, ['homehub.read', 'homehub.write']);
});

test('rejects a tampered payload (signature mismatch)', () => {
  const token = sign(goodPayload);
  const [h, , s] = token.split('.');
  const forged = b64url(JSON.stringify({ ...goodPayload, email: 'attacker@evil.com' }));
  assert.throws(() => verifyBrokerToken(`${h}.${forged}.${s}`), (e) => e instanceof BrokerTokenError && e.code === 'bad_signature');
});

test('rejects alg:none', () => {
  const header = b64url(JSON.stringify({ alg: 'none', typ: 'JWT' }));
  const body = b64url(JSON.stringify(goodPayload));
  assert.throws(() => verifyBrokerToken(`${header}.${body}.`), (e) => e.code === 'bad_alg');
});

test('rejects a token signed with the wrong key', () => {
  assert.throws(() => verifyBrokerToken(sign(goodPayload, { key: 'wrong-key' })), (e) => e.code === 'bad_signature');
});

test('rejects a wrong issuer', () => {
  assert.throws(() => verifyBrokerToken(sign({ ...goodPayload, iss: 'somebody-else' })), (e) => e.code === 'bad_issuer');
});

test('rejects an expired token', () => {
  assert.throws(() => verifyBrokerToken(sign({ ...goodPayload, exp: now - 3600 })), (e) => e.code === 'expired');
});

test('rejects a malformed token', () => {
  assert.throws(() => verifyBrokerToken('not-a-jwt'), (e) => e.code === 'malformed');
});
