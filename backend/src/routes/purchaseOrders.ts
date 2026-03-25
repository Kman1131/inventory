import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db';
import type { PurchaseOrder, PurchaseOrderItem, InventoryItem } from '../../types';
import { generatePOPdf, sendPOEmail } from '../utils/poGen';

const router = Router();

function getSmtpConfig(): { host: string; port: number; user: string; pass: string; from: string } | null {
  const rows = db.prepare("SELECT key, value FROM app_settings WHERE key LIKE 'smtp_%'").all() as { key: string; value: string }[];
  const cfg = Object.fromEntries(rows.map(r => [r.key, r.value]));
  if (!cfg.smtp_user || !cfg.smtp_pass) return null;
  return {
    host: cfg.smtp_host || 'smtp.gmail.com',
    port: parseInt(cfg.smtp_port || '587'),
    user: cfg.smtp_user,
    pass: cfg.smtp_pass,
    from: cfg.smtp_from || cfg.smtp_user,
  };
}

function getNextPoNumber(): string {
  const row = db.prepare('SELECT COUNT(*) as count FROM purchase_orders').get() as { count: number };
  const year = new Date().getFullYear();
  return `PO-${year}-${String(row.count + 1).padStart(4, '0')}`;
}

// GET /purchase-orders
router.get('/', (_req: Request, res: Response) => {
  try {
    const pos = db.prepare(`
      SELECT po.*, s.name as supplier_name, s.email as supplier_email
      FROM purchase_orders po
      LEFT JOIN suppliers s ON po.supplier_id = s.id
      ORDER BY po.created_at DESC
    `).all() as PurchaseOrder[];

    for (const po of pos) {
      (po as any).items = db.prepare(
        'SELECT * FROM purchase_order_items WHERE purchase_order_id = ? ORDER BY name ASC'
      ).all(po.id) as PurchaseOrderItem[];
    }

    res.json({ success: true, data: pos });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// GET /purchase-orders/:id
router.get('/:id', (req: Request, res: Response) => {
  try {
    const po = db.prepare(`
      SELECT po.*, s.name as supplier_name, s.email as supplier_email
      FROM purchase_orders po
      LEFT JOIN suppliers s ON po.supplier_id = s.id
      WHERE po.id = ?
    `).get(req.params.id) as PurchaseOrder | undefined;

    if (!po) {
      res.status(404).json({ success: false, error: 'Purchase order not found' });
      return;
    }

    (po as any).items = db.prepare(
      'SELECT * FROM purchase_order_items WHERE purchase_order_id = ? ORDER BY name ASC'
    ).all(po.id) as PurchaseOrderItem[];

    res.json({ success: true, data: po });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// POST /purchase-orders — create manually
router.post('/', (req: Request, res: Response) => {
  try {
    const { supplier_id, notes, items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, error: 'items array is required and must not be empty' });
      return;
    }

    const id = uuidv4();
    const now = new Date().toISOString();
    const poNumber = getNextPoNumber();

    const create = db.transaction(() => {
      db.prepare(`
        INSERT INTO purchase_orders (id, po_number, supplier_id, status, notes, created_at, updated_at)
        VALUES (?, ?, ?, 'draft', ?, ?, ?)
      `).run(id, poNumber, supplier_id ?? null, notes ?? null, now, now);

      for (const item of items) {
        db.prepare(`
          INSERT INTO purchase_order_items (id, purchase_order_id, item_id, sku, name, quantity_ordered, unit_price, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          uuidv4(), id,
          item.item_id ?? null,
          item.sku,
          item.name,
          item.quantity_ordered,
          item.unit_price ?? 0,
          now
        );
      }
    });

    create();

    const po = db.prepare(`
      SELECT po.*, s.name as supplier_name, s.email as supplier_email
      FROM purchase_orders po LEFT JOIN suppliers s ON po.supplier_id = s.id
      WHERE po.id = ?
    `).get(id) as PurchaseOrder;

    (po as any).items = db.prepare(
      'SELECT * FROM purchase_order_items WHERE purchase_order_id = ?'
    ).all(id) as PurchaseOrderItem[];

    res.status(201).json({ success: true, data: po });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// POST /purchase-orders/auto-generate — generate from low-stock items
router.post('/auto-generate', (_req: Request, res: Response) => {
  try {
    const lowStockItems = db.prepare(`
      SELECT items.*, suppliers.name as supplier_name
      FROM items
      LEFT JOIN suppliers ON items.supplier_id = suppliers.id
      WHERE items.quantity < items.min_threshold
      ORDER BY items.supplier_id, items.name ASC
    `).all() as (InventoryItem & { supplier_name?: string })[];

    if (lowStockItems.length === 0) {
      res.json({ success: true, data: [], message: 'No low-stock items found' });
      return;
    }

    // Group items by supplier_id (null = unassigned)
    const groups = new Map<string | null, typeof lowStockItems>();
    for (const item of lowStockItems) {
      const key = (item as any).supplier_id as string | null ?? null;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(item);
    }

    const createdPOs: PurchaseOrder[] = [];
    const now = new Date().toISOString();

    const createAll = db.transaction(() => {
      for (const [supplierId, items] of groups) {
        const id = uuidv4();
        const poNumber = getNextPoNumber();
        const noteTxt = items.map(i => `${i.sku} (have ${i.quantity}, need ${i.min_threshold})`).join('; ');

        db.prepare(`
          INSERT INTO purchase_orders (id, po_number, supplier_id, status, notes, created_at, updated_at)
          VALUES (?, ?, ?, 'draft', ?, ?, ?)
        `).run(id, poNumber, supplierId, `Auto-generated. Low stock: ${noteTxt}`, now, now);

        for (const item of items) {
          const qty = (item as any).order_qty ?? Math.max(item.min_threshold - item.quantity + 10, 10);
          db.prepare(`
            INSERT INTO purchase_order_items (id, purchase_order_id, item_id, sku, name, quantity_ordered, unit_price, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).run(uuidv4(), id, item.id, item.sku, item.name, qty, item.price, now);
        }

        const po = db.prepare(`
          SELECT po.*, s.name as supplier_name, s.email as supplier_email
          FROM purchase_orders po LEFT JOIN suppliers s ON po.supplier_id = s.id
          WHERE po.id = ?
        `).get(id) as PurchaseOrder;

        (po as any).items = db.prepare(
          'SELECT * FROM purchase_order_items WHERE purchase_order_id = ?'
        ).all(id) as PurchaseOrderItem[];

        createdPOs.push(po);
      }
    });

    createAll();
    res.status(201).json({ success: true, data: createdPOs });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// PUT /purchase-orders/:id — update status / notes
router.put('/:id', (req: Request, res: Response) => {
  try {
    const existing = db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(req.params.id) as PurchaseOrder | undefined;
    if (!existing) {
      res.status(404).json({ success: false, error: 'Purchase order not found' });
      return;
    }
    const { status, notes, supplier_id } = req.body;
    const validStatuses = ['draft', 'sent', 'received', 'cancelled'];
    if (status && !validStatuses.includes(status)) {
      res.status(400).json({ success: false, error: `status must be one of: ${validStatuses.join(', ')}` });
      return;
    }
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE purchase_orders SET status = ?, notes = ?, supplier_id = ?, updated_at = ? WHERE id = ?
    `).run(
      status ?? existing.status,
      notes !== undefined ? notes : existing.notes,
      supplier_id !== undefined ? supplier_id : existing.supplier_id,
      now,
      req.params.id
    );
    const updated = db.prepare(`
      SELECT po.*, s.name as supplier_name, s.email as supplier_email
      FROM purchase_orders po LEFT JOIN suppliers s ON po.supplier_id = s.id
      WHERE po.id = ?
    `).get(req.params.id) as PurchaseOrder;
    (updated as any).items = db.prepare(
      'SELECT * FROM purchase_order_items WHERE purchase_order_id = ?'
    ).all(req.params.id) as PurchaseOrderItem[];
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// GET /purchase-orders/:id/pdf — download PDF
router.get('/:id/pdf', async (req: Request, res: Response) => {
  try {
    const po = db.prepare(`
      SELECT po.*, s.name as supplier_name, s.email as supplier_email,
             s.contact_name, s.phone, s.address
      FROM purchase_orders po
      LEFT JOIN suppliers s ON po.supplier_id = s.id
      WHERE po.id = ?
    `).get(req.params.id) as (PurchaseOrder & { contact_name?: string; phone?: string; address?: string }) | undefined;

    if (!po) {
      res.status(404).json({ success: false, error: 'Purchase order not found' });
      return;
    }

    const items = db.prepare(
      'SELECT * FROM purchase_order_items WHERE purchase_order_id = ? ORDER BY name ASC'
    ).all(req.params.id) as PurchaseOrderItem[];

    const supplier = {
      name: (po as any).supplier_name ?? 'Unknown Supplier',
      contact_name: (po as any).contact_name ?? null,
      email: (po as any).supplier_email ?? null,
      phone: (po as any).phone ?? null,
      address: (po as any).address ?? null,
    };

    const pdfBuffer = await generatePOPdf(po, supplier, items);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="PO-${po.po_number}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// POST /purchase-orders/:id/send-email
router.post('/:id/send-email', async (req: Request, res: Response) => {
  try {
    const po = db.prepare(`
      SELECT po.*, s.name as supplier_name, s.email as supplier_email,
             s.contact_name, s.phone, s.address
      FROM purchase_orders po
      LEFT JOIN suppliers s ON po.supplier_id = s.id
      WHERE po.id = ?
    `).get(req.params.id) as (PurchaseOrder & { contact_name?: string; phone?: string; address?: string }) | undefined;

    if (!po) {
      res.status(404).json({ success: false, error: 'Purchase order not found' });
      return;
    }

    const supplierEmail = (po as any).supplier_email as string | undefined;
    if (!supplierEmail) {
      res.status(400).json({ success: false, error: 'Supplier has no email address configured' });
      return;
    }

    const smtp = getSmtpConfig();
    if (!smtp) {
      res.status(400).json({ success: false, error: 'SMTP not configured. Set smtp_user and smtp_pass in Settings.' });
      return;
    }

    const items = db.prepare(
      'SELECT * FROM purchase_order_items WHERE purchase_order_id = ? ORDER BY name ASC'
    ).all(req.params.id) as PurchaseOrderItem[];

    const supplier = {
      name: (po as any).supplier_name ?? 'Unknown Supplier',
      contact_name: (po as any).contact_name ?? null,
      email: supplierEmail,
      phone: (po as any).phone ?? null,
      address: (po as any).address ?? null,
    };

    const pdfBuffer = await generatePOPdf(po, supplier, items);
    await sendPOEmail(smtp, supplierEmail, po.po_number, pdfBuffer);

    const now = new Date().toISOString();
    db.prepare("UPDATE purchase_orders SET status = 'sent', updated_at = ? WHERE id = ?").run(now, req.params.id);

    res.json({ success: true, data: { message: `Purchase order ${po.po_number} sent to ${supplierEmail}` } });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// POST /purchase-orders/:id/receive — receive all items, create IN transactions
router.post('/:id/receive', (req: Request, res: Response) => {
  try {
    const po = db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(req.params.id) as PurchaseOrder | undefined;
    if (!po) {
      res.status(404).json({ success: false, error: 'Purchase order not found' }); return;
    }
    if (po.status === 'received') {
      res.status(400).json({ success: false, error: 'Purchase order already received' }); return;
    }
    if (po.status === 'cancelled') {
      res.status(400).json({ success: false, error: 'Cannot receive a cancelled purchase order' }); return;
    }

    const poItems = db.prepare(
      'SELECT * FROM purchase_order_items WHERE purchase_order_id = ?'
    ).all(req.params.id) as PurchaseOrderItem[];

    const now = new Date().toISOString();
    const deviceId = (req.body?.device_id as string) ?? 'web';

    const receiveAll = db.transaction(() => {
      let count = 0;
      for (const poItem of poItems) {
        if (!poItem.item_id) continue;
        const invItem = db.prepare('SELECT * FROM items WHERE id = ?').get(poItem.item_id) as InventoryItem | undefined;
        if (!invItem) continue;
        const newQty = invItem.quantity + poItem.quantity_ordered;
        const txId = uuidv4();
        db.prepare(`
          INSERT INTO transactions (id, item_id, type, quantity_delta, notes, device_id, created_at)
          VALUES (?, ?, 'IN', ?, ?, ?, ?)
        `).run(txId, poItem.item_id, poItem.quantity_ordered, `Received from PO ${po.po_number}`, deviceId, now);
        db.prepare('UPDATE items SET quantity = ?, updated_at = ? WHERE id = ?').run(newQty, now, poItem.item_id);
        count++;
      }
      db.prepare("UPDATE purchase_orders SET status = 'received', updated_at = ? WHERE id = ?").run(now, req.params.id);
      return count;
    });

    const txCount = receiveAll();
    const updated = db.prepare(`
      SELECT po.*, s.name as supplier_name, s.email as supplier_email
      FROM purchase_orders po LEFT JOIN suppliers s ON po.supplier_id = s.id
      WHERE po.id = ?
    `).get(req.params.id) as PurchaseOrder;
    (updated as any).items = poItems;
    res.json({ success: true, data: { po: updated, transactions_created: txCount } });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// DELETE /purchase-orders/:id
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const result = db.prepare('DELETE FROM purchase_orders WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      res.status(404).json({ success: false, error: 'Purchase order not found' });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

export default router;
