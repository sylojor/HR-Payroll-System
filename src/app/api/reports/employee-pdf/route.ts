import { db } from '@/lib/db';
import {
  createPDFWithArabic,
  addCompanyHeader,
  addArabicTable,
  addPDFFooter,
  getPDFBuffer,
  formatDateArabic,
  formatTime,
  formatCurrency,
  STATUS_LABELS,
} from '@/lib/pdf-utils';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');

    if (!employeeId) {
      return NextResponse.json({ error: 'رقم الموظف مطلوب' }, { status: 400 });
    }

    // Fetch employee full details
    const employee = await db.employee.findUnique({
      where: { id: employeeId },
      include: {
        department: true,
        position: true,
        salaryComponents: { include: { component: true } },
        workSchedule: true,
      },
    });

    if (!employee) {
      return NextResponse.json({ error: 'الموظف غير موجود' }, { status: 404 });
    }

    // Fetch recent attendance (last 30 records)
    const attendanceRecords = await db.attendanceRecord.findMany({
      where: { employeeId: employee.id },
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
      take: 30,
    });

    // Get company info
    const company = await db.company.findFirst();

    // Create PDF
    const doc = createPDFWithArabic();
    let y = addCompanyHeader(doc, 'ملف الموظف');

    // Employee name
    doc.setFont('Amiri', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(16, 185, 129);
    doc.text(`${employee.firstName} ${employee.lastName}`, 190, y, { align: 'right' });
    y += 8;

    // === Personal Info Section ===
    doc.setFont('Amiri', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text('المعلومات الشخصية', 190, y, { align: 'right' });
    y += 2;
    doc.setDrawColor(16, 185, 129);
    doc.setLineWidth(0.3);
    doc.line(130, y, 190, y);
    y += 6;

    doc.setFont('Amiri', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);

    const personalInfo: [string, string][] = [
      ['رقم الموظف', employee.employeeId],
      ['الاسم الكامل', `${employee.firstName} ${employee.lastName}`],
      ['الجنس', employee.gender === 'male' ? 'ذكر' : 'أنثى'],
      ['الحالة الاجتماعية', employee.maritalStatus === 'single' ? 'أعزب' : employee.maritalStatus === 'married' ? 'متزوج' : employee.maritalStatus],
      ['البريد الإلكتروني', employee.email || '—'],
      ['الهاتف', employee.phone || '—'],
      ['الرقم الوطني', employee.nationalId || '—'],
      ['المدينة', employee.city || '—'],
      ['العنوان', employee.address || '—'],
    ];

    for (const [label, value] of personalInfo) {
      doc.setFont('Amiri', 'bold');
      doc.text(`${label}:`, 190, y, { align: 'right' });
      doc.setFont('Amiri', 'normal');
      doc.text(value, 155, y, { align: 'right' });
      y += 5.5;
    }
    y += 5;

    // === Job Info Section ===
    doc.setFont('Amiri', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text('معلومات الوظيفة', 190, y, { align: 'right' });
    y += 2;
    doc.setDrawColor(16, 185, 129);
    doc.line(130, y, 190, y);
    y += 6;

    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);

    const jobInfo: [string, string][] = [
      ['القسم', employee.department?.name || '—'],
      ['المنصب', employee.position?.title || '—'],
      ['تاريخ التعيين', employee.hireDate ? formatDateArabic(employee.hireDate.toISOString()) : '—'],
      ['الحالة', STATUS_LABELS[employee.status] || employee.status],
      ['رقم البصمة', employee.fingerprintId || '—'],
    ];

    if (employee.workSchedule) {
      jobInfo.push(['جدول العمل', `${employee.workSchedule.name} (${employee.workSchedule.startTime} - ${employee.workSchedule.endTime})`]);
    }

    for (const [label, value] of jobInfo) {
      doc.setFont('Amiri', 'bold');
      doc.text(`${label}:`, 190, y, { align: 'right' });
      doc.setFont('Amiri', 'normal');
      doc.text(value, 140, y, { align: 'right' });
      y += 5.5;
    }
    y += 5;

    // === Salary Components Section ===
    if (employee.salaryComponents.length > 0) {
      if (y > 220) {
        doc.addPage();
        y = 20;
      }

      doc.setFont('Amiri', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text('مكونات الراتب', 190, y, { align: 'right' });
      y += 2;
      doc.setDrawColor(16, 185, 129);
      doc.line(130, y, 190, y);
      y += 6;

      // Salary table
      const salaryHead = [['المكون', 'النوع', 'المبلغ']];
      const salaryBody = employee.salaryComponents.map((sc) => [
        sc.component.name,
        sc.component.type === 'earning' ? 'استحقاق' : 'خصم',
        formatCurrency(sc.amount || 0),
      ]);

      // Calculate totals
      const totalEarnings = employee.salaryComponents
        .filter((sc) => sc.component.type === 'earning')
        .reduce((sum, sc) => sum + (sc.amount || 0), 0);
      const totalDeductions = employee.salaryComponents
        .filter((sc) => sc.component.type === 'deduction')
        .reduce((sum, sc) => sum + (sc.amount || 0), 0);

      y = addArabicTable(doc, {
        head: salaryHead,
        body: salaryBody,
        startY: y,
        margin: { left: 50, right: 15 },
      });
      y += 5;

      // Salary summary
      doc.setFont('Amiri', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(16, 185, 129);
      doc.text(`إجمالي الاستحقاقات: ${formatCurrency(totalEarnings)}`, 190, y, { align: 'right' });
      y += 5;
      doc.setTextColor(220, 38, 38);
      doc.text(`إجمالي الخصومات: ${formatCurrency(totalDeductions)}`, 190, y, { align: 'right' });
      y += 5;
      doc.setTextColor(0, 0, 0);
      doc.setFont('Amiri', 'bold');
      doc.text(`صافي الراتب: ${formatCurrency(totalEarnings - totalDeductions)}`, 190, y, { align: 'right' });
      y += 10;
    }

    // === Bank Info Section ===
    if (employee.bankName || employee.bankAccount || employee.iban) {
      if (y > 240) {
        doc.addPage();
        y = 20;
      }

      doc.setFont('Amiri', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text('المعلومات البنكية', 190, y, { align: 'right' });
      y += 2;
      doc.setDrawColor(16, 185, 129);
      doc.line(130, y, 190, y);
      y += 6;

      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);

      const bankInfo: [string, string][] = [
        ['اسم البنك', employee.bankName || '—'],
        ['رقم الحساب', employee.bankAccount || '—'],
        ['رقم الآيبان', employee.iban || '—'],
      ];

      for (const [label, value] of bankInfo) {
        doc.setFont('Amiri', 'bold');
        doc.text(`${label}:`, 190, y, { align: 'right' });
        doc.setFont('Amiri', 'normal');
        doc.text(value, 155, y, { align: 'right' });
        y += 5.5;
      }
      y += 5;
    }

    // === Recent Attendance Section ===
    if (attendanceRecords.length > 0) {
      if (y > 220) {
        doc.addPage();
        y = 20;
      }

      doc.setFont('Amiri', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text('سجلات الحضور الأخيرة', 190, y, { align: 'right' });
      y += 2;
      doc.setDrawColor(16, 185, 129);
      doc.line(130, y, 190, y);
      y += 6;

      const attendanceHead = [['التاريخ', 'الدخول', 'الخروج', 'ساعات العمل', 'التأخير', 'الحالة']];
      const attendanceBody = attendanceRecords.slice(0, 15).map((r) => [
        formatDateArabic(r.date.toISOString()),
        formatTime(r.checkIn),
        formatTime(r.checkOut),
        r.workHours ? `${r.workHours}` : '—',
        String(r.lateMinutes),
        STATUS_LABELS[r.status] || r.status,
      ]);

      addArabicTable(doc, {
        head: attendanceHead,
        body: attendanceBody,
        startY: y,
      });
    }

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

    addPDFFooter(doc, `ملف الموظف - ${employee.firstName} ${employee.lastName}`);

    const pdfBuffer = getPDFBuffer(doc);

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="employee-${employee.employeeId}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Error generating employee PDF:', error);
    return NextResponse.json({ error: 'فشل في إنشاء ملف الموظف' }, { status: 500 });
  }
}
