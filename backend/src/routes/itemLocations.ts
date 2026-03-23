import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db';

const router = Router();

interface ItemLocationRow {
  id: string;
  item_id: string;
  location_id: string;
  quantity: number;
  updated_at: string;
  zone?: string;
  aisle?: string | null;
  bin?: string | null;
}

interface StockTransfer {
  id: string;
  item_id: string;
  from_location_id: string | null;
  to_location_id: string | null;
  quantity: number;
  notes: string | null;
  created_at: string;
  from_zone?: string | null;
  from_aisle?: string | null;
  from_bin?: string | null;
  to_zone?: string | null;
  to_aisle?: string | null;
  to_bin?: string | null;
}

// GET /item-locations/:itemId — list all locations with their quantities for an item
router.get('/:itemId', (req: Request, res: Response) => {
  try {
    const rows = db.prepare(`
      SELECT
        il.id, il.item_id, il.location_id, il.quantity, il.updated_at,
        l.zone, l.aisle, l.bin
      FROM item_locations il
      JOIN locations l ON il.location_id = l.id
      WHERE il.item_id = ?
      ORDER BY l.zone, l.aisle, l.bin
    `).all(req.params.itemId) as ItemLocationRow[];
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// PUT /item-locations/:itemId — set (upsert) quantity at a specific location
// Body: { location_id, quantity }
router.put('/:itemId', (req: Request, res: Response) => {
  try {
    const { location_id, quantity } = req.body;
    if (!location_id || quantity === undefined) {
      res.status(400).json({ success: false, error: 'location_id and quantity are required' });
      return;
    }
    if (quantity < 0) {
      res.status(400).json({ success: false, error: 'Quantity cannot be negative' });
      return;
    }

    const item = db.prepare('SELECT id FROM items WHERE id = ?').get(req.params.itemId);
    if (!item) { res.status(404).json({ success: false, error: 'Item not found' }); return; }

    const loc = db.prepare('SELECT id FROM locations WHERE id = ?').get(location_id);
    if (!loc) { res.status(404).json({ success: false, error: 'Location not found' }); return; }

    const now = new Date().toISOString();

    const run = db.transaction(() => {
      const existing = db.prepare(
        'SELECT id FROM item_locations WHERE item_id = ? AND location_id = ?'
      ).get(req.params.itemId, location_id);

      if (existing) {
        db.prepare(
          'UPDATE item_locations SET quantity = ?, updated_at = ? WHERE item_id = ? AND location_id = ?'
        ).run(quantity, now, req.params.itemId, location_id);
      } else {
        db.prepare(
          'INSERT INTO item_locations (id, item_id, location_id, quantity, updated_at) VALUES (?,?,?,?,?)'
        ).run(uuidv4(), req.params.itemId, location_id, quantity, now);
      }

      // Keep items.quantity in sync with total across all locations
      const totals = db.prepare(
        'SELECT COALESCE(SUM(quantity),0) AS total FROM item_locations WHERE item_id = ?'
      ).get(req.params.itemId) as { total: number };
      db.prepare('UPDATE items SET quantity = ?, updated_at = ? WHERE id = ?').run(
        totals.total, now, req.params.itemId
      );
    });
    run();

    const row = db.prepare(`
      SELECT il.*, l.zone, l.aisle, l.bin
      FROM item_locations il JOIN locations l ON il.location_id = l.id
      WHERE il.item_id = ? AND il.location_id = ?
    `).get(req.params.itemId, location_id);

    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

export default router;
