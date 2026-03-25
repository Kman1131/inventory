import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db';
import type { Transaction, InventoryItem } from '../../types';

const router = Router();

// GET /transactions/:itemId — transaction history for an item
router.get('/:itemId', (req: Request, res: Response) => {
  try {
    const item = db.prepare('SELECT id FROM items WHERE id = ?').get(req.params.itemId);
    if (!item) {
      res.status(404).json({ success: false, error: 'Item not found' });
      return;
    }
    const transactions = db.prepare(
      'SELECT * FROM transactions WHERE item_id = ? ORDER BY created_at DESC'
    ).all(req.params.itemId) as Transaction[];
    res.json({ success: true, data: transactions });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// POST /transactions — record a stock transaction and update item quantity
router.post('/', (req: Request, res: Response) => {
  try {
    const { item_id, type, quantity_delta, notes, device_id, location_id } = req.body;

    if (!item_id || !type || quantity_delta === undefined) {
      res.status(400).json({ success: false, error: 'item_id, type, and quantity_delta are required' });
      return;
    }
    if (!['IN', 'OUT', 'ADJUSTMENT'].includes(type)) {
      res.status(400).json({ success: false, error: 'type must be IN, OUT, or ADJUSTMENT' });
      return;
    }

    const item = db.prepare('SELECT * FROM items WHERE id = ?').get(item_id) as InventoryItem | undefined;
    if (!item) {
      res.status(404).json({ success: false, error: 'Item not found' });
      return;
    }

    // Validate location exists if provided
    if (location_id) {
      const loc = db.prepare('SELECT id FROM locations WHERE id = ?').get(location_id);
      if (!loc) {
        res.status(400).json({ success: false, error: 'Location not found' });
        return;
      }
    }

    // When a location is specified, validate against per-location stock for OUT
    if (location_id && type === 'OUT') {
      const locRow = db.prepare('SELECT quantity FROM item_locations WHERE item_id = ? AND location_id = ?').get(item_id, location_id) as { quantity: number } | undefined;
      const locQty = locRow?.quantity ?? 0;
      if (locQty < Math.abs(quantity_delta)) {
        res.status(400).json({ success: false, error: `Insufficient stock at this location (${locQty} available)` });
        return;
      }
    } else if (!location_id) {
      // No location — validate against total quantity
      let newQuantity: number;
      if (type === 'IN') {
        newQuantity = item.quantity + Math.abs(quantity_delta);
      } else if (type === 'OUT') {
        newQuantity = item.quantity - Math.abs(quantity_delta);
      } else {
        newQuantity = item.quantity + quantity_delta;
      }
      if (newQuantity < 0) {
        res.status(400).json({ success: false, error: 'Transaction would result in negative stock' });
        return;
      }
    }

    // Use a transaction to atomically record + update
    const runTransaction = db.transaction(() => {
      const id = uuidv4();
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO transactions (id, item_id, type, quantity_delta, notes, device_id, location_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, item_id, type, quantity_delta, notes ?? null, device_id ?? null, location_id ?? null, now);

      if (location_id) {
        // Upsert item_locations row
        const absQty = Math.abs(quantity_delta);
        if (type === 'IN') {
          db.prepare(`
            INSERT INTO item_locations (id, item_id, location_id, quantity, updated_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(item_id, location_id) DO UPDATE SET quantity = quantity + excluded.quantity, updated_at = excluded.updated_at
          `).run(uuidv4(), item_id, location_id, absQty, now);
        } else if (type === 'OUT') {
          db.prepare(`
            UPDATE item_locations SET quantity = quantity - ?, updated_at = ? WHERE item_id = ? AND location_id = ?
          `).run(absQty, now, item_id, location_id);
        } else {
          // ADJUSTMENT: quantity_delta can be positive or negative
          db.prepare(`
            INSERT INTO item_locations (id, item_id, location_id, quantity, updated_at)
            VALUES (?, ?, ?, MAX(0, ?), ?)
            ON CONFLICT(item_id, location_id) DO UPDATE SET quantity = MAX(0, quantity + excluded.quantity), updated_at = excluded.updated_at
          `).run(uuidv4(), item_id, location_id, quantity_delta, now);
        }
        // Sync items.quantity = SUM of all item_locations for this item
        const sumRow = db.prepare('SELECT COALESCE(SUM(quantity), 0) AS total FROM item_locations WHERE item_id = ?').get(item_id) as { total: number };
        db.prepare('UPDATE items SET quantity = ?, updated_at = ? WHERE id = ?').run(sumRow.total, now, item_id);
      } else {
        // No location: direct update on items.quantity
        let newQuantity: number;
        if (type === 'IN') {
          newQuantity = item.quantity + Math.abs(quantity_delta);
        } else if (type === 'OUT') {
          newQuantity = item.quantity - Math.abs(quantity_delta);
        } else {
          newQuantity = item.quantity + quantity_delta;
        }
        db.prepare('UPDATE items SET quantity = ?, updated_at = ? WHERE id = ?').run(newQuantity, now, item_id);
      }

      return db.prepare('SELECT * FROM transactions WHERE id = ?').get(id) as Transaction;
    });

    const transaction = runTransaction();
    res.status(201).json({ success: true, data: transaction });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

export default router;
