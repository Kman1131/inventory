import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db';

const router = Router();

interface TransferRow {
  id: string;
  item_id: string;
  from_location_id: string | null;
  to_location_id: string | null;
  quantity: number;
  notes: string | null;
  created_at: string;
  item_name?: string;
  item_sku?: string;
  from_zone?: string | null;
  from_aisle?: string | null;
  from_bin?: string | null;
  to_zone?: string | null;
  to_aisle?: string | null;
  to_bin?: string | null;
}

// GET /transfers — recent transfer history (limit 100)
router.get('/', (_req: Request, res: Response) => {
  try {
    const rows = db.prepare(`
      SELECT
        st.*,
        i.name AS item_name, i.sku AS item_sku,
        fl.zone AS from_zone, fl.aisle AS from_aisle, fl.bin AS from_bin,
        tl.zone AS to_zone, tl.aisle AS to_aisle, tl.bin AS to_bin
      FROM stock_transfers st
      JOIN items i ON st.item_id = i.id
      LEFT JOIN locations fl ON st.from_location_id = fl.id
      LEFT JOIN locations tl ON st.to_location_id = tl.id
      ORDER BY st.created_at DESC
      LIMIT 100
    `).all() as TransferRow[];
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// GET /transfers/item/:itemId — transfer history for one item
router.get('/item/:itemId', (req: Request, res: Response) => {
  try {
    const rows = db.prepare(`
      SELECT
        st.*,
        i.name AS item_name, i.sku AS item_sku,
        fl.zone AS from_zone, fl.aisle AS from_aisle, fl.bin AS from_bin,
        tl.zone AS to_zone, tl.aisle AS to_aisle, tl.bin AS to_bin
      FROM stock_transfers st
      JOIN items i ON st.item_id = i.id
      LEFT JOIN locations fl ON st.from_location_id = fl.id
      LEFT JOIN locations tl ON st.to_location_id = tl.id
      WHERE st.item_id = ?
      ORDER BY st.created_at DESC
    `).all(req.params.itemId) as TransferRow[];
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// POST /transfers — execute a stock transfer
// Body: { item_id, from_location_id, to_location_id, quantity, notes? }
router.post('/', (req: Request, res: Response) => {
  try {
    const { item_id, from_location_id, to_location_id, quantity, notes } = req.body;

    if (!item_id || !from_location_id || !to_location_id || !quantity) {
      res.status(400).json({
        success: false,
        error: 'item_id, from_location_id, to_location_id, and quantity are required',
      });
      return;
    }

    if (from_location_id === to_location_id) {
      res.status(400).json({ success: false, error: 'Source and destination locations must differ' });
      return;
    }

    const qty = parseInt(quantity);
    if (isNaN(qty) || qty <= 0) {
      res.status(400).json({ success: false, error: 'Quantity must be a positive integer' });
      return;
    }

    // Validate item exists
    const item = db.prepare('SELECT id FROM items WHERE id = ?').get(item_id);
    if (!item) { res.status(404).json({ success: false, error: 'Item not found' }); return; }

    // Validate locations exist
    const fromLoc = db.prepare('SELECT id FROM locations WHERE id = ?').get(from_location_id);
    if (!fromLoc) { res.status(404).json({ success: false, error: 'Source location not found' }); return; }

    const toLoc = db.prepare('SELECT id FROM locations WHERE id = ?').get(to_location_id);
    if (!toLoc) { res.status(404).json({ success: false, error: 'Destination location not found' }); return; }

    // Check available quantity at source
    const fromRow = db.prepare(
      'SELECT quantity FROM item_locations WHERE item_id = ? AND location_id = ?'
    ).get(item_id, from_location_id) as { quantity: number } | undefined;

    if (!fromRow || fromRow.quantity < qty) {
      res.status(400).json({
        success: false,
        error: `Insufficient stock at source location (available: ${fromRow?.quantity ?? 0})`,
      });
      return;
    }

    const now = new Date().toISOString();

    const runTransfer = db.transaction(() => {
      // Deduct from source
      const newFromQty = fromRow.quantity - qty;
      if (newFromQty === 0) {
        db.prepare(
          'DELETE FROM item_locations WHERE item_id = ? AND location_id = ?'
        ).run(item_id, from_location_id);
      } else {
        db.prepare(
          'UPDATE item_locations SET quantity = ?, updated_at = ? WHERE item_id = ? AND location_id = ?'
        ).run(newFromQty, now, item_id, from_location_id);
      }

      // Add to destination (upsert)
      const toRow = db.prepare(
        'SELECT id, quantity FROM item_locations WHERE item_id = ? AND location_id = ?'
      ).get(item_id, to_location_id) as { id: string; quantity: number } | undefined;

      if (toRow) {
        db.prepare(
          'UPDATE item_locations SET quantity = ?, updated_at = ? WHERE item_id = ? AND location_id = ?'
        ).run(toRow.quantity + qty, now, item_id, to_location_id);
      } else {
        db.prepare(
          'INSERT INTO item_locations (id, item_id, location_id, quantity, updated_at) VALUES (?,?,?,?,?)'
        ).run(uuidv4(), item_id, to_location_id, qty, now);
      }

      // Update total quantity on items (sum of all locations)
      const totals = db.prepare(
        'SELECT COALESCE(SUM(quantity),0) AS total FROM item_locations WHERE item_id = ?'
      ).get(item_id) as { total: number };
      db.prepare('UPDATE items SET quantity = ?, updated_at = ? WHERE id = ?').run(
        totals.total, now, item_id
      );

      // Record the transfer log
      const transferId = uuidv4();
      db.prepare(`
        INSERT INTO stock_transfers (id, item_id, from_location_id, to_location_id, quantity, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(transferId, item_id, from_location_id, to_location_id, qty, notes ?? null, now);

      return transferId;
    });

    const transferId = runTransfer();

    const transfer = db.prepare(`
      SELECT
        st.*,
        i.name AS item_name, i.sku AS item_sku,
        fl.zone AS from_zone, fl.aisle AS from_aisle, fl.bin AS from_bin,
        tl.zone AS to_zone, tl.aisle AS to_aisle, tl.bin AS to_bin
      FROM stock_transfers st
      JOIN items i ON st.item_id = i.id
      LEFT JOIN locations fl ON st.from_location_id = fl.id
      LEFT JOIN locations tl ON st.to_location_id = tl.id
      WHERE st.id = ?
    `).get(transferId) as TransferRow;

    res.status(201).json({ success: true, data: transfer });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

export default router;
