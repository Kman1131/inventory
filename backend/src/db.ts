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
    parent_id TEXT REFERENCES locations(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS suppliers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    contact_name TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
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
    supplier_id TEXT REFERENCES suppliers(id) ON DELETE SET NULL,
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

  CREATE TABLE IF NOT EXISTS purchase_orders (
    id TEXT PRIMARY KEY,
    po_number TEXT NOT NULL UNIQUE,
    supplier_id TEXT REFERENCES suppliers(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','sent','received','cancelled')),
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS purchase_order_items (
    id TEXT PRIMARY KEY,
    purchase_order_id TEXT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    item_id TEXT REFERENCES items(id) ON DELETE SET NULL,
    sku TEXT NOT NULL,
    name TEXT NOT NULL,
    quantity_ordered INTEGER NOT NULL,
    unit_price REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS item_locations (
    id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    location_id TEXT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL,
    UNIQUE(item_id, location_id)
  );

  CREATE TABLE IF NOT EXISTS stock_transfers (
    id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    from_location_id TEXT REFERENCES locations(id) ON DELETE SET NULL,
    to_location_id TEXT REFERENCES locations(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL,
    notes TEXT,
    created_at TEXT NOT NULL
  );
`);

// Migration: add supplier_id to items if upgrading from older schema
const itemCols = db.prepare('PRAGMA table_info(items)').all() as { name: string }[];
if (!itemCols.find(c => c.name === 'supplier_id')) {
  db.exec('ALTER TABLE items ADD COLUMN supplier_id TEXT REFERENCES suppliers(id) ON DELETE SET NULL');
}

// Migration: add parent_id to locations if upgrading from older schema
const locCols = db.prepare('PRAGMA table_info(locations)').all() as { name: string }[];
if (!locCols.find(c => c.name === 'parent_id')) {
  db.exec('ALTER TABLE locations ADD COLUMN parent_id TEXT REFERENCES locations(id) ON DELETE SET NULL');
}

// Migration: seed item_locations from items.location_id where not already seeded
const seedItemLocations = db.transaction(() => {
  const items = db.prepare(
    'SELECT id, location_id, quantity FROM items WHERE location_id IS NOT NULL'
  ).all() as { id: string; location_id: string; quantity: number }[];

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO item_locations (id, item_id, location_id, quantity, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  const now = new Date().toISOString();
  for (const item of items) {
    const existing = db.prepare(
      'SELECT id FROM item_locations WHERE item_id = ? AND location_id = ?'
    ).get(item.id, item.location_id);
    if (!existing) {
      const { v4: uuidv4 } = require('uuid');
      stmt.run(uuidv4(), item.id, item.location_id, item.quantity, now);
    }
  }
});
seedItemLocations();

export default db;
