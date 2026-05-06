'use client';

import { toast } from 'sonner';

/**
 * Download attendance PDF report
 */
export async function downloadAttendancePDF(date: string, departmentId?: string): Promise<void> {
  try {
    const params = new URLSearchParams();
    params.set('date', date);
    if (departmentId && departmentId !== 'all') {
      params.set('departmentId', departmentId);
    }

    const res = await fetch(`/api/reports/attendance-pdf?${params.toString()}`);

    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: 'فشل في تحميل التقرير' }));
      throw new Error(data.error || 'فشل في تحميل التقرير');
    }

    const blob = await res.blob();
    triggerDownload(blob, `attendance-${date}.pdf`);
    toast.success('تم تحميل تقرير الحضور بنجاح');
  } catch (error) {
    console.error('Error downloading attendance PDF:', error);
    toast.error(error instanceof Error ? error.message : 'فشل في تحميل تقرير الحضور');
  }
}

/**
 * Download payroll PDF report
 */
export async function downloadPayrollPDF(month: number, year: number): Promise<void> {
  try {
    const params = new URLSearchParams();
    params.set('month', String(month));
    params.set('year', String(year));

    const res = await fetch(`/api/reports/payroll-pdf?${params.toString()}`);

    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: 'فشل في تحميل كشف الرواتب' }));
      throw new Error(data.error || 'فشل في تحميل كشف الرواتب');
    }

    const blob = await res.blob();
    triggerDownload(blob, `payroll-${month}-${year}.pdf`);
    toast.success('تم تحميل كشف الرواتب بنجاح');
  } catch (error) {
    console.error('Error downloading payroll PDF:', error);
    toast.error(error instanceof Error ? error.message : 'فشل في تحميل كشف الرواتب');
  }
}

/**
 * Download employee profile PDF
 */
export async function downloadEmployeePDF(employeeId: string, employeeName?: string): Promise<void> {
  try {
    const params = new URLSearchParams();
    params.set('employeeId', employeeId);

    const res = await fetch(`/api/reports/employee-pdf?${params.toString()}`);

    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: 'فشل في تحميل ملف الموظف' }));
      throw new Error(data.error || 'فشل في تحميل ملف الموظف');
    }

    const blob = await res.blob();
    const filename = employeeName
      ? `employee-${employeeName.replace(/\s+/g, '-')}.pdf`
      : `employee-${employeeId}.pdf`;
    triggerDownload(blob, filename);
    toast.success('تم تحميل ملف الموظف بنجاح');
  } catch (error) {
    console.error('Error downloading employee PDF:', error);
    toast.error(error instanceof Error ? error.message : 'فشل في تحميل ملف الموظف');
  }
}

/**
 * Download all employees PDF (batch export)
 */
export async function downloadAllEmployeesPDF(): Promise<void> {
  try {
    // Fetch all employees first
    const res = await fetch('/api/employees?limit=100&status=active');
    if (!res.ok) {
      throw new Error('فشل في جلب بيانات الموظفين');
    }
    const data = await res.json();
    const employees = data.employees || [];

    if (employees.length === 0) {
      toast.error('لا يوجد موظفين للتصدير');
      return;
    }

    // Download each employee PDF (limit to first 10 to avoid overwhelming)
    const limit = Math.min(employees.length, 10);
    toast.info(`جاري تحميل ملفات ${limit} موظف...`);

    for (let i = 0; i < limit; i++) {
      const emp = employees[i];
      const params = new URLSearchParams();
      params.set('employeeId', emp.id);

      const pdfRes = await fetch(`/api/reports/employee-pdf?${params.toString()}`);
      if (pdfRes.ok) {
        const blob = await pdfRes.blob();
        triggerDownload(blob, `employee-${emp.firstName}-${emp.lastName}.pdf`);
        // Small delay to avoid browser blocking multiple downloads
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    if (employees.length > limit) {
      toast.info(`تم تحميل ${limit} ملف من أصل ${employees.length}. يرجى تحميل الباقي بشكل فردي.`);
    } else {
      toast.success('تم تحميل جميع ملفات الموظفين بنجاح');
    }
  } catch (error) {
    console.error('Error downloading all employees PDF:', error);
    toast.error('فشل في تحميل ملفات الموظفين');
  }
}

/**
 * Trigger file download in browser
 */
function triggerDownload(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
