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
    const { item_id, type, quantity_delta, notes, device_id } = req.body;

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

    // Calculate new quantity based on transaction type
    let newQuantity: number;
    if (type === 'IN') {
      newQuantity = item.quantity + Math.abs(quantity_delta);
    } else if (type === 'OUT') {
      newQuantity = item.quantity - Math.abs(quantity_delta);
    } else {
      // ADJUSTMENT: quantity_delta can be positive or negative
      newQuantity = item.quantity + quantity_delta;
    }

    if (newQuantity < 0) {
      res.status(400).json({ success: false, error: 'Transaction would result in negative stock' });
      return;
    }

    // Use a transaction to atomically record + update
    const runTransaction = db.transaction(() => {
      const id = uuidv4();
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO transactions (id, item_id, type, quantity_delta, notes, device_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(id, item_id, type, quantity_delta, notes ?? null, device_id ?? null, now);

      db.prepare('UPDATE items SET quantity = ?, updated_at = ? WHERE id = ?').run(newQuantity, now, item_id);

      return db.prepare('SELECT * FROM transactions WHERE id = ?').get(id) as Transaction;
    });

    const transaction = runTransaction();
    res.status(201).json({ success: true, data: transaction });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

export default router;
