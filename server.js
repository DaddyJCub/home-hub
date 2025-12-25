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
// Return 404 for non-existent keys so Spark uses the default value
app.get('/_spark/kv/:key', (req, res) => {
  const { key } = req.params;
  try {
    const row = db.prepare('SELECT value FROM kv_store WHERE key = ?').get(key);
    if (row) {
      res.json(JSON.parse(row.value));
    } else {
      // Return 404 so the Spark hook uses its default value
      res.status(404).send('');
    }
  } catch (err) {
    console.error(`Error getting key ${key}:`, err);
    res.status(500).json({ error: 'Failed to read' });
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

// KV Store API - DELETE (for clearing data in settings)
app.delete('/_spark/kv/:key', (req, res) => {
  const { key } = req.params;
  try {
    db.prepare('DELETE FROM kv_store WHERE key = ?').run(key);
    res.json({ success: true });
  } catch (err) {
    console.error(`Error deleting key ${key}:`, err);
    res.status(500).json({ error: 'Failed to delete' });
  }
});

// Spark loaded endpoint (required by the app)
app.post('/_spark/loaded', (req, res) => {
  res.json({ success: true });
});

// Spark LLM endpoint - stub that returns an error (feature not available in standalone mode)
app.post('/_spark/llm', (req, res) => {
  res.status(501).json({ 
    error: 'LLM feature not available in standalone mode. This requires the GitHub Spark platform.' 
  });
});

// Spark user endpoint - stub (not needed for this app)
app.get('/_spark/user', (req, res) => {
  res.json(null);
});

// SPA fallback - serve index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`HomeHub server running at http://${HOST}:${PORT}`);
  console.log(`Database: ${dbPath}`);
});
