import PDFDocument from 'pdfkit';
import { Inspection } from '../models/Inspection.js';
import { Defect } from '../models/Defect.js';
import { MaintenanceTask } from '../models/MaintenanceTask.js';
import { Locomotive } from '../models/Locomotive.js';

export const buildInspectionPDF = async (inspectionId, stream) => {
  const inspection = await Inspection.findById(inspectionId)
    .populate('locomotive')
    .populate('inspector', 'name email role shed')
    .populate('supervisor', 'name email role');

  if (!inspection) throw new Error('Inspection not found');

  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  doc.pipe(stream);

  // Header Banner
  doc.rect(40, 40, 515, 60).fill('#0f172a');
  doc.fillColor('#ffffff').fontSize(18).text('RailReady Operations Platform', 55, 52);
  doc.fontSize(10).text('DIGITAL PRE-DEPLOYMENT INSPECTION CERTIFICATE', 55, 74);
  doc.fontSize(9).text(`Doc Ref: ${inspection.inspectionNumber}`, 400, 74, { align: 'right', width: 140 });

  doc.moveDown(3);
  doc.fillColor('#000000');

  // Metadata Grid
  const startY = 115;
  doc.fontSize(10).font('Helvetica-Bold').text('Locomotive Details:', 45, startY);
  doc.font('Helvetica').fontSize(9)
    .text(`Number: ${inspection.locomotive?.locoNumber || 'N/A'}`, 45, startY + 15)
    .text(`Class: ${inspection.locomotive?.locoClass || 'N/A'}`, 45, startY + 28)
    .text(`Shed: ${inspection.locomotive?.shed || 'N/A'}`, 45, startY + 41);

  doc.font('Helvetica-Bold').fontSize(10).text('Inspection Status:', 240, startY);
  doc.font('Helvetica').fontSize(9)
    .text(`Result: ${inspection.status}`, 240, startY + 15)
    .text(`Date: ${new Date(inspection.createdAt).toLocaleDateString()}`, 240, startY + 28)
    .text(`Review: ${inspection.reviewedAt ? new Date(inspection.reviewedAt).toLocaleDateString() : 'Pending'}`, 240, startY + 41);

  doc.font('Helvetica-Bold').fontSize(10).text('Personnel:', 400, startY);
  doc.font('Helvetica').fontSize(9)
    .text(`Inspector: ${inspection.inspector?.name || 'N/A'}`, 400, startY + 15)
    .text(`Supervisor: ${inspection.supervisor?.name || 'Pending Review'}`, 400, startY + 28);

  doc.rect(40, 175, 515, 1).fill('#cbd5e1');

  // Checklist Items Table
  let itemY = 190;
  doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(11).text('Checklist Evaluation Summary', 45, itemY);
  itemY += 20;

  // Table header
  doc.rect(40, itemY, 515, 20).fill('#f1f5f9');
  doc.fillColor('#334155').font('Helvetica-Bold').fontSize(8)
    .text('CATEGORY', 45, itemY + 6)
    .text('CHECKPOINT TITLE', 130, itemY + 6)
    .text('STATUS', 360, itemY + 6)
    .text('REMARKS', 430, itemY + 6);

  itemY += 22;

  doc.font('Helvetica').fontSize(8);
  for (const it of inspection.items) {
    if (itemY > 740) {
      doc.addPage();
      itemY = 40;
    }

    const statusColor = it.result === 'PASS' ? '#16a34a' : it.result === 'FAIL' ? '#dc2626' : '#d97706';
    doc.fillColor('#475569').text(it.category, 45, itemY, { width: 80 });
    doc.fillColor('#1e293b').text(it.itemTitle, 130, itemY, { width: 220 });
    doc.fillColor(statusColor).font('Helvetica-Bold').text(it.result, 360, itemY, { width: 60 });
    doc.font('Helvetica').fillColor('#64748b').text(it.comment || '-', 430, itemY, { width: 120 });

    itemY += 18;
  }

  // Footer Disclaimer
  doc.moveDown(2);
  const footerY = Math.max(itemY + 20, 750);
  doc.rect(40, footerY, 515, 30).fill('#f8fafc');
  doc.fillColor('#94a3b8').fontSize(7).text(
    'Academic Project Disclaimer: RailReady is an operational workflow management tool. This generated document is for simulated academic demonstration purposes and does not replace official statutory railway safety certification.',
    45,
    footerY + 8,
    { width: 505, align: 'center' }
  );

  doc.end();
};
