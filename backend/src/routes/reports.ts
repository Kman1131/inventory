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

interface ReplenRow {
  item_name: string;
  item_sku: string;
  item_id: string;
  location_id: string;
  zone: string | null;
  aisle: string | null;
  bin: string | null;
  is_primary: number;
  current_qty: number;
  min_qty: number;
  primary_zone: string | null;
  primary_aisle: string | null;
  primary_bin: string | null;
}

// GET /reports/replenishment?location_id=xxx  — printable per-location replenishment instructions
// Shows items at a location where current qty < min_qty, with recommended transfer from primary
router.get('/replenishment', (req: Request, res: Response) => {
  try {
    const { location_id } = req.query;

    let rows: ReplenRow[];
    if (location_id) {
      rows = db.prepare(`
        SELECT
          i.name AS item_name, i.sku AS item_sku, i.id AS item_id,
          il.location_id,
          l.zone, l.aisle, l.bin,
          (i.location_id = il.location_id) AS is_primary,
          il.quantity AS current_qty,
          il.min_qty,
          pl.zone AS primary_zone, pl.aisle AS primary_aisle, pl.bin AS primary_bin
        FROM item_locations il
        JOIN items i ON il.item_id = i.id
        JOIN locations l ON il.location_id = l.id
        LEFT JOIN locations pl ON i.location_id = pl.id
        WHERE il.location_id = ? AND il.min_qty > 0 AND il.quantity < il.min_qty
        ORDER BY i.name ASC
      `).all(location_id) as ReplenRow[];
    } else {
      rows = db.prepare(`
        SELECT
          i.name AS item_name, i.sku AS item_sku, i.id AS item_id,
          il.location_id,
          l.zone, l.aisle, l.bin,
          (i.location_id = il.location_id) AS is_primary,
          il.quantity AS current_qty,
          il.min_qty,
          pl.zone AS primary_zone, pl.aisle AS primary_aisle, pl.bin AS primary_bin
        FROM item_locations il
        JOIN items i ON il.item_id = i.id
        JOIN locations l ON il.location_id = l.id
        LEFT JOIN locations pl ON i.location_id = pl.id
        WHERE il.min_qty > 0 AND il.quantity < il.min_qty
        ORDER BY l.zone, l.aisle, l.bin, i.name ASC
      `).all() as ReplenRow[];
    }

    // Group by location
    const byLocation = new Map<string, { label: string; items: ReplenRow[] }>();
    for (const r of rows) {
      const key = r.location_id;
      const label = [r.zone, r.aisle, r.bin].filter(Boolean).join(' › ') || r.location_id;
      if (!byLocation.has(key)) byLocation.set(key, { label, items: [] });
      byLocation.get(key)!.items.push(r);
    }

    const sectionHtml = [...byLocation.entries()].map(([, { label, items }]) => {
      const rows = items.map(r => {
        const needed = r.min_qty - r.current_qty;
        const primaryLabel = [r.primary_zone, r.primary_aisle, r.primary_bin].filter(Boolean).join(' › ') || '—';
        const isPrimary = r.is_primary === 1;
        return `<tr>
          <td>${escapeHtml(r.item_name)}</td>
          <td class="mono">${escapeHtml(r.item_sku)}</td>
          <td>${isPrimary ? '<span class="badge">Primary</span>' : escapeHtml(primaryLabel)}</td>
          <td class="num">${r.current_qty}</td>
          <td class="num">${r.min_qty}</td>
          <td class="num alert">${needed}</td>
        </tr>`;
      }).join('');
      return `<section><h2>📍 ${escapeHtml(label)}</h2>
        <table><thead><tr>
          <th>Item</th><th>SKU</th><th>Transfer From</th><th>Current</th><th>Min</th><th>Transfer Qty</th>
        </tr></thead><tbody>${rows}</tbody></table></section>`;
    }).join('\n');

    const title = location_id
      ? `Replenishment Report — ${byLocation.get(location_id as string)?.label ?? location_id}`
      : 'Replenishment Report — All Locations';
    const dateStr = new Date().toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: Arial, sans-serif; font-size: 13px; color: #111; background: #fff; }
.toolbar { padding: 10px 16px; background: #f0f0f0; display: flex; align-items: center; gap: 12px; border-bottom: 1px solid #ddd; }
.toolbar button { padding: 7px 18px; background: #1a237e; color: #fff; border: none; border-radius: 6px; font-size: 14px; cursor: pointer; }
.header { padding: 20px 24px 8px; border-bottom: 2px solid #1a237e; }
.header h1 { font-size: 20px; color: #1a237e; }
.header .date { font-size: 11px; color: #666; margin-top: 4px; }
section { padding: 16px 24px; border-bottom: 1px solid #e5e7eb; }
h2 { font-size: 14px; color: #374151; margin-bottom: 10px; }
table { width: 100%; border-collapse: collapse; }
th { background: #f3f4f6; text-align: left; padding: 7px 10px; font-size: 11px; text-transform: uppercase; border: 1px solid #e5e7eb; }
td { padding: 7px 10px; border: 1px solid #e5e7eb; }
.mono { font-family: monospace; font-size: 11px; color: #555; }
.num { text-align: right; }
.alert { color: #dc2626; font-weight: bold; }
.badge { background: #dbeafe; color: #1d4ed8; padding: 2px 6px; border-radius: 4px; font-size: 10px; }
.empty { padding: 32px 24px; color: #6b7280; font-style: italic; }
@media print { .toolbar { display: none !important; } body { margin: 0; } section { page-break-inside: avoid; } }
</style></head><body>
<div class="toolbar"><button onclick="window.print()">🖨 Print</button><span>${rows.length} item${rows.length !== 1 ? 's' : ''} need replenishment</span></div>
<div class="header"><h1>${escapeHtml(title)}</h1><div class="date">Generated: ${escapeHtml(dateStr)}</div></div>
${rows.length === 0 ? '<div class="empty">✅ All locations are sufficiently stocked.</div>' : sectionHtml}
</body></html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

export default router;
