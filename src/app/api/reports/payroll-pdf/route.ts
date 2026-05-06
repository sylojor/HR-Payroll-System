import { db } from '@/lib/db';
import {
  createPDFWithArabic,
  addCompanyHeader,
  addArabicTable,
  addPDFFooter,
  addSummarySection,
  getPDFBuffer,
  formatCurrency,
  ARABIC_MONTHS,
  STATUS_LABELS,
} from '@/lib/pdf-utils';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));

    // Fetch payroll data
    const payroll = await db.payroll.findUnique({
      where: { month_year: { month, year } },
      include: {
        items: {
          include: {
            employee: {
              select: {
                id: true,
                employeeId: true,
                firstName: true,
                lastName: true,
                department: { select: { name: true } },
                position: { select: { title: true } },
              },
            },
          },
          orderBy: { employee: { employeeId: 'asc' } },
        },
      },
    });

    if (!payroll) {
      return NextResponse.json({ error: 'لم يتم معالجة كشف الرواتب لهذا الشهر بعد' }, { status: 404 });
    }

    // Get company info
    const company = await db.company.findFirst();

    // Create PDF
    const doc = createPDFWithArabic();
    const title = `كشف رواتب شهر ${ARABIC_MONTHS[month - 1]} ${year}`;
    let y = addCompanyHeader(doc, title);

    // Period info
    doc.setFont('Amiri', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(80, 80, 80);
    doc.text(`الفترة: ${ARABIC_MONTHS[month - 1]} ${year}`, 190, y, { align: 'right' });
    doc.text(`الحالة: ${payroll.status === 'draft' ? 'مسودة' : 'معتمد'}`, 20, y, { align: 'left' });
    y += 10;

    // Table data
    const head = [['رقم الموظف', 'اسم الموظف', 'القسم', 'الراتب الأساسي', 'إجمالي الاستحقاقات', 'إجمالي الخصومات', 'صافي الراتب', 'الحالة']];

    const body = payroll.items.map((item) => [
      item.employee.employeeId,
      `${item.employee.firstName} ${item.employee.lastName}`,
      item.employee.department?.name || '—',
      formatCurrency(item.basicSalary),
      formatCurrency(item.totalEarnings),
      formatCurrency(item.totalDeductions),
      formatCurrency(item.netSalary),
      STATUS_LABELS[item.status] || item.status,
    ]);

    if (payroll.items.length > 0) {
      y = addArabicTable(doc, {
        head,
        body,
        startY: y,
        columnStyles: {
          0: { cellWidth: 22 },
          1: { cellWidth: 30 },
          2: { cellWidth: 22 },
          3: { cellWidth: 25 },
          4: { cellWidth: 25 },
          5: { cellWidth: 25 },
          6: { cellWidth: 25 },
          7: { cellWidth: 16 },
        },
      });
    }

    // Summary section
    y = addSummarySection(doc, y, [
      { label: 'إجمالي الاستحقاقات', value: formatCurrency(payroll.totalEarnings), color: [16, 185, 129] },
      { label: 'إجمالي الخصومات', value: formatCurrency(payroll.totalDeductions), color: [220, 38, 38] },
      { label: 'صافي الرواتب', value: formatCurrency(payroll.totalNet), color: [0, 0, 0] },
      { label: 'عدد الموظفين', value: String(payroll.items.length), color: [0, 0, 0] },
      { label: 'مدفوع', value: String(payroll.items.filter((i) => i.status === 'paid').length), color: [16, 185, 129] },
      { label: 'معلق', value: String(payroll.items.filter((i) => i.status === 'pending').length), color: [217, 119, 6] },
    ]);

    // Override company name
    if (company?.name) {
      doc.setPage(1);
      doc.setFont('Amiri', 'bold');
      doc.setFontSize(20);
      doc.setTextColor(0, 0, 0);
      doc.setFillColor(255, 255, 255);
      doc.rect(30, 10, 150, 12, 'F');
      doc.text(company.name, 105, 20, { align: 'center' });
    }

    addPDFFooter(doc, title);

    const pdfBuffer = getPDFBuffer(doc);

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="payroll-${month}-${year}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Error generating payroll PDF:', error);
    return NextResponse.json({ error: 'فشل في إنشاء كشف الرواتب' }, { status: 500 });
  }
}
