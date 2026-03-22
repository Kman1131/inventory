import PDFDocument from 'pdfkit';
import { Response } from 'express';
import db from '../db';
import type { StockReportRow } from '../../types';

const COLORS = {
  primary: '#1a237e',
  accent: '#0d47a1',
  lowStock: '#c62828',
  okStock: '#2e7d32',
  tableHeader: '#e3f2fd',
  rowAlt: '#f5f5f5',
  border: '#bdbdbd',
  text: '#212121',
  subtext: '#757575',
};

function drawTableRow(
  doc: PDFKit.PDFDocument,
  row: StockReportRow,
  y: number,
  rowIndex: number
): void {
  const isLow = row.status === 'LOW';
  const bgColor = rowIndex % 2 === 0 ? '#ffffff' : COLORS.rowAlt;

  // Row background
  doc.rect(40, y, 515, 22).fill(bgColor);

  // Status highlight bar
  if (isLow) {
    doc.rect(40, y, 4, 22).fill(COLORS.lowStock);
  }

  doc.fillColor(COLORS.text).fontSize(9);

  // SKU
  doc.text(row.sku, 50, y + 6, { width: 80, lineBreak: false });
  // Name
  doc.text(row.name, 135, y + 6, { width: 145, lineBreak: false });
  // Category
  doc.text(row.category_name || '—', 285, y + 6, { width: 95, lineBreak: false });
  // Qty
  doc.fillColor(isLow ? COLORS.lowStock : COLORS.text);
  doc.text(String(row.quantity), 385, y + 6, { width: 60, align: 'center', lineBreak: false });
  // Status
  doc.fillColor(isLow ? COLORS.lowStock : COLORS.okStock).fontSize(8);
  doc.text(row.status, 450, y + 7, { width: 55, align: 'center', lineBreak: false });

  // Row border
  doc.moveTo(40, y + 22).lineTo(555, y + 22).strokeColor(COLORS.border).lineWidth(0.5).stroke();
}

export async function generateStockReport(res: Response): Promise<void> {
  const rows = db.prepare(`
    SELECT
      items.sku,
      items.name,
      COALESCE(categories.name, 'Uncategorized') AS category_name,
      items.quantity,
      items.min_threshold,
      items.price,
      CASE WHEN items.quantity < items.min_threshold THEN 'LOW' ELSE 'OK' END AS status
    FROM items
    LEFT JOIN categories ON items.category_id = categories.id
    ORDER BY
      CASE WHEN items.quantity < items.min_threshold THEN 0 ELSE 1 END ASC,
      items.name ASC
  `).all() as StockReportRow[];

  const totalValue = rows.reduce((sum, r) => sum + r.quantity * r.price, 0);
  const lowCount = rows.filter(r => r.status === 'LOW').length;
  const timestamp = new Date().toLocaleString();

  const doc = new PDFDocument({ margin: 40, size: 'A4' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="stock-report.pdf"');
  doc.pipe(res);

  // ── Header ──────────────────────────────────────────────────────────────────
  doc.rect(0, 0, doc.page.width, 80).fill(COLORS.primary);
  doc.fillColor('#ffffff').fontSize(20).font('Helvetica-Bold')
    .text('Inventory Stock Report', 40, 22);
  doc.fontSize(9).font('Helvetica')
    .text(`Generated: ${timestamp}`, 40, 48)
    .text(`Total items: ${rows.length}  |  Low-stock alerts: ${lowCount}  |  Total value: $${totalValue.toFixed(2)}`, 40, 60);

  doc.moveDown(2);

  // ── Table Header ─────────────────────────────────────────────────────────────
  let y = 100;
  doc.rect(40, y, 515, 22).fill(COLORS.accent);
  doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold');
  doc.text('SKU', 50, y + 6, { width: 80, lineBreak: false });
  doc.text('Item Name', 135, y + 6, { width: 145, lineBreak: false });
  doc.text('Category', 285, y + 6, { width: 95, lineBreak: false });
  doc.text('Qty', 385, y + 6, { width: 60, align: 'center', lineBreak: false });
  doc.text('Status', 450, y + 6, { width: 55, align: 'center', lineBreak: false });
  y += 22;

  // ── Table Rows ───────────────────────────────────────────────────────────────
  let rowIndex = 0;
  for (const row of rows) {
    if (y > doc.page.height - 80) {
      doc.addPage();
      y = 40;

      // Repeat header on new page
      doc.rect(40, y, 515, 22).fill(COLORS.accent);
      doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold');
      doc.text('SKU', 50, y + 6, { width: 80, lineBreak: false });
      doc.text('Item Name', 135, y + 6, { width: 145, lineBreak: false });
      doc.text('Category', 285, y + 6, { width: 95, lineBreak: false });
      doc.text('Qty', 385, y + 6, { width: 60, align: 'center', lineBreak: false });
      doc.text('Status', 450, y + 6, { width: 55, align: 'center', lineBreak: false });
      y += 22;
    }

    drawTableRow(doc, row, y, rowIndex);
    y += 22;
    rowIndex++;
  }

  if (rows.length === 0) {
    doc.fillColor(COLORS.subtext).fontSize(12).font('Helvetica')
      .text('No items in inventory.', 40, y + 20, { align: 'center', width: 515 });
  }

  // ── Footer ───────────────────────────────────────────────────────────────────
  const pages = (doc.bufferedPageRange?.().count) ?? 1;
  for (let i = 0; i < pages; i++) {
    doc.switchToPage(i);
    doc.rect(0, doc.page.height - 30, doc.page.width, 30).fill(COLORS.primary);
    doc.fillColor('#ffffff').fontSize(8).font('Helvetica')
      .text(
        `Local Inventory System  |  Page ${i + 1} of ${pages}`,
        40, doc.page.height - 20,
        { align: 'center', width: doc.page.width - 80 }
      );
  }

  doc.end();
}
