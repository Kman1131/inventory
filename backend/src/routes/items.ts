import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import db from '../db';
import type { InventoryItem } from '../../types';

const router = Router();

async function generateQRCodeData(itemId: string): Promise<string> {
  const qrPayload = JSON.stringify({ id: itemId, action: 'view' });
  return QRCode.toDataURL(qrPayload);
}

// GET /items — list all items with joined category + location
router.get('/', (_req: Request, res: Response) => {
  try {
    const items = db.prepare(`
      SELECT
        items.*,
        categories.name AS category_name,
        locations.zone AS location_zone,
        locations.aisle AS location_aisle,
        locations.bin AS location_bin
      FROM items
      LEFT JOIN categories ON items.category_id = categories.id
      LEFT JOIN locations ON items.location_id = locations.id
      ORDER BY items.name ASC
    `).all() as InventoryItem[];
    res.json({ success: true, data: items });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// GET /items/low-stock — items below min_threshold
router.get('/low-stock', (_req: Request, res: Response) => {
  try {
    const items = db.prepare(`
      SELECT
        items.*,
        categories.name AS category_name,
        locations.zone AS location_zone,
        locations.aisle AS location_aisle,
        locations.bin AS location_bin
      FROM items
      LEFT JOIN categories ON items.category_id = categories.id
      LEFT JOIN locations ON items.location_id = locations.id
      WHERE items.quantity < items.min_threshold
      ORDER BY items.quantity ASC
    `).all() as InventoryItem[];
    res.json({ success: true, data: items });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// GET /items/:id — single item
router.get('/:id', (req: Request, res: Response) => {
  try {
    const item = db.prepare(`
      SELECT
        items.*,
        categories.name AS category_name,
        locations.zone AS location_zone,
        locations.aisle AS location_aisle,
        locations.bin AS location_bin
      FROM items
      LEFT JOIN categories ON items.category_id = categories.id
      LEFT JOIN locations ON items.location_id = locations.id
      WHERE items.id = ?
    `).get(req.params.id) as InventoryItem | undefined;

    if (!item) {
      res.status(404).json({ success: false, error: 'Item not found' });
      return;
    }
    res.json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// POST /items — create item
router.post('/', async (req: Request, res: Response) => {
  try {
    const { sku, name, description, quantity, min_threshold, price, category_id, location_id } = req.body;

    if (!sku || !name) {
      res.status(400).json({ success: false, error: 'sku and name are required' });
      return;
    }

    const id = uuidv4();
    const now = new Date().toISOString();
    const qr_code_data = await generateQRCodeData(id);

    db.prepare(`
      INSERT INTO items (id, sku, name, description, quantity, min_threshold, price, category_id, location_id, qr_code_data, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, sku, name,
      description ?? null,
      quantity ?? 0,
      min_threshold ?? 5,
      price ?? 0,
      category_id ?? null,
      location_id ?? null,
      qr_code_data,
      now, now
    );

    const item = db.prepare('SELECT * FROM items WHERE id = ?').get(id) as InventoryItem;
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.includes('UNIQUE constraint')) {
      res.status(409).json({ success: false, error: 'SKU already exists' });
    } else {
      res.status(500).json({ success: false, error: msg });
    }
  }
});

// PUT /items/:id — update item
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const existing = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id) as InventoryItem | undefined;
    if (!existing) {
      res.status(404).json({ success: false, error: 'Item not found' });
      return;
    }

    const { sku, name, description, min_threshold, price, category_id, location_id } = req.body;
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE items SET
        sku = ?,
        name = ?,
        description = ?,
        min_threshold = ?,
        price = ?,
        category_id = ?,
        location_id = ?,
        updated_at = ?
      WHERE id = ?
    `).run(
      sku ?? existing.sku,
      name ?? existing.name,
      description !== undefined ? description : existing.description,
      min_threshold ?? existing.min_threshold,
      price ?? existing.price,
      category_id !== undefined ? category_id : existing.category_id,
      location_id !== undefined ? location_id : existing.location_id,
      now,
      req.params.id
    );

    const updated = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id) as InventoryItem;
    res.json({ success: true, data: updated });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.includes('UNIQUE constraint')) {
      res.status(409).json({ success: false, error: 'SKU already exists' });
    } else {
      res.status(500).json({ success: false, error: msg });
    }
  }
});

// DELETE /items/:id
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const result = db.prepare('DELETE FROM items WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      res.status(404).json({ success: false, error: 'Item not found' });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

export default router;
