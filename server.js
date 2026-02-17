import express from 'express';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import rateLimit from 'express-rate-limit';
import { ZodError } from 'zod';
import {
  UserSignupSchema,
  UserLoginSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  HouseholdCreateSchema,
  HouseholdJoinSchema,
  HouseholdMemberSchema,
  SwitchHouseholdSchema,
  buildHouseholdDataValidators,
  formatZodError
} from './server/validation.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lightweight logger used across the server
const log = (level, message, data = null) => {
  const payload = {
    level,
    message,
    context: data || {},
    time: new Date().toISOString()
  };
  console.log(JSON.stringify(payload));
};

const app = express();
const PORT = process.env.PORT || 4173;
const HOST = process.env.HOST || '0.0.0.0';
const DATA_DIR = process.env.DATA_DIR || '/data';
const SESSION_COOKIE_NAME = 'hh_session';
const NODE_ENV = process.env.NODE_ENV || 'development';
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-homehub-session-secret';
if (SESSION_SECRET === 'dev-homehub-session-secret' && NODE_ENV === 'production') {
  console.warn('WARNING: Using default SESSION_SECRET in production. Set SESSION_SECRET env var for security.');
}
const SESSION_MAX_AGE_SECONDS =
  Number(process.env.SESSION_MAX_AGE_SECONDS) ||
  Number(process.env.SESSION_MAX_AGE_DAYS || 14) * 24 * 60 * 60;
const devResetEnabled = NODE_ENV === 'development' && process.env.ALLOW_DEV_RESET === 'true';
const rateLimitEnabled = process.env.RATE_LIMIT_ENABLED === 'true';

// SMTP configuration for password reset emails (optional)
const SMTP_HOST = process.env.SMTP_HOST || null;
const SMTP_PORT = Number(process.env.SMTP_PORT) || 587;
const SMTP_SECURE = process.env.SMTP_SECURE === 'true';
const SMTP_USER = process.env.SMTP_USER || null;
const SMTP_PASS = process.env.SMTP_PASS || null;
const SMTP_FROM = process.env.SMTP_FROM || null;
const APP_URL = process.env.APP_URL || `http://localhost:${PORT}`;
const emailEnabled = Boolean(SMTP_HOST && SMTP_FROM);

// Lazy-loaded email transporter
let mailTransporter = null;
const getMailer = async () => {
  if (!emailEnabled) return null;
  if (!mailTransporter) {
    const nodemailer = await import('nodemailer');
    mailTransporter = nodemailer.default.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined
    });
  }
  return mailTransporter;
};

// Branded password reset email template
const getResetEmailHtml = (resetLink, userName) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password - HomeHub</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f1eb;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 480px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          <!-- Header -->
          <tr>
            <td style="background-color: #c17a5c; padding: 32px 40px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">🏠 HomeHub</h1>
              <p style="margin: 8px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">Household harmony made simple</p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 16px 0; color: #1a1a1a; font-size: 20px; font-weight: 600;">Reset Your Password</h2>
              <p style="margin: 0 0 24px 0; color: #4a4a4a; font-size: 16px; line-height: 1.6;">Hi${userName ? ` ${userName}` : ''},</p>
              <p style="margin: 0 0 24px 0; color: #4a4a4a; font-size: 16px; line-height: 1.6;">We received a request to reset your password. Click the button below to create a new password:</p>
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="text-align: center; padding: 8px 0 32px 0;">
                    <a href="${resetLink}" style="display: inline-block; background-color: #c17a5c; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600;">Reset Password</a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 16px 0; color: #6a6a6a; font-size: 14px; line-height: 1.5;">This link will expire in <strong>1 hour</strong> for security reasons.</p>
              <p style="margin: 0 0 16px 0; color: #6a6a6a; font-size: 14px; line-height: 1.5;">If you can't click the button, copy and paste this link into your browser:</p>
              <p style="margin: 0 0 24px 0; color: #c17a5c; font-size: 12px; word-break: break-all;">${resetLink}</p>
              <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;">
              <p style="margin: 0; color: #999999; font-size: 13px; line-height: 1.5;">If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9f7f5; padding: 24px 40px; border-radius: 0 0 12px 12px; text-align: center;">
              <p style="margin: 0; color: #999999; font-size: 12px;">© ${new Date().getFullYear()} HomeHub. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// Send password reset email (returns true if sent, false if SMTP not configured or failed)
const sendResetEmail = async (to, resetLink, userName) => {
  const mailer = await getMailer();
  if (!mailer) {
    log('INFO', 'Password reset email skipped - SMTP not configured', { to });
    return false;
  }
  try {
    await mailer.sendMail({
      from: SMTP_FROM,
      to,
      subject: 'Reset Your Password - HomeHub',
      html: getResetEmailHtml(resetLink, userName)
    });
    log('INFO', 'Password reset email sent', { to });
    return true;
  } catch (err) {
    log('ERROR', 'Failed to send password reset email', { to, error: err.message });
    return false;
  }
};

// Respect proxy headers when deployed behind a load balancer (needed for rate limiting/IP keys)
app.set('trust proxy', true);

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

const sendError = (res, status, message, code = null) => {
  const payload = { error: message };
  if (code) payload.code = code;
  return res.status(status).json(payload);
};

const parseOrReject = (schema, payload, res) => {
  const result = schema.safeParse(payload);
  if (!result.success) {
    return sendError(res, 400, formatZodError(result.error), 'VALIDATION_ERROR');
  }
  return result.data;
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

        CREATE TABLE IF NOT EXISTS password_reset_tokens (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL,
          token TEXT UNIQUE NOT NULL,
          expires_at INTEGER NOT NULL,
          used INTEGER NOT NULL DEFAULT 0
        );
        CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
        CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON password_reset_tokens(user_id);
      `);
    }
  },
  {
    version: 2,
    name: 'add-password-reset-tokens',
    up: (database) => {
      // For existing databases that already ran migration 1 before password_reset_tokens was added
      database.exec(`
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL,
          token TEXT UNIQUE NOT NULL,
          expires_at INTEGER NOT NULL,
          used INTEGER NOT NULL DEFAULT 0
        );
        CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
        CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON password_reset_tokens(user_id);
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

const resetStateForTests = () => {
  if (NODE_ENV !== 'test') return;
  const tables = [
    'users',
    'households',
    'household_members',
    'sessions',
    'user_preferences',
    'household_data',
    'kv_store'
  ];
  tables.forEach((table) => {
    try {
      db.prepare(`DELETE FROM ${table}`).run();
    } catch {
      // ignore missing tables in tests
    }
  });
};

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

if (rateLimitEnabled) {
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000, // allow higher auth/sync traffic bursts
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => sendError(res, 429, 'Too many requests', 'RATE_LIMITED')
  });

  app.use('/api/auth', authLimiter);

  // Stricter rate limiter for password reset to prevent abuse
  const forgotPasswordLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour window
    max: 5, // 5 attempts per hour per IP+email
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      const email = (req.body?.email || '').toLowerCase().trim();
      return `${req.ip}-${email}`;
    },
    handler: (_req, res) => sendError(res, 429, 'Too many password reset requests. Please try again later.', 'RATE_LIMITED')
  });

  app.use('/api/auth/forgot-password', forgotPasswordLimiter);

  const writeLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5000, // generous headroom for sync
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => sendError(res, 429, 'Too many requests', 'RATE_LIMITED')
  });

  app.use(['/api/data', '/api/households'], writeLimiter);
} else {
  log('INFO', 'Rate limiting disabled (RATE_LIMIT_ENABLED not set to true)');
}

const requireAuth = (req, res, next) => {
  if (!req.auth?.userId) {
    return sendError(res, 401, 'Not authenticated', 'NOT_AUTHENTICATED');
  }
  next();
};

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
    sendError(res, 500, 'Failed to read migration state', 'SERVER_ERROR');
  }
});

app.get('/api/backup', requireAuth, (req, res) => {
  try {
    const userId = req.auth?.userId;
    const householdId = req.auth?.householdId;
    if (!userId || !householdId) {
      return sendError(res, 403, 'No household selected', 'FORBIDDEN');
    }
    const payload = {};
    // Only export the current user's data and their household's data
    try {
      const userRow = db.prepare('SELECT id, email, display_name, created_at FROM users WHERE id = ?').get(userId);
      payload.user = userRow || null;
    } catch { payload.user = null; }
    try {
      payload.household = db.prepare('SELECT id, name, invite_code, created_at FROM households WHERE id = ?').get(householdId) || null;
    } catch { payload.household = null; }
    try {
      payload.household_members = db.prepare('SELECT id, household_id, user_id, display_name, role, created_at FROM household_members WHERE household_id = ?').all(householdId);
    } catch { payload.household_members = []; }
    try {
      payload.user_preferences = db.prepare('SELECT key, value FROM user_preferences WHERE user_id = ?').all(userId);
    } catch { payload.user_preferences = []; }
    try {
      payload.household_data = db.prepare('SELECT key, value FROM household_data WHERE household_id = ?').all(householdId);
    } catch { payload.household_data = []; }
    log('INFO', 'Backup export created', { user: userId, household: householdId });
    res.json({ exported_at: new Date().toISOString(), data: payload });
  } catch (err) {
    log('ERROR', 'Backup export failed', { error: err.message });
    sendError(res, 500, 'Failed to export data', 'SERVER_ERROR');
  }
});

// Auth endpoints
app.post('/api/auth/signup', async (req, res) => {
  try {
    const parsed = parseOrReject(UserSignupSchema, req.body || {}, res);
    if (!parsed) return;
    const { email, password, displayName } = parsed;
    const normalizedEmail = normalizeEmail(email);

    const existing = db
      .prepare('SELECT id FROM users WHERE lower(email) = lower(?)')
      .get(normalizedEmail);
    if (existing) {
      return sendError(res, 409, 'Email already exists', 'EMAIL_EXISTS');
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
    return sendError(res, 500, 'Failed to create account', 'SERVER_ERROR');
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const parsed = parseOrReject(UserLoginSchema, req.body || {}, res);
    if (!parsed) return;
    const { email, password } = parsed;
    const normalizedEmail = normalizeEmail(email);

    const userRow = db
      .prepare('SELECT id, email, password_hash, password_algo, display_name, created_at FROM users WHERE lower(email) = lower(?)')
      .get(normalizedEmail);
    if (!userRow) {
      return sendError(res, 401, 'Invalid email or password', 'INVALID_CREDENTIALS');
    }

    const isValid = await verifyPassword(password, userRow.password_hash, userRow.password_algo);
    if (!isValid) {
      return sendError(res, 401, 'Invalid email or password', 'INVALID_CREDENTIALS');
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
    return sendError(res, 500, 'Failed to login', 'SERVER_ERROR');
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
    return sendError(res, 500, 'Failed to logout', 'SERVER_ERROR');
  }
});

app.get('/api/auth/me', (req, res) => {
  if (!req.auth?.userId) {
    return sendError(res, 401, 'Not authenticated', 'NOT_AUTHENTICATED');
  }
  const payload = buildAuthPayload(req.auth.userId, req.auth.householdId, req.auth.sessionId);
  if (!payload) return sendError(res, 401, 'Session is invalid', 'NOT_AUTHENTICATED');
  return res.json(payload);
});

// Password reset - request reset link
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const parsed = parseOrReject(ForgotPasswordSchema, req.body || {}, res);
    if (!parsed) return;
    const { email } = parsed;

    // Always return success to prevent email enumeration
    const successResponse = (emailSent, resetLink = null) => {
      const response = { success: true, emailSent };
      if (resetLink && !emailSent && NODE_ENV === 'development') response.resetLink = resetLink;
      return res.json(response);
    };

    const userRow = db
      .prepare('SELECT id, display_name FROM users WHERE lower(email) = lower(?)')
      .get(email);

    if (!userRow) {
      // Don't reveal that the email doesn't exist
      log('INFO', 'Password reset requested for non-existent email', { email });
      return successResponse(emailEnabled);
    }

    // Invalidate any existing unused tokens for this user
    db.prepare('UPDATE password_reset_tokens SET used = 1 WHERE user_id = ? AND used = 0').run(userRow.id);

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = nowSeconds() + 3600; // 1 hour

    db.prepare(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at, used) VALUES (?, ?, ?, 0)'
    ).run(userRow.id, token, expiresAt);

    const resetLink = `${APP_URL}/reset-password?token=${token}`;
    const emailSent = await sendResetEmail(email, resetLink, userRow.display_name);

    log('INFO', 'Password reset token created', { userId: userRow.id, emailSent });
    return successResponse(emailSent, resetLink);
  } catch (err) {
    log('ERROR', 'Forgot password failed', { error: err.message });
    return sendError(res, 500, 'Failed to process password reset request', 'SERVER_ERROR');
  }
});

// Password reset - set new password
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const parsed = parseOrReject(ResetPasswordSchema, req.body || {}, res);
    if (!parsed) return;
    const { token, password } = parsed;

    const tokenRow = db
      .prepare('SELECT id, user_id, expires_at, used FROM password_reset_tokens WHERE token = ?')
      .get(token);

    if (!tokenRow) {
      return sendError(res, 400, 'Invalid or expired reset link', 'INVALID_TOKEN');
    }

    if (tokenRow.used === 1) {
      return sendError(res, 400, 'This reset link has already been used', 'TOKEN_USED');
    }

    if (tokenRow.expires_at <= nowSeconds()) {
      return sendError(res, 400, 'This reset link has expired. Please request a new one.', 'TOKEN_EXPIRED');
    }

    // Hash new password
    const hashedPassword = await bcryptHash(password);

    // Update user password
    db.prepare('UPDATE users SET password_hash = ?, password_algo = ? WHERE id = ?').run(
      hashedPassword,
      'bcrypt',
      tokenRow.user_id
    );

    // Mark token as used
    db.prepare('UPDATE password_reset_tokens SET used = 1 WHERE id = ?').run(tokenRow.id);

    // Invalidate all sessions for this user (force re-login everywhere)
    const deletedSessions = db.prepare('DELETE FROM sessions WHERE user_id = ?').run(tokenRow.user_id);
    log('INFO', 'Password reset completed, sessions invalidated', {
      userId: tokenRow.user_id,
      sessionsDeleted: deletedSessions.changes
    });

    return res.json({ success: true });
  } catch (err) {
    log('ERROR', 'Reset password failed', { error: err.message });
    return sendError(res, 500, 'Failed to reset password', 'SERVER_ERROR');
  }
});

app.post('/api/auth/switch-household', requireAuth, (req, res) => {
  const parsed = parseOrReject(SwitchHouseholdSchema, req.body || {}, res);
  if (!parsed) return;
  const { householdId } = parsed;

  const membership = membershipForUser(req.auth.userId, householdId);
  if (!membership) return sendError(res, 403, 'Not a member of that household', 'PERMISSION_DENIED');

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
    const parsed = parseOrReject(HouseholdCreateSchema, req.body || {}, res);
    if (!parsed) return;
    const { name } = parsed;

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
    return sendError(res, 500, 'Failed to create household', 'SERVER_ERROR');
  }
});

app.post('/api/households/join', requireAuth, (req, res) => {
  try {
    const parsed = parseOrReject(HouseholdJoinSchema, req.body || {}, res);
    if (!parsed) return;
    const code = parsed.inviteCode.trim().toUpperCase();
    const household = db
      .prepare('SELECT id, name, owner_id, invite_code, created_at FROM households WHERE invite_code = ?')
      .get(code);
    if (!household) {
      return sendError(res, 404, 'Invalid invite code', 'NOT_FOUND');
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
    return sendError(res, 500, 'Failed to join household', 'SERVER_ERROR');
  }
});

app.post('/api/households/members', requireAuth, (req, res) => {
  try {
    const parsed = parseOrReject(HouseholdMemberSchema, req.body || {}, res);
    if (!parsed) return;
    const { displayName, role = 'member', householdId } = parsed;
    const targetHousehold = householdId || req.auth.householdId;
    if (!targetHousehold) return sendError(res, 400, 'householdId is required', 'VALIDATION_ERROR');

    const membership = membershipForUser(req.auth.userId, targetHousehold);
    if (!membership) return sendError(res, 403, 'Not a member of that household', 'PERMISSION_DENIED');
    if (membership.role === 'member')
      return sendError(res, 403, 'Only owners or admins can add members', 'PERMISSION_DENIED');

    addMembership(targetHousehold, `local_${generateId()}`, displayName.trim(), role, true);
    const payload = buildAuthPayload(req.auth.userId, targetHousehold, req.auth.sessionId);
    return res.json(payload);
  } catch (err) {
    log('ERROR', 'Add household member failed', { error: err.message });
    return sendError(res, 500, 'Failed to add member', 'SERVER_ERROR');
  }
});

app.delete('/api/households/members/:id', requireAuth, (req, res) => {
  try {
    const memberId = req.params.id;
    const targetHousehold = req.auth.householdId;
    if (!targetHousehold) return sendError(res, 400, 'No household selected', 'VALIDATION_ERROR');
    const membership = membershipForUser(req.auth.userId, targetHousehold);
    if (!membership) return sendError(res, 403, 'Not a member of that household', 'PERMISSION_DENIED');
    if (membership.role === 'member')
      return sendError(res, 403, 'Only owners or admins can remove members', 'PERMISSION_DENIED');

    const memberRow = db
      .prepare('SELECT id, role, household_id, user_id FROM household_members WHERE id = ?')
      .get(memberId);
    if (!memberRow || memberRow.household_id !== targetHousehold) {
      return sendError(res, 404, 'Member not found', 'NOT_FOUND');
    }
    if (memberRow.role === 'owner') {
      return sendError(res, 400, 'Cannot remove the household owner', 'VALIDATION_ERROR');
    }

    db.prepare('DELETE FROM household_members WHERE id = ?').run(memberId);
    const payload = buildAuthPayload(req.auth.userId, targetHousehold, req.auth.sessionId);
    return res.json(payload);
  } catch (err) {
    log('ERROR', 'Remove household member failed', { error: err.message });
    return sendError(res, 500, 'Failed to remove member', 'SERVER_ERROR');
  }
});

// Data persistence endpoints (user preferences + household data)
app.get('/api/data/:scope/:key', requireAuth, (req, res) => {
  const { scope, key } = req.params;
  if (!['user', 'household'].includes(scope)) {
    return sendError(res, 400, 'Invalid scope', 'VALIDATION_ERROR');
  }

  try {
    if (scope === 'user') {
      const row = db
        .prepare('SELECT value FROM user_preferences WHERE user_id = ? AND key = ?')
        .get(req.auth.userId, key);
      const value = row?.value ? JSON.parse(row.value) : null;
      return res.json({ value });
    }

    const householdId = req.auth.householdId;
    if (!householdId) return sendError(res, 400, 'householdId is required', 'VALIDATION_ERROR');

    const membership = membershipForUser(req.auth.userId, householdId);
    if (!membership) return sendError(res, 403, 'Not a member of that household', 'PERMISSION_DENIED');

    const row = db
      .prepare('SELECT value FROM household_data WHERE household_id = ? AND key = ?')
      .get(householdId, key);
    const value = row?.value ? JSON.parse(row.value) : null;
    return res.json({ value });
  } catch (err) {
    log('ERROR', 'Read data failed', { error: err.message, scope, key });
    return sendError(res, 500, 'Failed to read data', 'SERVER_ERROR');
  }
});

app.put('/api/data/:scope/:key', requireAuth, (req, res) => {
  const { scope, key } = req.params;
  const { value } = req.body || {};
  if (!['user', 'household'].includes(scope)) {
    return sendError(res, 400, 'Invalid scope', 'VALIDATION_ERROR');
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

    const householdId = req.auth.householdId;
    if (!householdId) return sendError(res, 400, 'householdId is required', 'VALIDATION_ERROR');

    const membership = membershipForUser(req.auth.userId, householdId);
    if (!membership) return sendError(res, 403, 'Not a member of that household', 'PERMISSION_DENIED');

    const validators = buildHouseholdDataValidators(householdId);
    const validator = validators[key];
    let parsedValue = value;

    if (validator) {
      const parsed = validator.safeParse(value ?? []);
      if (!parsed.success) {
        return sendError(res, 400, formatZodError(parsed.error), 'VALIDATION_ERROR');
      }
      parsedValue = parsed.data;
    }

    const serializedHouseholdValue = JSON.stringify(parsedValue ?? null);
    db.prepare(
      'INSERT INTO household_data (household_id, key, value, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(household_id, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at'
    ).run(householdId, key, serializedHouseholdValue, updatedAt);
    return res.json({ value: parsedValue });
  } catch (err) {
    log('ERROR', 'Write data failed', { error: err.message, scope, key });
    return sendError(res, 500, 'Failed to save data', 'SERVER_ERROR');
  }
});

// Debug logging hook
app.post('/_debug/auth-log', (req, res) => {
  const { event = 'auth', message = 'Auth log', context = null } = req.body || {};
  log('AUTH', message, { event, context });
  res.json({ ok: true });
});

// Ollama proxy - avoids CORS issues with direct browser-to-Ollama requests
const ALLOWED_OLLAMA_PATHS = ['/api/tags', '/api/generate', '/api/chat', '/api/version'];
app.all('/api/ollama/*', requireAuth, async (req, res) => {
  try {
    const ollamaPath = '/' + req.params[0];
    if (!ALLOWED_OLLAMA_PATHS.some(p => ollamaPath.startsWith(p))) {
      return sendError(res, 400, 'Invalid Ollama API path', 'VALIDATION_ERROR');
    }
    const ollamaUrl = (req.headers['x-ollama-url'] || '').toString().trim().replace(/\/+$/, '');
    if (!ollamaUrl || (!ollamaUrl.startsWith('http://') && !ollamaUrl.startsWith('https://'))) {
      return sendError(res, 400, 'Missing or invalid X-Ollama-Url header', 'VALIDATION_ERROR');
    }
    const targetUrl = `${ollamaUrl}${ollamaPath}`;
    const fetchOpts = { method: req.method, headers: { 'Content-Type': 'application/json' } };
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      fetchOpts.body = JSON.stringify(req.body);
    }
    const upstream = await fetch(targetUrl, { ...fetchOpts, signal: AbortSignal.timeout(120000) });
    const data = await upstream.text();
    res.status(upstream.status).set('Content-Type', upstream.headers.get('content-type') || 'application/json').send(data);
  } catch (err) {
    log('ERROR', 'Ollama proxy error', { error: err.message });
    sendError(res, 502, `Ollama unreachable: ${err.message}`, 'PROXY_ERROR');
  }
});

// Health check
app.get('/healthz.txt', (req, res) => {
  res.send('ok');
});

// Static assets - serve from public folder first (for icons, manifest, etc.)
app.use(express.static(path.join(__dirname, 'public')));
// Then serve from dist folder (built assets)
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

export { app, db, resetStateForTests, devResetEnabled };
