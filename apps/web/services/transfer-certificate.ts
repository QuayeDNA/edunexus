import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface TransferCertificateParams {
  studentName: string;
  studentIdNumber: string;
  dateOfBirth: string;
  lastClass: string;
  reason: string;
  targetSchool: string;
  transferDate: string;
  schoolName: string;
}

export async function generateTransferCertificate(params: TransferCertificateParams): Promise<Buffer> {
  const doc = new jsPDF({ format: 'a4', unit: 'mm' });

  doc.setFontSize(18);
  doc.text('TRANSFER CERTIFICATE', 105, 30, { align: 'center' });

  doc.setFontSize(11);
  doc.text(`School: ${params.schoolName}`, 20, 50);
  doc.text(`Date of Issue: ${params.transferDate}`, 20, 58);

  autoTable(doc, {
    startY: 70,
    head: [['Field', 'Details']],
    body: [
      ['Student Name', params.studentName],
      ['Student ID', params.studentIdNumber],
      ['Date of Birth', params.dateOfBirth],
      ['Last Class Attended', params.lastClass],
      ['Reason for Transfer', params.reason],
      ['Target School', params.targetSchool],
    ],
    styles: { fontSize: 10 },
    headStyles: { fillColor: [59, 130, 246] },
  });

  doc.text('School Stamp & Signature:', 20, (doc as any).lastAutoTable.finalY + 20);
  doc.text('_________________________', 20, (doc as any).lastAutoTable.finalY + 28);
  doc.text('Authorized Signature', 20, (doc as any).lastAutoTable.finalY + 36);

  return Buffer.from(doc.output('arraybuffer'));
}
