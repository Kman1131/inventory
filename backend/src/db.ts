import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.join(__dirname, '..', '..', 'inventory.db');

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    parent_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS locations (
    id TEXT PRIMARY KEY,
    zone TEXT NOT NULL,
    aisle TEXT,
    bin TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY,
    sku TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    quantity INTEGER NOT NULL DEFAULT 0,
    min_threshold INTEGER NOT NULL DEFAULT 5,
    price REAL NOT NULL DEFAULT 0,
    category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
    location_id TEXT REFERENCES locations(id) ON DELETE SET NULL,
    qr_code_data TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK(type IN ('IN','OUT','ADJUSTMENT')),
    quantity_delta INTEGER NOT NULL,
    notes TEXT,
    device_id TEXT,
    created_at TEXT NOT NULL
  );
`);

export default db;
