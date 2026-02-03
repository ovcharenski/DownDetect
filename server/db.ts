import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "@shared/schema";
import { existsSync, mkdirSync } from "fs";
import { dirname } from "path";

const DB_PATH = "./data/system.db";

// Ensure the data directory exists
const dataDir = dirname(DB_PATH);
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

export const sqlite = new Database(DB_PATH);
// Enable FOREIGN KEY constraints (disabled by default in SQLite)
sqlite.pragma("foreign_keys = ON");
export const db = drizzle(sqlite, { schema });

// Initialize tables if they don't exist
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS apps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    internal_name TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    base_url TEXT NOT NULL,
    is_active INTEGER DEFAULT 1 NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
    updated_at INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL
  );

  CREATE TABLE IF NOT EXISTS status_checks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    app_id INTEGER NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    version TEXT,
    response_time INTEGER,
    status_code INTEGER,
    error_message TEXT,
    checked_at INTEGER DEFAULT (unixepoch()) NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_status_checks_app_checked ON status_checks(app_id, checked_at);
  CREATE INDEX IF NOT EXISTS idx_status_checks_checked ON status_checks(checked_at);
`);
