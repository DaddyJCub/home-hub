import express from 'express';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { KV_DEFAULTS, REQUIRED_KV_KEYS, cloneDefaultValue } from './kv-defaults.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4173;
const HOST = process.env.HOST || '0.0.0.0';
const DATA_DIR = process.env.DATA_DIR || '/data';

// Simple logger
const log = (level, message, data = null) => {
  const timestamp = new Date().toISOString();
  const logLine = data 
    ? `[${timestamp}] ${level}: ${message} ${JSON.stringify(data)}`
    : `[${timestamp}] ${level}: ${message}`;
  console.log(logLine);
};

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  log('INFO', `Created data directory: ${DATA_DIR}`);
}

// Initialize SQLite database
const dbPath = path.join(DATA_DIR, 'homehub.db');
log('INFO', `Opening database: ${dbPath}`);
const db = new Database(dbPath);
let lastSeededCount = 0;

const persistKvValue = (key, value) => {
  db.prepare(`
    INSERT INTO kv_store (key, value, updated_at) 
    VALUES (?, ?, strftime('%s', 'now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = strftime('%s', 'now')
  `).run(key, JSON.stringify(value));
};

const ARRAY_KEYS = [
  'users', 'households', 'household-members', 'household-members-v2',
  'chores', 'calendar-events', 'shopping-items', 'meals', 'recipes',
  'dashboard-widgets', 'enabled-tabs', 'mobile-nav-items',
  'notification-history', 'meal-day-constraints', 'meal-daypart-configs'
];

// Create KV table if not exists
db.exec(`
  CREATE TABLE IF NOT EXISTS kv_store (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
  )
`);
log('INFO', 'Database initialized');

// Auto-cleanup corrupted data from old bug where we returned {success: true} instead of the actual value
// This detects entries that are objects with just "success" key and removes them
function cleanupCorruptedData() {
  // Keys that MUST be arrays
  const arrayKeys = [
    'users', 'households', 'household-members', 'household-members-v2',
    'chores', 'calendar-events', 'shopping-items', 'meals', 'recipes',
    'dashboard-widgets', 'enabled-tabs', 'mobile-nav-items',
    'notification-history', 'meal-day-constraints', 'meal-daypart-configs'
  ];
  
  try {
    const rows = db.prepare('SELECT key, value FROM kv_store').all();
    let cleaned = 0;
    
    for (const row of rows) {
      try {
        const parsed = JSON.parse(row.value);
        
        // Check 1: {success: true} corruption
        const isCorruptedSuccessObject = (
          typeof parsed === 'object' && 
          parsed !== null && 
          !Array.isArray(parsed) &&
          Object.keys(parsed).length === 1 && 
          parsed.success === true
        );
        
        // Check 2: Array keys that aren't arrays
        const shouldBeArray = arrayKeys.includes(row.key);
        const isNotArray = shouldBeArray && !Array.isArray(parsed);
        
        // Check 3: null values for array keys (shouldn't happen)
        const isNullArray = shouldBeArray && parsed === null;
        
        if (isCorruptedSuccessObject || isNotArray || isNullArray) {
          db.prepare('DELETE FROM kv_store WHERE key = ?').run(row.key);
          log('INFO', `Cleaned corrupted data for key: ${row.key}`, { 
            reason: isCorruptedSuccessObject ? 'success-object' : isNotArray ? 'not-array' : 'null-array',
            valueType: typeof parsed,
            isArray: Array.isArray(parsed)
          });
          cleaned++;
        }
      } catch (e) {
        // Invalid JSON, delete it
        db.prepare('DELETE FROM kv_store WHERE key = ?').run(row.key);
        log('INFO', `Cleaned invalid JSON for key: ${row.key}`);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      log('INFO', `Cleanup complete: removed ${cleaned} corrupted entries`);
    } else {
      log('INFO', 'No corrupted data found');
    }
  } catch (err) {
    log('ERROR', 'Cleanup failed', { error: err.message });
  }
}

function seedDefaultKvValues() {
  let seeded = 0;

  for (const key of REQUIRED_KV_KEYS) {
    try {
      const row = db.prepare('SELECT value FROM kv_store WHERE key = ?').get(key);

      if (row) {
        try {
          const parsed = JSON.parse(row.value);
          const expectedArray = ARRAY_KEYS.includes(key);
          if ((expectedArray && !Array.isArray(parsed)) || parsed === null) {
            const fallback = cloneDefaultValue(key);
            persistKvValue(key, fallback);
            seeded++;
          }
        } catch (parseErr) {
          const fallback = cloneDefaultValue(key);
          persistKvValue(key, fallback);
          seeded++;
        }
        continue;
      }

      const defaultValue = cloneDefaultValue(key);
      if (defaultValue !== undefined) {
        persistKvValue(key, defaultValue);
        seeded++;
      }
    } catch (err) {
      log('ERROR', `Failed to seed default for key: ${key}`, { error: err.message });
    }
  }

  lastSeededCount = seeded;
  if (seeded > 0) {
    log('INFO', `Seeded ${seeded} KV defaults`);
  } else {
    log('INFO', 'KV defaults already present');
  }
}

const buildFallbackValue = (key) => {
  if (Object.prototype.hasOwnProperty.call(KV_DEFAULTS, key)) {
    return cloneDefaultValue(key);
  }
  if (ARRAY_KEYS.includes(key)) {
    return [];
  }
  return null;
};

// Run cleanup on startup
cleanupCorruptedData();

// ONE-TIME FULL DATABASE RESET - Remove this after first successful deploy
// This ensures all corrupted data is cleared
const RESET_VERSION = 3; // Increment this to force another reset
const resetMarker = db.prepare('SELECT value FROM kv_store WHERE key = ?').get('__reset_version__');
const currentVersion = resetMarker ? JSON.parse(resetMarker.value) : 0;
if (currentVersion < RESET_VERSION) {
  log('INFO', '=== PERFORMING ONE-TIME DATABASE RESET ===');
  db.prepare('DELETE FROM kv_store').run();
  db.prepare('INSERT INTO kv_store (key, value) VALUES (?, ?)').run('__reset_version__', JSON.stringify(RESET_VERSION));
  log('INFO', '=== DATABASE RESET COMPLETE - Fresh start ===');
}

// Ensure required keys exist before serving requests
seedDefaultKvValues();

// Middleware
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    // Only log API requests, not static files
    if (req.path.startsWith('/_spark')) {
      log('HTTP', `${req.method} ${req.path}`, { 
        status: res.statusCode, 
        duration: `${duration}ms`,
        body: req.method !== 'GET' ? req.body : undefined
      });
    }
  });
  next();
});

// Serve static files from dist
app.use(express.static(path.join(__dirname, 'dist')));

// Health check
app.get('/healthz.txt', (req, res) => {
  res.send('ok');
});

// KV Store API - GET
// For missing keys, return 204 No Content - this should make Spark use the default value
app.get('/_spark/kv/:key', (req, res) => {
  const { key } = req.params;
  try {
    const row = db.prepare('SELECT value FROM kv_store WHERE key = ?').get(key);
    if (row) {
      try {
        const parsed = JSON.parse(row.value);
        log('DEBUG', `GET /_spark/kv/${key}`, { found: true, valueType: typeof parsed, isArray: Array.isArray(parsed) });
        res.json(parsed);
      } catch (parseErr) {
        const fallback = buildFallbackValue(key);
        persistKvValue(key, fallback);
        log('WARN', `GET /_spark/kv/${key} returned corrupted JSON, resetting to fallback`);
        res.json(fallback);
      }
    } else {
      const fallback = buildFallbackValue(key);
      persistKvValue(key, fallback);
      log('DEBUG', `GET /_spark/kv/${key}`, { found: false, returning: 'default', defaultType: typeof fallback });
      res.json(fallback);
    }
  } catch (err) {
    log('ERROR', `GET /_spark/kv/${key} failed`, { error: err.message });
    res.status(500).json({ error: 'Failed to read' });
  }
});

// KV Store API - PUT/POST
app.put('/_spark/kv/:key', (req, res) => {
  const { key } = req.params;
  
  // Validate: array keys must receive arrays, reject empty objects
  if (ARRAY_KEYS.includes(key)) {
    if (!Array.isArray(req.body)) {
      log('WARN', `PUT /_spark/kv/${key} rejected - expected array`, { received: typeof req.body, isArray: false });
      // Return empty array instead of saving corrupted data
      res.json([]);
      return;
    }
  }
  
  // Reject completely empty objects (likely empty request body)
  if (typeof req.body === 'object' && req.body !== null && !Array.isArray(req.body) && Object.keys(req.body).length === 0) {
    log('WARN', `PUT /_spark/kv/${key} rejected - empty object`);
    res.json(null);
    return;
  }
  
  const value = JSON.stringify(req.body);
  log('DEBUG', `PUT /_spark/kv/${key}`, { bodyType: typeof req.body, isArray: Array.isArray(req.body), storedValue: value.substring(0, 200) });
  try {
    persistKvValue(key, req.body);
    log('DEBUG', `PUT /_spark/kv/${key} saved successfully`);
    // Return the saved value - Spark uses this to update its state
    res.json(req.body);
  } catch (err) {
    log('ERROR', `PUT /_spark/kv/${key} failed`, { error: err.message });
    res.status(500).json({ error: 'Failed to save' });
  }
});

app.post('/_spark/kv/:key', (req, res) => {
  const { key } = req.params;
  
  // Validate: array keys must receive arrays, reject empty objects
  if (ARRAY_KEYS.includes(key)) {
    if (!Array.isArray(req.body)) {
      log('WARN', `POST /_spark/kv/${key} rejected - expected array`, { received: typeof req.body, isArray: false });
      // Return empty array instead of saving corrupted data
      res.json([]);
      return;
    }
  }
  
  // Reject completely empty objects (likely empty request body)
  if (typeof req.body === 'object' && req.body !== null && !Array.isArray(req.body) && Object.keys(req.body).length === 0) {
    log('WARN', `POST /_spark/kv/${key} rejected - empty object`);
    res.json(null);
    return;
  }
  
  const value = JSON.stringify(req.body);
  log('DEBUG', `POST /_spark/kv/${key}`, { bodyType: typeof req.body, isArray: Array.isArray(req.body), storedValue: value.substring(0, 200) });
  try {
    persistKvValue(key, req.body);
    log('DEBUG', `POST /_spark/kv/${key} saved successfully`);
    // Return the saved value - Spark uses this to update its state
    res.json(req.body);
  } catch (err) {
    log('ERROR', `POST /_spark/kv/${key} failed`, { error: err.message });
    res.status(500).json({ error: 'Failed to save' });
  }
});

// KV Store API - DELETE (for clearing data in settings)
app.delete('/_spark/kv/:key', (req, res) => {
  const { key } = req.params;
  log('DEBUG', `DELETE /_spark/kv/${key}`);
  try {
    db.prepare('DELETE FROM kv_store WHERE key = ?').run(key);
    log('DEBUG', `DELETE /_spark/kv/${key} success`);
    res.json({ success: true });
  } catch (err) {
    log('ERROR', `DELETE /_spark/kv/${key} failed`, { error: err.message });
    res.status(500).json({ error: 'Failed to delete' });
  }
});

// Spark loaded endpoint (required by the app)
app.post('/_spark/loaded', (req, res) => {
  log('DEBUG', 'POST /_spark/loaded');
  res.json({ success: true });
});

// Spark LLM endpoint - stub that returns an error (feature not available in standalone mode)
app.post('/_spark/llm', (req, res) => {
  log('DEBUG', 'POST /_spark/llm (not available)');
  res.status(501).json({ 
    error: 'LLM feature not available in standalone mode. This requires the GitHub Spark platform.' 
  });
});

// Spark user endpoint - stub (not needed for this app)
app.get('/_spark/user', (req, res) => {
  log('DEBUG', 'GET /_spark/user');
  res.json(null);
});

app.get('/_spark/status', (req, res) => {
  try {
    const rows = db.prepare('SELECT key FROM kv_store').all();
    const keys = rows.map((row) => row.key);
    const missing = REQUIRED_KV_KEYS.filter((key) => !keys.includes(key));
    res.json({
      ok: true,
      keys,
      missing,
      defaultsSeeded: lastSeededCount,
      resetVersion: currentVersion,
      dataPath: dbPath
    });
  } catch (err) {
    log('ERROR', 'GET /_spark/status failed', { error: err.message });
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/_spark/kv/seed-defaults', (req, res) => {
  try {
    seedDefaultKvValues();
    const rows = db.prepare('SELECT key FROM kv_store').all();
    const keys = rows.map((row) => row.key);
    const missing = REQUIRED_KV_KEYS.filter((key) => !keys.includes(key));
    res.json({ ok: true, missing, defaultsSeeded: lastSeededCount });
  } catch (err) {
    log('ERROR', 'POST /_spark/kv/seed-defaults failed', { error: err.message });
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/_debug/auth-log', (req, res) => {
  const { event = 'auth', message = 'Auth log', context = null } = req.body || {};
  log('AUTH', message, { event, context });
  res.json({ ok: true });
});

// Debug endpoint - dump all KV data (useful for troubleshooting)
app.get('/_debug/kv', (req, res) => {
  try {
    const rows = db.prepare('SELECT key, value, updated_at FROM kv_store').all();
    const data = rows.map(row => ({
      key: row.key,
      value: JSON.parse(row.value),
      updated_at: row.updated_at
    }));
    log('DEBUG', 'GET /_debug/kv', { count: data.length });
    res.json(data);
  } catch (err) {
    log('ERROR', 'GET /_debug/kv failed', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// Debug endpoint - clear all data (useful for testing fresh start)
app.delete('/_debug/kv', (req, res) => {
  try {
    db.prepare('DELETE FROM kv_store').run();
    log('DEBUG', 'DELETE /_debug/kv - all data cleared');
    res.json({ success: true, message: 'All data cleared' });
  } catch (err) {
    log('ERROR', 'DELETE /_debug/kv failed', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// SPA fallback - serve index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, HOST, () => {
  log('INFO', `HomeHub server running at http://${HOST}:${PORT}`);
  log('INFO', `Database: ${dbPath}`);
});
