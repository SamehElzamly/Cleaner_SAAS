import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { InvoiceDocument } from './entities/invoice.entity.js';
import { fromCents, toCents } from '../common/utils/money.js';

const money = (n: number, currency: string) => `${n.toFixed(2)} ${currency}`;

// Requires: npm i pdfkit && npm i -D @types/pdfkit
//
// LIMITATION: PDFKit's built-in fonts are Latin-only. Arabic names/addresses
// need an embedded Arabic font AND right-to-left text shaping, which this
// does not do — Arabic text would render as blanks/boxes. Latin text is fine.
@Injectable()
export class InvoicePdfService {
  render(invoice: InvoiceDocument, tenantName: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const cur = invoice.currency;
      const left = 50;
      const right = 545;

      // Header
      doc.fontSize(20).font('Helvetica-Bold').text(tenantName || 'Invoice', left, 50);
      doc.fontSize(10).font('Helvetica').fillColor('#555555');
      doc.text(`Invoice ${invoice.invoiceNumber}`, left, 50, { align: 'right', width: right - left });
      doc.text(`Issued: ${invoice.issuedAt.toISOString().slice(0, 10)}`, { align: 'right', width: right - left });
      if (invoice.dueDate) {
        doc.text(`Due: ${invoice.dueDate.toISOString().slice(0, 10)}`, { align: 'right', width: right - left });
      }
      doc.text(`Status: ${invoice.status.replace('_', ' ').toUpperCase()}`, { align: 'right', width: right - left });

      // Bill to
      doc.moveDown(2).fillColor('#000000').font('Helvetica-Bold').fontSize(11).text('Bill to', left);
      doc.font('Helvetica').fontSize(10);
      const c = invoice.customer ?? {};
      for (const line of [c.name, c.phone, c.email, c.address]) if (line) doc.text(line, left);

      // Line items
      let y = doc.moveDown(2).y;
      doc.font('Helvetica-Bold').fontSize(10);
      doc.text('Description', left, y, { width: 250 });
      doc.text('Qty', 310, y, { width: 40, align: 'right' });
      doc.text('Unit price', 355, y, { width: 90, align: 'right' });
      doc.text('Total', 450, y, { width: right - 450, align: 'right' });
      y += 16;
      doc.moveTo(left, y).lineTo(right, y).strokeColor('#999999').stroke();
      y += 6;

      doc.font('Helvetica');
      for (const item of invoice.lineItems) {
        doc.text(item.description, left, y, { width: 250 });
        doc.text(String(item.quantity), 310, y, { width: 40, align: 'right' });
        doc.text(item.unitPrice.toFixed(2), 355, y, { width: 90, align: 'right' });
        doc.text(item.total.toFixed(2), 450, y, { width: right - 450, align: 'right' });
        y += 20;
      }
      doc.moveTo(left, y).lineTo(right, y).strokeColor('#999999').stroke();
      y += 12;

      // Totals
      const row = (label: string, value: string, bold = false) => {
        doc.font(bold ? 'Helvetica-Bold' : 'Helvetica');
        doc.text(label, 330, y, { width: 115, align: 'right' });
        doc.text(value, 450, y, { width: right - 450, align: 'right' });
        y += 18;
      };
      row('Subtotal', money(invoice.subtotal, cur));
      if (invoice.taxRate > 0) row(`Tax (${invoice.taxRate}%)`, money(invoice.taxAmount, cur));
      row('Total', money(invoice.total, cur), true);
      row('Paid', money(invoice.amountPaid, cur));
      const balance = fromCents(toCents(invoice.total) - toCents(invoice.amountPaid));
      row('Balance due', money(balance, cur), true);

      if (invoice.notes) {
        doc.font('Helvetica').fontSize(9).fillColor('#555555').text(`Notes: ${invoice.notes}`, left, y + 20, { width: right - left });
      }

      doc.end();
    });
  }
}
