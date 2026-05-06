import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import fs from 'fs';
import path from 'path';

// Arabic months names
export const ARABIC_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

// Status labels
export const STATUS_LABELS: Record<string, string> = {
  present: 'حاضر',
  late: 'متأخر',
  absent: 'غائب',
  paid: 'مدفوع',
  pending: 'معلق',
  active: 'نشط',
  on_leave: 'في إجازة',
  terminated: 'مفصول',
};

// Initialize jsPDF with Arabic font support
export function createPDFWithArabic(): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Load and register Arabic fonts
  const regularFontPath = path.join(process.cwd(), 'public', 'fonts', 'Amiri-Regular.ttf');
  const boldFontPath = path.join(process.cwd(), 'public', 'fonts', 'Amiri-Bold.ttf');

  if (fs.existsSync(regularFontPath)) {
    const regularBase64 = fs.readFileSync(regularFontPath).toString('base64');
    doc.addFileToVFS('Amiri-Regular.ttf', regularBase64);
    doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');
  }

  if (fs.existsSync(boldFontPath)) {
    const boldBase64 = fs.readFileSync(boldFontPath).toString('base64');
    doc.addFileToVFS('Amiri-Bold.ttf', boldBase64);
    doc.addFont('Amiri-Bold.ttf', 'Amiri', 'bold');
  }

  return doc;
}

// Add company header to PDF
export function addCompanyHeader(doc: jsPDF, title: string): number {
  let companyName = 'شركتي';
  try {
    // Read company name from DB would require async, so we use default
    // The API routes will pass the actual company name
  } catch {
    // Use default
  }

  // Company name
  doc.setFont('Amiri', 'bold');
  doc.setFontSize(20);
  doc.text(companyName, 105, 20, { align: 'center' });

  // Title
  doc.setFontSize(16);
  doc.text(title, 105, 30, { align: 'center' });

  // Separator line
  doc.setDrawColor(16, 185, 129); // emerald-500
  doc.setLineWidth(0.5);
  doc.line(20, 34, 190, 34);

  return 40; // Return next Y position
}

// Format date to Arabic
export function formatDateArabic(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ar-JO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// Format time from ISO string
export function formatTime(dateStr: string | null): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

// Format currency
export function formatCurrency(amount: number): string {
  return amount.toLocaleString('ar-JO') + ' د.أ';
}

// Add footer to PDF
export function addPDFFooter(doc: jsPDF, title: string): void {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('Amiri', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);

    // Footer line
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(20, 282, 190, 282);

    // Left: page number
    doc.text(`${i} / ${pageCount}`, 190, 288, { align: 'right' });

    // Right: title and date
    doc.text(`${title} - ${new Date().toLocaleDateString('ar-JO')}`, 20, 288, { align: 'left' });
  }
}

// Auto table with Arabic font
export function addArabicTable(
  doc: jsPDF,
  options: {
    head: string[][];
    body: (string | number)[][];
    startY: number;
    headStyles?: Record<string, unknown>;
    bodyStyles?: Record<string, unknown>;
    columnStyles?: Record<number, Record<string, unknown>>;
    margin?: { left?: number; right?: number };
  }
): number {
  autoTable(doc, {
    head: options.head,
    body: options.body,
    startY: options.startY,
    styles: {
      font: 'Amiri',
      halign: 'right',
      fontSize: 10,
      cellPadding: 3,
      ...options.bodyStyles,
    },
    headStyles: {
      font: 'Amiri',
      fontStyle: 'bold',
      halign: 'right',
      fillColor: [16, 185, 129], // emerald-500
      textColor: [255, 255, 255],
      fontSize: 10,
      ...options.headStyles,
    },
    alternateRowStyles: {
      fillColor: [240, 253, 244], // emerald-50
    },
    columnStyles: options.columnStyles,
    margin: options.margin || { left: 15, right: 15 },
    theme: 'grid',
    tableLineColor: [200, 200, 200],
    tableLineWidth: 0.1,
  });

  // Return the Y position after the table
  return (doc as unknown as Record<string, number>).lastAutoTable?.finalY ?? options.startY + 50;
}

// Add summary section to PDF
export function addSummarySection(
  doc: jsPDF,
  startY: number,
  items: { label: string; value: string; color?: [number, number, number] }[]
): number {
  let y = startY + 5;

  doc.setFont('Amiri', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text('ملخص التقرير', 190, y, { align: 'right' });
  y += 8;

  doc.setFont('Amiri', 'normal');
  doc.setFontSize(10);

  for (const item of items) {
    const color = item.color || [0, 0, 0];
    doc.setTextColor(color[0], color[1], color[2]);

    doc.text(`${item.label}:`, 190, y, { align: 'right' });
    doc.text(item.value, 150, y, { align: 'right' });
    y += 6;
  }

  doc.setTextColor(0, 0, 0);
  return y;
}

// Get PDF buffer
export function getPDFBuffer(doc: jsPDF): Buffer {
  return Buffer.from(doc.output('arraybuffer'));
}
