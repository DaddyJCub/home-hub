import express from 'express';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

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
  try {
    const rows = db.prepare('SELECT key, value FROM kv_store').all();
    let cleaned = 0;
    
    for (const row of rows) {
      try {
        const parsed = JSON.parse(row.value);
        // Detect corrupted data patterns:
        // 1. {success: true} - from old PUT/POST response bug
        // 2. Objects where we expected arrays (users, households, chores, etc.)
        const isCorruptedSuccessObject = (
          typeof parsed === 'object' && 
          parsed !== null && 
          !Array.isArray(parsed) &&
          Object.keys(parsed).length === 1 && 
          parsed.success === true
        );
        
        if (isCorruptedSuccessObject) {
          db.prepare('DELETE FROM kv_store WHERE key = ?').run(row.key);
          log('INFO', `Cleaned corrupted data for key: ${row.key}`);
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

// Run cleanup on startup
cleanupCorruptedData();

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
// For missing keys, return null - Spark will use its default value
app.get('/_spark/kv/:key', (req, res) => {
  const { key } = req.params;
  try {
    const row = db.prepare('SELECT value FROM kv_store WHERE key = ?').get(key);
    if (row) {
      const parsed = JSON.parse(row.value);
      log('DEBUG', `GET /_spark/kv/${key}`, { found: true, valueType: typeof parsed, isArray: Array.isArray(parsed) });
      res.json(parsed);
    } else {
      log('DEBUG', `GET /_spark/kv/${key}`, { found: false, returning: 'null' });
      // Return null for missing keys - Spark should use default value
      res.json(null);
    }
  } catch (err) {
    log('ERROR', `GET /_spark/kv/${key} failed`, { error: err.message });
    res.status(500).json({ error: 'Failed to read' });
  }
});

// KV Store API - PUT/POST
app.put('/_spark/kv/:key', (req, res) => {
  const { key } = req.params;
  const value = JSON.stringify(req.body);
  log('DEBUG', `PUT /_spark/kv/${key}`, { bodyType: typeof req.body, isArray: Array.isArray(req.body), storedValue: value.substring(0, 200) });
  try {
    db.prepare(`
      INSERT INTO kv_store (key, value, updated_at) 
      VALUES (?, ?, strftime('%s', 'now'))
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = strftime('%s', 'now')
    `).run(key, value);
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
  const value = JSON.stringify(req.body);
  log('DEBUG', `POST /_spark/kv/${key}`, { bodyType: typeof req.body, isArray: Array.isArray(req.body), storedValue: value.substring(0, 200) });
  try {
    db.prepare(`
      INSERT INTO kv_store (key, value, updated_at) 
      VALUES (?, ?, strftime('%s', 'now'))
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = strftime('%s', 'now')
    `).run(key, value);
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
