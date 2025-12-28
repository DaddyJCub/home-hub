# HomeHub SQLite migrations

## Overview
- Migrations are incremental and stored in code (see `server.js` `MIGRATIONS` array).
- A `schema_version` table tracks applied versions.
- Migrations are idempotent: rerunning simply skips versions already recorded.
- Production never resets data; dev-only resets have been removed.

## Adding a migration
1. Add a new entry to the `MIGRATIONS` array in `server.js` with:
   - `version` (integer, increment from the last)
   - `name` (short label)
   - `up` function that accepts the `database` instance and applies changes (wrap changes inside `transaction` via runner).
2. Keep changes backward-compatible and additive when possible. Avoid destructive changes; if needed, copy data into a new table/column and backfill.
3. Run the app; the migration runner will apply any missing versions and record them in `schema_version`.

## Backup/export
- Database lives at `/data/homehub.db` (configurable via `DATA_DIR`).
- To export all data (lightweight approach):
  - Stop the app or ensure WAL is checkpointed.
  - Copy `/data/homehub.db` (and `-shm`, `-wal` if present) to a safe location.
  - Or export via `sqlite3 /data/homehub.db ".backup '/data/homehub-backup.db'"`.
- To restore, replace the db file with the backup while the app is stopped.

## Notes
- Journaling uses WAL for durability.
- Foreign keys are currently off to support legacy local members; consider enabling once data is normalized.
- Never run resets in production.
