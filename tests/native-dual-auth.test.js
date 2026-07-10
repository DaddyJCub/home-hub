// End-to-end dual-auth: a broker (Authentik) Bearer token with a homehub
// capability is accepted on the existing session-protected API, auto-provisions
// a HomeHub user, and is denied when the token lacks a homehub capability.
import assert from 'node:assert';
import test, { beforeEach, afterEach } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'crypto';
import request from 'supertest';

process.env.NODE_ENV = 'test';
process.env.IDENTITY_TOKEN_SIGNING_SECRET = 'test-shared-secret-do-not-use-in-prod';
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'homehub-native-'));

const { app, resetStateForTests } = await import('../server.js');

const b64url = (buf) =>
  Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

function brokerToken(caps, { email = 'jacob@example.com', username = 'jacob' } = {}) {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64url(
    JSON.stringify({
      iss: 'jcubhub-apps-identity',
      sub: 'authentik-uid-1',
      username,
      email,
      caps,
      exp: Math.floor(Date.now() / 1000) + 300,
    })
  );
  const sig = b64url(
    crypto.createHmac('sha256', process.env.IDENTITY_TOKEN_SIGNING_SECRET).update(`${header}.${body}`).digest()
  );
  return `${header}.${body}.${sig}`;
}

beforeEach(() => resetStateForTests());
afterEach(() => resetStateForTests());

test('broker token with homehub.read authenticates and auto-provisions a user', async () => {
  const token = brokerToken(['homehub.read', 'homehub.write']);
  const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
  assert.equal(me.status, 200);
  assert.equal(me.body.user.email, 'jacob@example.com');
});

test('broker-authed request can read and write household data (same API as web)', async () => {
  const token = brokerToken(['homehub.read', 'homehub.write']);
  const put = await request(app)
    .put('/api/data/household/chores')
    .set('Authorization', `Bearer ${token}`)
    .send({ value: [{ id: 'c1', title: 'Dishes' }] });
  assert.equal(put.status, 200);

  const get = await request(app)
    .get('/api/data/household/chores')
    .set('Authorization', `Bearer ${token}`);
  assert.equal(get.status, 200);
  // The household 'chores' validator enriches items with defaults; assert the
  // round-trip preserved the fields we set rather than an exact shape.
  assert.equal(get.body.value.length, 1);
  assert.equal(get.body.value[0].id, 'c1');
  assert.equal(get.body.value[0].title, 'Dishes');
});

test('token scoped to another app (no homehub cap) is denied', async () => {
  const token = brokerToken(['books.read']);
  const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
  assert.equal(me.status, 401);
});

test('no credentials is denied', async () => {
  const me = await request(app).get('/api/auth/me');
  assert.equal(me.status, 401);
});
