import express from 'express';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lightweight logger used across the server
const log = (level, message, data = null) => {
  const timestamp = new Date().toISOString();
  const logLine = data
    ? `[${timestamp}] ${level}: ${message} ${JSON.stringify(data)}`
    : `[${timestamp}] ${level}: ${message}`;
  console.log(logLine);
};

const app = express();
const PORT = process.env.PORT || 4173;
const HOST = process.env.HOST || '0.0.0.0';
const DATA_DIR = process.env.DATA_DIR || '/data';
const SESSION_COOKIE_NAME = 'hh_session';
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-homehub-session-secret';
const SESSION_MAX_AGE_SECONDS =
  Number(process.env.SESSION_MAX_AGE_SECONDS) ||
  Number(process.env.SESSION_MAX_AGE_DAYS || 14) * 24 * 60 * 60;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  log('INFO', `Created data directory: ${DATA_DIR}`);
}

// Database bootstrap
const dbPath = path.join(DATA_DIR, 'homehub.db');
log('INFO', `Opening database: ${dbPath}`);
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = OFF'); // allow local-only members that aren't real users

const nowSeconds = () => Math.floor(Date.now() / 1000);
const generateId = () => (crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex'));
const normalizeEmail = (email = '') => email.trim().toLowerCase();
const generateInviteCode = () => crypto.randomBytes(4).toString('hex').toUpperCase();

const serializeCookie = (name, value, options = {}) => {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  if (options.maxAge !== undefined) parts.push(`Max-Age=${Math.floor(options.maxAge)}`);
  if (options.domain) parts.push(`Domain=${options.domain}`);
  if (options.path) parts.push(`Path=${options.path}`);
  if (options.expires) parts.push(`Expires=${options.expires.toUTCString()}`);
  if (options.httpOnly) parts.push('HttpOnly');
  if (options.secure) parts.push('Secure');
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
  return parts.join('; ');
};

const parseCookies = (header = '') => {
  return header.split(';').reduce((acc, part) => {
    const [name, ...rest] = part.trim().split('=');
    if (!name) return acc;
    acc[name] = decodeURIComponent(rest.join('='));
    return acc;
  }, {});
};

const signSessionId = (sessionId) =>
  crypto.createHmac('sha256', SESSION_SECRET).update(sessionId).digest('hex');

const verifySessionSignature = (value) => {
  if (!value || typeof value !== 'string') return null;
  const [sessionId, signature] = value.split('.');
  if (!sessionId || !signature) return null;
  const expected = signSessionId(sessionId);
  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (sigBuffer.length !== expectedBuffer.length) return null;
  try {
    if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) return null;
  } catch {
    return null;
  }
  return sessionId;
};

const setSessionCookie = (res, sessionId) => {
  const signed = `${sessionId}.${signSessionId(sessionId)}`;
  res.setHeader(
    'Set-Cookie',
    serializeCookie(SESSION_COOKIE_NAME, signed, {
      httpOnly: true,
      sameSite: 'Lax',
      secure: NODE_ENV === 'production',
      maxAge: SESSION_MAX_AGE_SECONDS,
      path: '/'
    })
  );
};

const clearSessionCookie = (res) => {
  res.setHeader(
    'Set-Cookie',
    serializeCookie(SESSION_COOKIE_NAME, '', {
      maxAge: 0,
      path: '/',
      sameSite: 'Lax',
      secure: NODE_ENV === 'production',
      httpOnly: true
    })
  );
};

const MIGRATIONS = [
  {
    version: 1,
    name: 'baseline-schema',
    up: (database) => {
      database.exec(`
        CREATE TABLE IF NOT EXISTS schema_version (
          version INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          applied_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT NOT NULL,
          password_hash TEXT NOT NULL,
          password_algo TEXT NOT NULL DEFAULT 'bcrypt',
          display_name TEXT NOT NULL,
          created_at INTEGER NOT NULL
        );
        CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_ci ON users(lower(email));

        CREATE TABLE IF NOT EXISTS households (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          owner_id TEXT NOT NULL,
          invite_code TEXT,
          created_at INTEGER NOT NULL
        );
        CREATE UNIQUE INDEX IF NOT EXISTS idx_households_invite ON households(invite_code);

        CREATE TABLE IF NOT EXISTS household_members (
          id TEXT PRIMARY KEY,
          household_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          display_name TEXT NOT NULL,
          role TEXT NOT NULL,
          joined_at INTEGER NOT NULL,
          is_local INTEGER NOT NULL DEFAULT 0,
          UNIQUE(household_id, user_id)
        );

        CREATE TABLE IF NOT EXISTS sessions (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          household_id TEXT,
          created_at INTEGER NOT NULL,
          last_seen INTEGER NOT NULL,
          expires_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS user_preferences (
          user_id TEXT NOT NULL,
          key TEXT NOT NULL,
          value TEXT,
          updated_at INTEGER NOT NULL,
          PRIMARY KEY (user_id, key)
        );

        CREATE TABLE IF NOT EXISTS household_data (
          household_id TEXT NOT NULL,
          key TEXT NOT NULL,
          value TEXT,
          updated_at INTEGER NOT NULL,
          PRIMARY KEY (household_id, key)
        );

        CREATE TABLE IF NOT EXISTS kv_store (
          key TEXT PRIMARY KEY,
          value TEXT,
          updated_at INTEGER DEFAULT (strftime('%s', 'now'))
        );
      `);
    }
  }
];

const getAppliedVersions = () => {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at INTEGER NOT NULL
  );`);
  try {
    return db.prepare('SELECT version FROM schema_version').all().map((r) => r.version);
  } catch {
    return [];
  }
};

const runMigrations = () => {
  const applied = new Set(getAppliedVersions());
  for (const migration of MIGRATIONS) {
    if (applied.has(migration.version)) continue;
    log('INFO', `Applying migration ${migration.version} - ${migration.name}`);
    db.transaction(() => {
      migration.up(db);
      db.prepare('INSERT OR REPLACE INTO schema_version (version, name, applied_at) VALUES (?, ?, ?)').run(
        migration.version,
        migration.name,
        nowSeconds()
      );
    })();
    log('INFO', `Migration ${migration.version} applied`);
  }
};

runMigrations();

const cleanupExpiredSessions = () => {
  const deleted = db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(nowSeconds());
  if (deleted.changes > 0) {
    log('INFO', `Cleaned ${deleted.changes} expired sessions`);
  }
};

cleanupExpiredSessions();

const hashPassword = (password) => crypto.createHash('sha256').update(password).digest('hex');

const bcryptHash = async (password) => {
  const bcrypt = await import('bcryptjs');
  return bcrypt.default.hash(password, 10);
};

const verifyPassword = async (password, storedHash, algo = 'bcrypt') => {
  if (algo === 'bcrypt' || storedHash.startsWith('$2')) {
    const bcrypt = await import('bcryptjs');
    return bcrypt.default.compare(password, storedHash);
  }
  const legacy = hashPassword(password);
  return legacy === storedHash;
};

const migrateLegacyPassword = async (userId, password) => {
  const newHash = await bcryptHash(password);
  db.prepare('UPDATE users SET password_hash = ?, password_algo = ? WHERE id = ?').run(
    newHash,
    'bcrypt',
    userId
  );
  return newHash;
};

const createSession = (userId, householdId) => {
  const sessionId = generateId();
  const now = nowSeconds();
  const expires = now + SESSION_MAX_AGE_SECONDS;
  db.prepare(
    'INSERT INTO sessions (id, user_id, household_id, created_at, last_seen, expires_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(sessionId, userId, householdId, now, now, expires);
  return { sessionId, expiresAt: expires };
};

const readSession = (req, res) => {
  const cookies = parseCookies(req.headers.cookie || '');
  const signed = cookies[SESSION_COOKIE_NAME];
  const sessionId = verifySessionSignature(signed);
  if (!sessionId) return null;

  const row = db
    .prepare('SELECT id, user_id, household_id, expires_at FROM sessions WHERE id = ?')
    .get(sessionId);
  if (!row) return null;

  const now = nowSeconds();
  if (row.expires_at <= now) {
    db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
    return null;
  }

  const newExpires = now + SESSION_MAX_AGE_SECONDS;
  db.prepare('UPDATE sessions SET last_seen = ?, expires_at = ? WHERE id = ?').run(
    now,
    newExpires,
    sessionId
  );
  setSessionCookie(res, sessionId);
  return { sessionId, userId: row.user_id, householdId: row.household_id };
};

const ensureInviteCode = () => {
  let code = generateInviteCode();
  while (db.prepare('SELECT 1 FROM households WHERE invite_code = ?').get(code)) {
    code = generateInviteCode();
  }
  return code;
};

const insertHousehold = (name, ownerId) => {
  const household = {
    id: generateId(),
    name: name.trim(),
    owner_id: ownerId,
    invite_code: ensureInviteCode(),
    created_at: Date.now()
  };
  db.prepare(
    'INSERT INTO households (id, name, owner_id, invite_code, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(household.id, household.name, household.owner_id, household.invite_code, household.created_at);
  return household;
};

const addMembership = (householdId, userId, displayName, role = 'member', isLocal = false) => {
  const membership = {
    id: generateId(),
    household_id: householdId,
    user_id: userId,
    display_name: displayName,
    role,
    joined_at: Date.now(),
    is_local: isLocal ? 1 : 0
  };
  db.prepare(
    'INSERT OR IGNORE INTO household_members (id, household_id, user_id, display_name, role, joined_at, is_local) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(
    membership.id,
    membership.household_id,
    membership.user_id,
    membership.display_name,
    membership.role,
    membership.joined_at,
    membership.is_local
  );
  return membership;
};

const ensureDefaultHousehold = (user) => {
  if (!user) return null;
  const membership = db
    .prepare('SELECT household_id FROM household_members WHERE user_id = ? ORDER BY joined_at ASC LIMIT 1')
    .get(user.id);
  if (membership?.household_id) {
    return membership.household_id;
  }
  const displayName = user.displayName || 'My';
  const household = insertHousehold(`${displayName}'s Household`, user.id);
  addMembership(household.id, user.id, displayName, 'owner');
  return household.id;
};

const membershipForUser = (userId, householdId) =>
  db
    .prepare(
      'SELECT id, role, is_local FROM household_members WHERE user_id = ? AND household_id = ?'
    )
    .get(userId, householdId);

const mapUser = (row) =>
  row
    ? {
        id: row.id,
        email: row.email,
        displayName: row.display_name,
        createdAt: row.created_at
      }
    : null;

const mapHousehold = (row) =>
  row
    ? {
        id: row.id,
        name: row.name,
        ownerId: row.owner_id,
        inviteCode: row.invite_code,
        createdAt: row.created_at
      }
    : null;

const mapMember = (row) =>
  row
    ? {
        id: row.id,
        householdId: row.household_id,
        userId: row.user_id,
        displayName: row.display_name,
        role: row.role,
        joinedAt: row.joined_at,
        isLocal: row.is_local === 1
      }
    : null;

const buildAuthPayload = (userId, requestedHouseholdId = null, sessionId = null) => {
  const userRow = db
    .prepare('SELECT id, email, display_name, created_at FROM users WHERE id = ?')
    .get(userId);
  if (!userRow) return null;

  const userMemberships = db
    .prepare('SELECT household_id, role FROM household_members WHERE user_id = ?')
    .all(userId);
  let householdIds = userMemberships.map((m) => m.household_id);

  if (householdIds.length === 0) {
    const newHouseholdId = ensureDefaultHousehold(mapUser(userRow));
    householdIds = newHouseholdId ? [newHouseholdId] : [];
  }

  householdIds = householdIds.filter(Boolean);
  if (householdIds.length === 0) {
    return {
      user: mapUser(userRow),
      households: [],
      householdMembers: [],
      currentHouseholdId: null
    };
  }

  const placeholders = householdIds.map(() => '?').join(',');
  const householdRows = db
    .prepare(
      `SELECT id, name, owner_id, invite_code, created_at FROM households WHERE id IN (${placeholders})`
    )
    .all(...householdIds);

  const memberRows = db
    .prepare(
      `SELECT id, household_id, user_id, display_name, role, joined_at, is_local FROM household_members WHERE household_id IN (${placeholders})`
    )
    .all(...householdIds);

  const households = householdRows.map(mapHousehold).filter(Boolean);
  const householdMembers = memberRows.map(mapMember).filter(Boolean);

  const validRequested =
    requestedHouseholdId && householdIds.includes(requestedHouseholdId)
      ? requestedHouseholdId
      : null;
  const defaultHouseholdId = validRequested || householdIds[0] || null;

  if (sessionId && defaultHouseholdId) {
    db.prepare('UPDATE sessions SET household_id = ? WHERE id = ?').run(defaultHouseholdId, sessionId);
  }

  return {
    user: mapUser(userRow),
    households,
    householdMembers,
    currentHouseholdId: defaultHouseholdId
  };
};

const migrateLegacyKvData = () => {
  try {
    const hasKv = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='kv_store'")
      .get();
    if (!hasKv) return;

    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const householdCount = db.prepare('SELECT COUNT(*) as count FROM households').get().count;

    const kvUsersRow = db.prepare("SELECT value FROM kv_store WHERE key = 'users'").get();
    const kvHouseholdsRow = db.prepare("SELECT value FROM kv_store WHERE key = 'households'").get();
    const kvMembersRow =
      db.prepare("SELECT value FROM kv_store WHERE key = 'household-members-v2'").get() ||
      db.prepare("SELECT value FROM kv_store WHERE key = 'household-members'").get();

    const dataKeys = [
      'chores',
      'chore-completions',
      'calendar-events',
      'shopping-items',
      'meals',
      'recipes',
      'dashboard-widgets',
      'notification-history',
      'meal-day-constraints',
      'meal-daypart-configs'
    ];

    const now = nowSeconds();

    if (userCount === 0 && kvUsersRow?.value) {
      const kvUsers = JSON.parse(kvUsersRow.value) || [];
      kvUsers.forEach((u) => {
        if (!u?.email) return;
        db.prepare(
          'INSERT OR IGNORE INTO users (id, email, password_hash, password_algo, display_name, created_at) VALUES (?, ?, ?, ?, ?, ?)'
        ).run(
          u.id || generateId(),
          normalizeEmail(u.email),
          u.passwordHash || '',
          u.passwordHash ? 'sha256' : 'bcrypt',
          u.displayName || 'Member',
          u.createdAt || Date.now()
        );
      });
      log('INFO', `Migrated ${kvUsers.length} legacy users from kv_store`);
    }

    if (householdCount === 0 && kvHouseholdsRow?.value) {
      const kvHouseholds = JSON.parse(kvHouseholdsRow.value) || [];
      kvHouseholds.forEach((h) => {
        if (!h?.name) return;
        db.prepare(
          'INSERT OR IGNORE INTO households (id, name, owner_id, invite_code, created_at) VALUES (?, ?, ?, ?, ?)'
        ).run(
          h.id || generateId(),
          h.name,
          h.ownerId || '',
          h.inviteCode || ensureInviteCode(),
          h.createdAt || Date.now()
        );
      });
      log('INFO', `Migrated ${kvHouseholds.length} legacy households from kv_store`);
    }

    if (kvMembersRow?.value) {
      const kvMembers = JSON.parse(kvMembersRow.value) || [];
      kvMembers.forEach((m) => {
        if (!m?.householdId || !m?.userId) return;
        db.prepare(
          'INSERT OR IGNORE INTO household_members (id, household_id, user_id, display_name, role, joined_at, is_local) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).run(
          m.id || generateId(),
          m.householdId,
          m.userId,
          m.displayName || 'Member',
          m.role || 'member',
          m.joinedAt || Date.now(),
          m.userId.startsWith('local_') ? 1 : 0
        );
      });
      log('INFO', `Migrated ${kvMembers.length} legacy household members from kv_store`);
    }

    const hasHouseholdData = db.prepare('SELECT COUNT(*) as count FROM household_data').get().count > 0;
    if (!hasHouseholdData) {
      dataKeys.forEach((key) => {
        const row = db.prepare('SELECT value FROM kv_store WHERE key = ?').get(key);
        if (!row?.value) return;
        const items = JSON.parse(row.value);
        if (!Array.isArray(items)) return;
        const grouped = new Map();
        items.forEach((item) => {
          const hid = item?.householdId;
          if (!hid) return;
          if (!grouped.has(hid)) grouped.set(hid, []);
          grouped.get(hid).push(item);
        });
        grouped.forEach((value, householdId) => {
          db.prepare(
            'INSERT OR REPLACE INTO household_data (household_id, key, value, updated_at) VALUES (?, ?, ?, ?)'
          ).run(householdId, key, JSON.stringify(value), now);
        });
      });
    }
  } catch (err) {
    log('ERROR', 'Legacy KV migration failed', { error: err.message });
  }
};

migrateLegacyKvData();

// Middleware
app.use(express.json({ limit: '2mb' }));

app.use((req, res, next) => {
  req.auth = readSession(req, res);
  next();
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.get('/api/migrations', (_req, res) => {
  try {
    const versions = db
      .prepare('SELECT version, name, applied_at FROM schema_version ORDER BY version ASC')
      .all();
    res.json({ versions });
  } catch (err) {
    res.status(500).json({ error: 'Failed to read migration state' });
  }
});

app.get('/api/backup', requireAuth, (req, res) => {
  try {
    const tables = ['users', 'households', 'household_members', 'sessions', 'user_preferences', 'household_data', 'kv_store'];
    const payload = {};
    tables.forEach((table) => {
      try {
        payload[table] = db.prepare(`SELECT * FROM ${table}`).all();
      } catch {
        payload[table] = [];
      }
    });
    log('INFO', 'Backup export created', { user: req.auth?.userId, household: req.auth?.householdId });
    res.json({ exported_at: new Date().toISOString(), data: payload });
  } catch (err) {
    log('ERROR', 'Backup export failed', { error: err.message });
    res.status(500).json({ error: 'Failed to export data' });
  }
});

const requireAuth = (req, res, next) => {
  if (!req.auth?.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
};

// Auth endpoints
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, displayName } = req.body || {};
    const normalizedEmail = normalizeEmail(email || '');

    if (!normalizedEmail || !password || !displayName?.trim()) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const existing = db
      .prepare('SELECT id FROM users WHERE lower(email) = lower(?)')
      .get(normalizedEmail);
    if (existing) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    const hashed = await bcryptHash(password);
    const user = {
      id: generateId(),
      email: normalizedEmail,
      password_hash: hashed,
      password_algo: 'bcrypt',
      display_name: displayName.trim(),
      created_at: Date.now()
    };

    db.prepare(
      'INSERT INTO users (id, email, password_hash, password_algo, display_name, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(user.id, user.email, user.password_hash, user.password_algo, user.display_name, user.created_at);

    const householdId = ensureDefaultHousehold(mapUser(user));
    const { sessionId } = createSession(user.id, householdId);
    setSessionCookie(res, sessionId);

    const payload = buildAuthPayload(user.id, householdId, sessionId);
    return res.json(payload);
  } catch (err) {
    log('ERROR', 'Signup failed', { error: err.message });
    return res.status(500).json({ error: 'Failed to create account' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const normalizedEmail = normalizeEmail(email || '');
    if (!normalizedEmail || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const userRow = db
      .prepare('SELECT id, email, password_hash, password_algo, display_name, created_at FROM users WHERE lower(email) = lower(?)')
      .get(normalizedEmail);
    if (!userRow) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const isValid = await verifyPassword(password, userRow.password_hash, userRow.password_algo);
    if (!isValid) {
      return res.status(401).json({ error: 'Incorrect password' });
    }

    if (userRow.password_algo !== 'bcrypt' || !userRow.password_hash.startsWith('$2')) {
      const upgraded = await migrateLegacyPassword(userRow.id, password);
      userRow.password_hash = upgraded;
      userRow.password_algo = 'bcrypt';
    }

    const householdId = ensureDefaultHousehold(mapUser(userRow));
    const { sessionId } = createSession(userRow.id, householdId);
    setSessionCookie(res, sessionId);

    const payload = buildAuthPayload(userRow.id, householdId, sessionId);
    return res.json(payload);
  } catch (err) {
    log('ERROR', 'Login failed', { error: err.message });
    return res.status(500).json({ error: 'Failed to login' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  try {
    if (req.auth?.sessionId) {
      db.prepare('DELETE FROM sessions WHERE id = ?').run(req.auth.sessionId);
    }
    clearSessionCookie(res);
    return res.json({ success: true });
  } catch (err) {
    log('ERROR', 'Logout failed', { error: err.message });
    return res.status(500).json({ error: 'Failed to logout' });
  }
});

app.get('/api/auth/me', (req, res) => {
  if (!req.auth?.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const payload = buildAuthPayload(req.auth.userId, req.auth.householdId, req.auth.sessionId);
  if (!payload) return res.status(401).json({ error: 'Session is invalid' });
  return res.json(payload);
});

app.post('/api/auth/switch-household', requireAuth, (req, res) => {
  const { householdId } = req.body || {};
  if (!householdId) return res.status(400).json({ error: 'householdId is required' });

  const membership = membershipForUser(req.auth.userId, householdId);
  if (!membership) return res.status(403).json({ error: 'Not a member of that household' });

  if (req.auth.sessionId) {
    db.prepare('UPDATE sessions SET household_id = ? WHERE id = ?').run(householdId, req.auth.sessionId);
    setSessionCookie(res, req.auth.sessionId);
  }

  const payload = buildAuthPayload(req.auth.userId, householdId, req.auth.sessionId);
  return res.json(payload);
});

// Household management
app.post('/api/households', requireAuth, (req, res) => {
  try {
    const { name } = req.body || {};
    if (!name?.trim()) return res.status(400).json({ error: 'Household name is required' });

    const household = insertHousehold(name.trim(), req.auth.userId);
    const ownerRow = db
      .prepare('SELECT display_name FROM users WHERE id = ?')
      .get(req.auth.userId);
    const ownerName = ownerRow?.display_name || 'Owner';
    addMembership(household.id, req.auth.userId, ownerName, 'owner');

    if (req.auth.sessionId) {
      db.prepare('UPDATE sessions SET household_id = ? WHERE id = ?').run(household.id, req.auth.sessionId);
      setSessionCookie(res, req.auth.sessionId);
    }

    const payload = buildAuthPayload(req.auth.userId, household.id, req.auth.sessionId);
    return res.json(payload);
  } catch (err) {
    log('ERROR', 'Create household failed', { error: err.message });
    return res.status(500).json({ error: 'Failed to create household' });
  }
});

app.post('/api/households/join', requireAuth, (req, res) => {
  try {
    const { inviteCode } = req.body || {};
    if (!inviteCode?.trim()) {
      return res.status(400).json({ error: 'Invite code is required' });
    }
    const code = inviteCode.trim().toUpperCase();
    const household = db
      .prepare('SELECT id, name, owner_id, invite_code, created_at FROM households WHERE invite_code = ?')
      .get(code);
    if (!household) {
      return res.status(404).json({ error: 'Invalid invite code' });
    }

    const existing = membershipForUser(req.auth.userId, household.id);
    if (!existing) {
      const userRow = db.prepare('SELECT display_name FROM users WHERE id = ?').get(req.auth.userId);
      addMembership(household.id, req.auth.userId, userRow?.display_name || 'Member', 'member');
    }

    if (req.auth.sessionId) {
      db.prepare('UPDATE sessions SET household_id = ? WHERE id = ?').run(household.id, req.auth.sessionId);
      setSessionCookie(res, req.auth.sessionId);
    }

    const payload = buildAuthPayload(req.auth.userId, household.id, req.auth.sessionId);
    return res.json(payload);
  } catch (err) {
    log('ERROR', 'Join household failed', { error: err.message });
    return res.status(500).json({ error: 'Failed to join household' });
  }
});

app.post('/api/households/members', requireAuth, (req, res) => {
  try {
    const { displayName, role = 'member', householdId } = req.body || {};
    const targetHousehold = householdId || req.auth.householdId;
    if (!targetHousehold) return res.status(400).json({ error: 'householdId is required' });
    if (!displayName?.trim()) return res.status(400).json({ error: 'Display name is required' });

    const membership = membershipForUser(req.auth.userId, targetHousehold);
    if (!membership) return res.status(403).json({ error: 'Not a member of that household' });
    if (membership.role === 'member') return res.status(403).json({ error: 'Only owners or admins can add members' });

    addMembership(targetHousehold, `local_${generateId()}`, displayName.trim(), role, true);
    const payload = buildAuthPayload(req.auth.userId, targetHousehold, req.auth.sessionId);
    return res.json(payload);
  } catch (err) {
    log('ERROR', 'Add household member failed', { error: err.message });
    return res.status(500).json({ error: 'Failed to add member' });
  }
});

app.delete('/api/households/members/:id', requireAuth, (req, res) => {
  try {
    const memberId = req.params.id;
    const targetHousehold = req.auth.householdId;
    if (!targetHousehold) return res.status(400).json({ error: 'No household selected' });
    const membership = membershipForUser(req.auth.userId, targetHousehold);
    if (!membership) return res.status(403).json({ error: 'Not a member of that household' });
    if (membership.role === 'member') return res.status(403).json({ error: 'Only owners or admins can remove members' });

    const memberRow = db
      .prepare('SELECT id, role, household_id, user_id FROM household_members WHERE id = ?')
      .get(memberId);
    if (!memberRow || memberRow.household_id !== targetHousehold) {
      return res.status(404).json({ error: 'Member not found' });
    }
    if (memberRow.role === 'owner') {
      return res.status(400).json({ error: 'Cannot remove the household owner' });
    }

    db.prepare('DELETE FROM household_members WHERE id = ?').run(memberId);
    const payload = buildAuthPayload(req.auth.userId, targetHousehold, req.auth.sessionId);
    return res.json(payload);
  } catch (err) {
    log('ERROR', 'Remove household member failed', { error: err.message });
    return res.status(500).json({ error: 'Failed to remove member' });
  }
});

// Data persistence endpoints (user preferences + household data)
app.get('/api/data/:scope/:key', requireAuth, (req, res) => {
  const { scope, key } = req.params;
  if (!['user', 'household'].includes(scope)) {
    return res.status(400).json({ error: 'Invalid scope' });
  }

  try {
    if (scope === 'user') {
      const row = db
        .prepare('SELECT value FROM user_preferences WHERE user_id = ? AND key = ?')
        .get(req.auth.userId, key);
      const value = row?.value ? JSON.parse(row.value) : null;
      return res.json({ value });
    }

    const householdId = req.query.householdId || req.auth.householdId;
    if (!householdId) return res.status(400).json({ error: 'householdId is required' });

    const membership = membershipForUser(req.auth.userId, householdId);
    if (!membership) return res.status(403).json({ error: 'Not a member of that household' });

    const row = db
      .prepare('SELECT value FROM household_data WHERE household_id = ? AND key = ?')
      .get(householdId, key);
    const value = row?.value ? JSON.parse(row.value) : null;
    return res.json({ value });
  } catch (err) {
    log('ERROR', 'Read data failed', { error: err.message, scope, key });
    return res.status(500).json({ error: 'Failed to read data' });
  }
});

app.put('/api/data/:scope/:key', requireAuth, (req, res) => {
  const { scope, key } = req.params;
  const { value, householdId: bodyHouseholdId } = req.body || {};
  if (!['user', 'household'].includes(scope)) {
    return res.status(400).json({ error: 'Invalid scope' });
  }

  try {
    const serialized = JSON.stringify(value ?? null);
    const updatedAt = nowSeconds();

    if (scope === 'user') {
      db.prepare(
        'INSERT INTO user_preferences (user_id, key, value, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(user_id, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at'
      ).run(req.auth.userId, key, serialized, updatedAt);
      return res.json({ value });
    }

    const householdId = bodyHouseholdId || req.auth.householdId;
    if (!householdId) return res.status(400).json({ error: 'householdId is required' });

    const membership = membershipForUser(req.auth.userId, householdId);
    if (!membership) return res.status(403).json({ error: 'Not a member of that household' });

    db.prepare(
      'INSERT INTO household_data (household_id, key, value, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(household_id, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at'
    ).run(householdId, key, serialized, updatedAt);
    return res.json({ value });
  } catch (err) {
    log('ERROR', 'Write data failed', { error: err.message, scope, key });
    return res.status(500).json({ error: 'Failed to save data' });
  }
});

// Debug logging hook
app.post('/_debug/auth-log', (req, res) => {
  const { event = 'auth', message = 'Auth log', context = null } = req.body || {};
  log('AUTH', message, { event, context });
  res.json({ ok: true });
});

// Health check
app.get('/healthz.txt', (req, res) => {
  res.send('ok');
});

// Static assets
app.use(express.static(path.join(__dirname, 'dist')));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

let serverInstance = null;
if (NODE_ENV !== 'test') {
  serverInstance = app.listen(PORT, HOST, () => {
    log('INFO', `HomeHub server running at http://${HOST}:${PORT}`);
    log('INFO', `Database: ${dbPath}`);
  });
}

export const stopServer = () => {
  if (serverInstance) {
    serverInstance.close();
  }
};

export { app, db };
