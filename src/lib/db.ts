import Database from 'better-sqlite3'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const SCHEMA = `
CREATE TABLE IF NOT EXISTS categories (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
CREATE TABLE IF NOT EXISTS bookmarks (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  type        TEXT NOT NULL CHECK (type IN ('file','link')),
  title       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  url         TEXT,
  file_name   TEXT,
  slug        TEXT UNIQUE,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_bookmarks_category ON bookmarks(category_id);
`

let db: Database.Database | null = null

/** 惰性单例：首次调用读取 DATA_DIR（默认 ./data），建目录、建库、建表 */
export function getDb(): Database.Database {
  if (db) return db
  const dataDir = process.env.DATA_DIR || './data'
  mkdirSync(dataDir, { recursive: true })
  db = new Database(join(dataDir, 'html-list.db'))
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.exec(SCHEMA)
  return db
}

/** 关闭单例（仅测试用） */
export function closeDb(): void {
  if (db) {
    db.close()
    db = null
  }
}
