import { db } from '@/lib/db';
import {
  createPDFWithArabic,
  addCompanyHeader,
  addArabicTable,
  addPDFFooter,
  addSummarySection,
  getPDFBuffer,
  formatDateArabic,
  formatTime,
  STATUS_LABELS,
} from '@/lib/pdf-utils';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const departmentId = searchParams.get('departmentId');

    if (!date) {
      return NextResponse.json({ error: 'التاريخ مطلوب' }, { status: 400 });
    }

    // Fetch attendance records
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const where: Record<string, unknown> = {
      date: { gte: start, lte: end },
    };

    if (departmentId) {
      where.employee = { departmentId };
    }

    const records = await db.attendanceRecord.findMany({
      where,
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            employeeId: true,
            department: { select: { name: true } },
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    // Get company info
    const company = await db.company.findFirst();

    // Create PDF
    const doc = createPDFWithArabic();
    let y = addCompanyHeader(doc, 'كشف الحضور والانصراف');

    // Date info
    doc.setFont('Amiri', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(80, 80, 80);
    doc.text(`التاريخ: ${formatDateArabic(date)}`, 190, y, { align: 'right' });
    if (departmentId) {
      const dept = await db.department.findUnique({ where: { id: departmentId } });
      if (dept) {
        doc.text(`القسم: ${dept.name}`, 190, y + 6, { align: 'right' });
        y += 12;
      }
    }
    y += 10;

    // Table data
    const head = [['الاسم', 'رقم الموظف', 'القسم', 'الدخول', 'الخروج', 'ساعات العمل', 'التأخير (د)', 'الحالة']];

    const body = records.map((r) => [
      `${r.employee.firstName} ${r.employee.lastName}`,
      r.employee.employeeId,
      r.employee.department?.name || '—',
      formatTime(r.checkIn),
      formatTime(r.checkOut),
      r.workHours ? `${r.workHours}` : '—',
      String(r.lateMinutes),
      STATUS_LABELS[r.status] || r.status,
    ]);

    if (records.length > 0) {
      y = addArabicTable(doc, {
        head,
        body,
        startY: y,
        columnStyles: {
          0: { cellWidth: 35 },
          1: { cellWidth: 22 },
          2: { cellWidth: 28 },
          3: { cellWidth: 18 },
          4: { cellWidth: 18 },
          5: { cellWidth: 20 },
          6: { cellWidth: 20 },
          7: { cellWidth: 20 },
        },
      });
    } else {
      doc.setFont('Amiri', 'normal');
      doc.setFontSize(12);
      doc.setTextColor(128, 128, 128);
      doc.text('لا توجد سجلات حضور لهذا التاريخ', 105, y + 10, { align: 'center' });
      y += 20;
    }

    // Summary
    const totalPresent = records.filter((r) => r.status === 'present').length;
    const totalLate = records.filter((r) => r.status === 'late').length;
    const totalAbsent = records.filter((r) => r.status === 'absent').length;

    y = addSummarySection(doc, y, [
      { label: 'إجمالي الحضور', value: String(totalPresent), color: [16, 185, 129] },
      { label: 'إجمالي المتأخرين', value: String(totalLate), color: [217, 119, 6] },
      { label: 'إجمالي الغائبين', value: String(totalAbsent), color: [220, 38, 38] },
      { label: 'الإجمالي', value: String(records.length), color: [0, 0, 0] },
    ]);

    // Add company name override if available
    if (company?.name) {
      doc.setPage(1);
      doc.setFont('Amiri', 'bold');
      doc.setFontSize(20);
      doc.setTextColor(0, 0, 0);
      // Draw white rect to cover default text
      doc.setFillColor(255, 255, 255);
      doc.rect(30, 10, 150, 12, 'F');
      doc.text(company.name, 105, 20, { align: 'center' });
    }

    addPDFFooter(doc, 'كشف الحضور والانصراف');

    const pdfBuffer = getPDFBuffer(doc);

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="attendance-${date}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Error generating attendance PDF:', error);
    return NextResponse.json({ error: 'فشل في إنشاء تقرير الحضور' }, { status: 500 });
  }
}
