import { Router, Request, Response } from 'express';
import db from '../db';
import { generateStockReport } from '../utils/reportGen';
import type { InventoryItem } from '../../types';

const router = Router();

function escapeHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// GET /reports/labels?ids=id1,id2 OR ?all=1 — printable QR label sheet
router.get('/labels', async (req: Request, res: Response) => {
  try {
    const { ids, all } = req.query;
    let items: InventoryItem[];

    if (all) {
      items = db.prepare(`
        SELECT items.*, locations.zone AS location_zone, locations.aisle AS location_aisle, locations.bin AS location_bin
        FROM items LEFT JOIN locations ON items.location_id = locations.id
        ORDER BY items.name ASC
      `).all() as InventoryItem[];
    } else if (ids) {
      const idList = String(ids).split(',').map(s => s.trim()).filter(Boolean);
      if (idList.length === 0) {
        res.status(400).json({ success: false, error: 'No item IDs provided' }); return;
      }
      const ph = idList.map(() => '?').join(',');
      items = db.prepare(`
        SELECT items.*, locations.zone AS location_zone, locations.aisle AS location_aisle, locations.bin AS location_bin
        FROM items LEFT JOIN locations ON items.location_id = locations.id
        WHERE items.id IN (${ph})
        ORDER BY items.name ASC
      `).all(...idList) as InventoryItem[];
    } else {
      res.status(400).json({ success: false, error: 'Provide ?ids=id1,id2 or ?all=1' }); return;
    }

    const labelsHtml = items.map(item => {
      const loc = [item.location_zone, item.location_aisle, item.location_bin].filter(Boolean).join(' › ');
      return `<div class="label">
  <div class="top">
    <div><div class="sku">${escapeHtml(item.sku)}</div><div class="name">${escapeHtml(item.name)}</div>${loc ? `<div class="loc">📍 ${escapeHtml(loc)}</div>` : ''}<div class="qty">Qty: ${item.quantity}</div></div>
    ${item.qr_code_data ? `<img src="${item.qr_code_data}" class="qr" />` : ''}
  </div>
</div>`;
    }).join('\n');

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Labels (${items.length})</title><style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: Arial, sans-serif; background: #fff; }
.toolbar { padding: 10px 16px; background: #f0f0f0; display: flex; align-items: center; gap: 12px; border-bottom: 1px solid #ddd; }
.toolbar button { padding: 7px 18px; background: #1a237e; color: #fff; border: none; border-radius: 6px; font-size: 14px; cursor: pointer; }
.toolbar span { font-size: 13px; color: #555; }
.labels { display: flex; flex-wrap: wrap; gap: 8px; padding: 16px; }
.label { width: 90mm; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; page-break-inside: avoid; }
.top { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
.sku { font-size: 9px; color: #888; font-family: monospace; margin-bottom: 2px; }
.name { font-size: 13px; font-weight: 700; color: #111; line-height: 1.2; margin-bottom: 3px; }
.loc { font-size: 9px; color: #555; margin-bottom: 2px; }
.qty { font-size: 10px; color: #374151; }
.qr { width: 36mm; height: 36mm; object-fit: contain; flex-shrink: 0; }
@media print { .toolbar { display: none; } body { margin: 0; } .labels { padding: 5mm; gap: 5mm; } }
</style></head><body>
<div class="toolbar"><button onclick="window.print()">🖨 Print Labels</button><span>${items.length} label${items.length !== 1 ? 's' : ''}</span></div>
<div class="labels">${labelsHtml}</div></body></html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// GET /reports/stock — stream PDF stock report
router.get('/stock', async (_req: Request, res: Response) => {
  try {
    await generateStockReport(res);
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: (err as Error).message });
    }
  }
});

export default router;
