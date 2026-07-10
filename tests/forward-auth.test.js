// Authentik forward-auth for the standalone web app: identity headers are only
// trusted when the shared proxy secret matches (anti-spoofing).
import assert from 'node:assert';
import test, { beforeEach, afterEach } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';

process.env.NODE_ENV = 'test';
process.env.FORWARD_AUTH_PROXY_SECRET = 'proxy-secret-xyz';
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'homehub-fwd-'));

const { app, resetStateForTests } = await import('../server.js');

beforeEach(() => resetStateForTests());
afterEach(() => resetStateForTests());

test('trusts Authentik headers when the proxy secret matches (auto-provisions)', async () => {
  const res = await request(app)
    .get('/api/auth/me')
    .set('X-JCubHub-Proxy-Secret', 'proxy-secret-xyz')
    .set('X-authentik-email', 'sso-user@example.com')
    .set('X-authentik-username', 'ssouser');
  assert.equal(res.status, 200);
  assert.equal(res.body.user.email, 'sso-user@example.com');
});

test('rejects Authentik headers without the proxy secret (spoofing attempt)', async () => {
  const res = await request(app)
    .get('/api/auth/me')
    .set('X-authentik-email', 'attacker@example.com');
  assert.equal(res.status, 401);
});

test('rejects a wrong proxy secret', async () => {
  const res = await request(app)
    .get('/api/auth/me')
    .set('X-JCubHub-Proxy-Secret', 'wrong')
    .set('X-authentik-email', 'attacker@example.com');
  assert.equal(res.status, 401);
});
