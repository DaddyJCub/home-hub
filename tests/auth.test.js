import assert from 'node:assert'
import test, { afterEach, beforeEach } from 'node:test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import request from 'supertest'

process.env.NODE_ENV = 'test'
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'homehub-data-'))
process.env.DATA_DIR = dataDir

const serverModule = await import('../server.js')
const { app, resetStateForTests, devResetEnabled } = serverModule

let agent

beforeEach(() => {
  resetStateForTests()
  agent = request.agent(app)
})

afterEach(() => {
  resetStateForTests()
})

test('signup, session persistence, and logout', async () => {
  const email = `user${Date.now()}@example.com`

  const signup = await agent
    .post('/api/auth/signup')
    .send({ email, password: 'password123', displayName: 'Test User' })

  assert.equal(signup.status, 200)
  assert(signup.body?.user)

  const me = await agent.get('/api/auth/me')
  assert.equal(me.status, 200)
  assert.equal(me.body.user.email, email.toLowerCase())

  const meAgain = await agent.get('/api/auth/me')
  assert.equal(meAgain.status, 200)

  const logout = await agent.post('/api/auth/logout')
  assert.equal(logout.status, 200)

  const meAfterLogout = await agent.get('/api/auth/me')
  assert.equal(meAfterLogout.status, 401)
})

test('data written by one client is visible to another after login', async () => {
  const email = `shared${Date.now()}@example.com`
  const password = 'password123'

  const signup = await agent
    .post('/api/auth/signup')
    .send({ email, password, displayName: 'Household Owner' })
  assert.equal(signup.status, 200)
  const householdId = signup.body.currentHouseholdId
  assert.ok(householdId)

  const chore = { id: 'chore-1', householdId, title: 'Test chore' }
  const put = await agent
    .put('/api/data/household/chores')
    .send({ value: [chore], householdId })
  assert.equal(put.status, 200)

  const secondAgent = request.agent(app)
  const login = await secondAgent.post('/api/auth/login').send({ email, password })
  assert.equal(login.status, 200)

  const fetched = await secondAgent.get(`/api/data/household/chores`).query({ householdId })
  assert.equal(fetched.status, 200)
  assert(Array.isArray(fetched.body.value))
  assert.equal(fetched.body.value[0].id, chore.id)
})

test('dev reset stays disabled by default', () => {
  assert.equal(devResetEnabled, false)
})

test('rejects invalid signup payloads', async () => {
  const res = await agent.post('/api/auth/signup').send({ email: 'not-an-email', password: '', displayName: '' })
  assert.equal(res.status, 400)
  assert.equal(res.body.code, 'VALIDATION_ERROR')
})

test('rejects invalid household data payloads', async () => {
  const email = `invalid-data-${Date.now()}@example.com`
  await agent.post('/api/auth/signup').send({ email, password: 'password123', displayName: 'Data Owner' })

  const bad = await agent.put('/api/data/household/chores').send({
    value: [{ id: '', title: '', completed: false }]
  })
  assert.equal(bad.status, 400)
  assert.equal(bad.body.code, 'VALIDATION_ERROR')
})

test('sets householdId server-side for household data', async () => {
  const email = `server-scope-${Date.now()}@example.com`
  const signup = await agent
    .post('/api/auth/signup')
    .send({ email, password: 'password123', displayName: 'Scope Tester' })
  assert.equal(signup.status, 200)
  const householdId = signup.body.currentHouseholdId
  assert.ok(householdId)

  const put = await agent.put('/api/data/household/chores').send({
    value: [{ id: 'chore-1', title: 'Dishes' }]
  })

  assert.equal(put.status, 200)
  assert(Array.isArray(put.body.value))
  assert.equal(put.body.value[0].householdId, householdId)
})
