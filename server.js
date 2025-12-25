const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 4173;
const HOST = process.env.HOST || '0.0.0.0';
const DATA_DIR = process.env.DATA_DIR || '/data';

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize SQLite database
const dbPath = path.join(DATA_DIR, 'homehub.db');
const db = new Database(dbPath);

// Create KV table if not exists
db.exec(`
  CREATE TABLE IF NOT EXISTS kv_store (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
  )
`);

// Middleware
app.use(express.json());

// Serve static files from dist
app.use(express.static(path.join(__dirname, 'dist')));

// Health check
app.get('/healthz.txt', (req, res) => {
  res.send('ok');
});

// KV Store API - GET
app.get('/_spark/kv/:key', (req, res) => {
  const { key } = req.params;
  try {
    const row = db.prepare('SELECT value FROM kv_store WHERE key = ?').get(key);
    if (row) {
      res.json(JSON.parse(row.value));
    } else {
      res.json(null);
    }
  } catch (err) {
    console.error(`Error getting key ${key}:`, err);
    res.json(null);
  }
});

// KV Store API - PUT/POST
app.put('/_spark/kv/:key', (req, res) => {
  const { key } = req.params;
  const value = JSON.stringify(req.body);
  try {
    db.prepare(`
      INSERT INTO kv_store (key, value, updated_at) 
      VALUES (?, ?, strftime('%s', 'now'))
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = strftime('%s', 'now')
    `).run(key, value);
    res.json({ success: true });
  } catch (err) {
    console.error(`Error setting key ${key}:`, err);
    res.status(500).json({ error: 'Failed to save' });
  }
});

app.post('/_spark/kv/:key', (req, res) => {
  const { key } = req.params;
  const value = JSON.stringify(req.body);
  try {
    db.prepare(`
      INSERT INTO kv_store (key, value, updated_at) 
      VALUES (?, ?, strftime('%s', 'now'))
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = strftime('%s', 'now')
    `).run(key, value);
    res.json({ success: true });
  } catch (err) {
    console.error(`Error setting key ${key}:`, err);
    res.status(500).json({ error: 'Failed to save' });
  }
});

// Spark loaded endpoint (required by the app)
app.post('/_spark/loaded', (req, res) => {
  res.json({ success: true });
});

// SPA fallback - serve index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`HomeHub server running at http://${HOST}:${PORT}`);
  console.log(`Database: ${dbPath}`);
});
