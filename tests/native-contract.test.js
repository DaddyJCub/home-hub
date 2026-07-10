// The /api/native/homehub contract surface (homehub/0.1.0): capability-gated
// reads/writes, dashboard aggregate, allowlist enforcement, contract header,
// and write-capability enforcement on the shared /api/data path.
import assert from 'node:assert';
import test, { beforeEach, afterEach } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'crypto';
import request from 'supertest';

process.env.NODE_ENV = 'test';
process.env.IDENTITY_TOKEN_SIGNING_SECRET = 'test-shared-secret-do-not-use-in-prod';
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'homehub-contract-'));

const { app, resetStateForTests } = await import('../server.js');

const b64url = (buf) =>
  Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
function brokerToken(caps) {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64url(JSON.stringify({
    iss: 'jcubhub-apps-identity', sub: 'uid-1', username: 'jacob',
    email: 'jacob@example.com', caps, exp: Math.floor(Date.now() / 1000) + 300,
  }));
  const sig = b64url(crypto.createHmac('sha256', process.env.IDENTITY_TOKEN_SIGNING_SECRET).update(`${header}.${body}`).digest());
  return `${header}.${body}.${sig}`;
}
const RW = () => brokerToken(['homehub.read', 'homehub.write']);
const RO = () => brokerToken(['homehub.read']);

beforeEach(() => resetStateForTests());
afterEach(() => resetStateForTests());

test('dashboard returns the household + personal snapshot with the contract header', async () => {
  const res = await request(app).get('/api/native/homehub/dashboard').set('Authorization', `Bearer ${RW()}`);
  assert.equal(res.status, 200);
  assert.equal(res.headers['x-jcubhub-contract'], 'homehub/0.1.0');
  assert.ok('chores' in res.body.household);
  assert.ok('shopping-items' in res.body.household);
  assert.ok('personal-tasks' in res.body.personal);
});

test('typed read/write round-trips through the shared validators', async () => {
  const put = await request(app)
    .put('/api/native/homehub/household/chores')
    .set('Authorization', `Bearer ${RW()}`)
    .send({ value: [{ id: 'c1', title: 'Vacuum' }] });
  assert.equal(put.status, 200);
  const get = await request(app).get('/api/native/homehub/household/chores').set('Authorization', `Bearer ${RW()}`);
  assert.equal(get.status, 200);
  assert.equal(get.body.value[0].title, 'Vacuum');
});

test('read-only token cannot write via the native surface', async () => {
  const res = await request(app)
    .put('/api/native/homehub/household/chores')
    .set('Authorization', `Bearer ${RO()}`)
    .send({ value: [] });
  assert.equal(res.status, 403);
});

test('read-only token cannot write via the shared /api/data path either', async () => {
  const res = await request(app)
    .put('/api/data/household/chores')
    .set('Authorization', `Bearer ${RO()}`)
    .send({ value: [] });
  assert.equal(res.status, 403);
});

test('unknown/internal keys are not reachable through the contract', async () => {
  const res = await request(app).get('/api/native/homehub/household/sessions').set('Authorization', `Bearer ${RW()}`);
  assert.equal(res.status, 404);
});

test('no token is rejected', async () => {
  const res = await request(app).get('/api/native/homehub/dashboard');
  assert.equal(res.status, 401);
});
