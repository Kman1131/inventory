import PDFDocument from 'pdfkit';
import nodemailer from 'nodemailer';
import type { PurchaseOrderItem } from '../../types';

interface SupplierInfo {
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
}

interface POInfo {
  po_number: string;
  status: string;
  notes: string | null;
  created_at: string;
}

interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}

const COLORS = {
  primary: '#1a237e',
  accent: '#3949ab',
  lowRow: '#fafafa',
  border: '#bdbdbd',
  text: '#212121',
  subtext: '#757575',
  header: '#e8eaf6',
};

export function generatePOPdf(
  po: POInfo,
  supplier: SupplierInfo,
  items: PurchaseOrderItem[]
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = doc.page.width - 100; // accounting for margins

    // ── Header bar ───────────────────────────────────────────────────────────
    doc.rect(50, 40, pageWidth, 60).fill(COLORS.primary);
    doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold')
      .text('PURCHASE ORDER', 60, 55, { width: pageWidth - 20 });
    doc.fontSize(10).font('Helvetica')
      .text(`PO Number: ${po.po_number}`, 60, 80);

    // ── Meta info ─────────────────────────────────────────────────────────────
    doc.fillColor(COLORS.text);
    const metaY = 120;
    doc.fontSize(9).font('Helvetica').fillColor(COLORS.subtext)
      .text('DATE ISSUED', 50, metaY)
      .text('STATUS', 200, metaY)
      .text('PAGE', 450, metaY);
    doc.fontSize(10).font('Helvetica-Bold').fillColor(COLORS.text)
      .text(new Date(po.created_at).toLocaleDateString('en-AU', { day: '2-digit', month: 'long', year: 'numeric' }), 50, metaY + 12)
      .text(po.status.toUpperCase(), 200, metaY + 12)
      .text('1 of 1', 450, metaY + 12);

    doc.moveTo(50, metaY + 30).lineTo(50 + pageWidth, metaY + 30).strokeColor(COLORS.border).lineWidth(0.5).stroke();

    // ── Supplier info ─────────────────────────────────────────────────────────
    const supY = metaY + 42;
    doc.fontSize(9).font('Helvetica').fillColor(COLORS.subtext).text('SUPPLIER', 50, supY);
    doc.fontSize(11).font('Helvetica-Bold').fillColor(COLORS.text).text(supplier.name, 50, supY + 12);
    doc.fontSize(9).font('Helvetica').fillColor(COLORS.subtext);
    let lineY = supY + 26;
    if (supplier.contact_name) { doc.text(`Contact: ${supplier.contact_name}`, 50, lineY); lineY += 12; }
    if (supplier.email)        { doc.text(`Email: ${supplier.email}`, 50, lineY); lineY += 12; }
    if (supplier.phone)        { doc.text(`Phone: ${supplier.phone}`, 50, lineY); lineY += 12; }
    if (supplier.address)      { doc.text(`Address: ${supplier.address}`, 50, lineY); lineY += 12; }

    // ── Items table ───────────────────────────────────────────────────────────
    const tableY = Math.max(lineY + 20, supY + 80);
    const colSku    = 50;
    const colName   = 130;
    const colQty    = 370;
    const colPrice  = 430;
    const colTotal  = 490;
    const colRight  = 550;

    // Table header
    doc.rect(50, tableY, pageWidth, 20).fill(COLORS.header);
    doc.fontSize(9).font('Helvetica-Bold').fillColor(COLORS.primary);
    doc.text('SKU',        colSku,   tableY + 6, { width: 75, lineBreak: false });
    doc.text('DESCRIPTION', colName, tableY + 6, { width: 230, lineBreak: false });
    doc.text('QTY',        colQty,  tableY + 6, { width: 55, align: 'right', lineBreak: false });
    doc.text('UNIT PRICE', colPrice, tableY + 6, { width: 55, align: 'right', lineBreak: false });
    doc.text('TOTAL',      colTotal, tableY + 6, { width: 55, align: 'right', lineBreak: false });

    let rowY = tableY + 22;
    let grandTotal = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const lineTotal = item.quantity_ordered * item.unit_price;
      grandTotal += lineTotal;

      if (i % 2 === 1) doc.rect(50, rowY, pageWidth, 18).fill('#f8f9ff');

      doc.fontSize(9).font('Helvetica').fillColor(COLORS.text);
      doc.text(item.sku,       colSku,   rowY + 4, { width: 75,  lineBreak: false });
      doc.text(item.name,      colName,  rowY + 4, { width: 230, lineBreak: false });
      doc.text(String(item.quantity_ordered), colQty, rowY + 4, { width: 55, align: 'right', lineBreak: false });
      doc.text(`$${item.unit_price.toFixed(2)}`, colPrice, rowY + 4, { width: 55, align: 'right', lineBreak: false });
      doc.text(`$${lineTotal.toFixed(2)}`, colTotal, rowY + 4, { width: 55, align: 'right', lineBreak: false });

      rowY += 18;
    }

    // Table bottom border
    doc.moveTo(50, rowY).lineTo(colRight, rowY).strokeColor(COLORS.border).lineWidth(0.5).stroke();

    // Grand total
    rowY += 8;
    doc.fontSize(11).font('Helvetica-Bold').fillColor(COLORS.primary);
    doc.text(`TOTAL: $${grandTotal.toFixed(2)}`, 50, rowY, { width: pageWidth, align: 'right' });

    // Notes
    if (po.notes) {
      rowY += 30;
      doc.fontSize(9).font('Helvetica-Bold').fillColor(COLORS.text).text('NOTES', 50, rowY);
      doc.fontSize(9).font('Helvetica').fillColor(COLORS.subtext).text(po.notes, 50, rowY + 12, { width: pageWidth });
    }

    // Footer
    const footerY = doc.page.height - 60;
    doc.moveTo(50, footerY).lineTo(50 + pageWidth, footerY).strokeColor(COLORS.border).lineWidth(0.5).stroke();
    doc.fontSize(8).font('Helvetica').fillColor(COLORS.subtext)
      .text('Generated by Inventory Manager', 50, footerY + 10, { align: 'center', width: pageWidth });

    doc.end();
  });
}

export async function sendPOEmail(
  smtp: SmtpConfig,
  to: string,
  poNumber: string,
  pdfBuffer: Buffer
): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.port === 465,
    auth: { user: smtp.user, pass: smtp.pass },
  });

  await transporter.sendMail({
    from: smtp.from || smtp.user,
    to,
    subject: `Purchase Order ${poNumber}`,
    text: `Dear Supplier,\n\nPlease find attached Purchase Order ${poNumber}.\n\nKind regards,\nInventory Manager`,
    attachments: [{
      filename: `${poNumber}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf',
    }],
  });
}
