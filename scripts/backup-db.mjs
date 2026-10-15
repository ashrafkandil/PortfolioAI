/**
 * Snapshot the portfolio database with `VACUUM INTO`.
 *
 * Because the site reads a single durable file, that file is the one thing worth
 * backing up. `VACUUM INTO` writes a consistent, compact copy while the server
 * keeps running (safe alongside WAL), so this can be cronned without downtime.
 *
 * Honors DB_PATH exactly like server/db.js, otherwise uses server/data/portfolio.db.
 * Copies land in a `backups` folder next to the database and are timestamped.
 *
 * Usage: npm run db:backup
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.join(__dirname, '..', 'server', 'data', 'portfolio.db');

if (!fs.existsSync(dbPath)) {
  console.error(`No database found at ${dbPath}. (Run "npm run seed" first.)`);
  process.exit(1);
}

const backupDir = path.join(path.dirname(dbPath), 'backups');
fs.mkdirSync(backupDir, { recursive: true });

// e.g. portfolio-2026-10-12T14-30-05.db - filesystem-safe, sortable.
const stamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+$/, '');
const target = path.join(backupDir, `portfolio-${stamp}.db`);

// VACUUM INTO fails if the destination exists, so make sure it does not.
if (fs.existsSync(target)) fs.rmSync(target);

const db = new DatabaseSync(dbPath, { readOnly: true });
try {
  db.exec(`VACUUM INTO '${target.replace(/'/g, "''")}';`);
} finally {
  db.close();
}

const { size } = fs.statSync(target);
console.log(`Backed up ${dbPath}\n        -> ${target} (${(size / 1024).toFixed(1)} KB)`);