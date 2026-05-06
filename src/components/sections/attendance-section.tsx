'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, Users, UserX, TrendingUp, Download, Plus, CalendarDays, Search, FileText, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { downloadAttendancePDF } from '@/lib/pdf-client';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  employeeId: string;
  department: { name: string } | null;
}

interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  workHours: number | null;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  status: string;
  note: string | null;
  isManual: boolean;
  employee: Employee;
}

interface Department {
  id: string;
  name: string;
}

function formatDateArabic(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ar-JO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatTime(dateStr: string | null): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

function getTodayString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = (now.getMonth() + 1).toString().padStart(2, '0');
  const d = now.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function AttendanceSection() {
  const { toast } = useToast();
  const [date, setDate] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setDate(getTodayString());
  }, []);
  const [departmentId, setDepartmentId] = useState<string>('all');
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);

  const [formEmployeeId, setFormEmployeeId] = useState('');
  const [formCheckIn, setFormCheckIn] = useState('08:00');
  const [formCheckOut, setFormCheckOut] = useState('17:00');
  const [formStatus, setFormStatus] = useState('present');
  const [formNote, setFormNote] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('date', date);
      if (departmentId && departmentId !== 'all') {
        params.set('departmentId', departmentId);
      }
      const res = await fetch(`/api/attendance?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setRecords(data);
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setLoading(false);
    }
  }, [date, departmentId]);

  useEffect(() => {
    if (date) fetchRecords();
  }, [fetchRecords, date]);

  useEffect(() => {
    async function fetchMeta() {
      try {
        const [deptRes, empRes] = await Promise.all([
          fetch('/api/departments'),
          fetch('/api/employees?status=active&limit=100'),
        ]);
        if (deptRes.ok) {
          const deptData = await deptRes.json();
          setDepartments(deptData);
        }
        if (empRes.ok) {
          const empData = await empRes.json();
          setEmployees(empData.employees || empData);
        }
      } catch (error) {
        console.error('Error fetching meta data:', error);
      }
    }
    fetchMeta();
  }, []);

  const totalPresent = records.filter((r) => r.status === 'present').length;
  const totalLate = records.filter((r) => r.status === 'late').length;
  const totalAbsent = records.filter((r) => r.status === 'absent').length;
  const avgWorkHours =
    records.length > 0
      ? (
          records
            .filter((r) => r.workHours && r.workHours > 0)
            .reduce((sum, r) => sum + (r.workHours || 0), 0) /
          Math.max(records.filter((r) => r.workHours && r.workHours > 0).length, 1)
        ).toFixed(1)
      : '0';

  async function handleAddRecord() {
    if (!formEmployeeId) {
      toast({ title: 'خطأ', description: 'يرجى اختيار الموظف', variant: 'destructive' });
      return;
    }
    setFormSubmitting(true);
    try {
      const dateWithTime = (time: string) => {
        const [h, m] = time.split(':').map(Number);
        const d = new Date(date);
        d.setHours(h, m, 0, 0);
        return d.toISOString();
      };

      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: formEmployeeId,
          date,
          checkIn: formStatus !== 'absent' ? dateWithTime(formCheckIn) : null,
          checkOut: formStatus !== 'absent' ? dateWithTime(formCheckOut) : null,
          status: formStatus,
          note: formNote || null,
        }),
      });

      if (res.ok) {
        toast({ title: 'تمت الإضافة', description: 'تم إضافة سجل الحضور بنجاح' });
        setShowAddDialog(false);
        resetForm();
        fetchRecords();
      } else {
        const data = await res.json();
        toast({ title: 'خطأ', description: data.error || 'فشل في إضافة السجل', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل في إضافة السجل', variant: 'destructive' });
    } finally {
      setFormSubmitting(false);
    }
  }

  function resetForm() {
    setFormEmployeeId('');
    setFormCheckIn('08:00');
    setFormCheckOut('17:00');
    setFormStatus('present');
    setFormNote('');
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'present':
        return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200">حاضر</Badge>;
      case 'late':
        return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200">متأخر</Badge>;
      case 'absent':
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-red-200">غائب</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  }

  const summaryCards = [
    {
      title: 'إجمالي الحضور',
      value: totalPresent,
      icon: <Users className="h-5 w-5" />,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
    },
    {
      title: 'إجمالي المتأخرين',
      value: totalLate,
      icon: <Clock className="h-5 w-5" />,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
    },
    {
      title: 'إجمالي الغائبين',
      value: totalAbsent,
      icon: <UserX className="h-5 w-5" />,
      color: 'text-red-600',
      bg: 'bg-red-50',
      border: 'border-red-200',
    },
    {
      title: 'متوسط ساعات العمل',
      value: avgWorkHours,
      icon: <TrendingUp className="h-5 w-5" />,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
    },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">الحضور والانصراف</h1>
          <p className="text-sm text-muted-foreground mt-1">{formatDateArabic(date)}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" disabled={exporting} onClick={async () => {
            setExporting(true);
            await downloadAttendancePDF(date, departmentId);
            setExporting(false);
          }}>
            {exporting ? <Loader2 className="h-4 w-4 ml-2 animate-spin" /> : <FileText className="h-4 w-4 ml-2" />}
            {exporting ? 'جاري التصدير...' : 'تصدير PDF'}
          </Button>
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 ml-2" /> إضافة سجل يدوي
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <Label htmlFor="date-filter" className="text-sm whitespace-nowrap">التاريخ</Label>
          <Input id="date-filter" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-44" />
        </div>
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Label htmlFor="dept-filter" className="text-sm whitespace-nowrap">القسم</Label>
          <Select value={departmentId} onValueChange={setDepartmentId}>
            <SelectTrigger id="dept-filter" className="w-48"><SelectValue placeholder="جميع الأقسام" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الأقسام</SelectItem>
              {departments.map((dept) => (<SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {summaryCards.map((card) => (
          <Card key={card.title} className={`${card.border}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{card.title}</p>
                  <p className={`text-2xl font-bold mt-1 ${card.color}`}>{card.value}</p>
                </div>
                <div className={`h-10 w-10 rounded-lg ${card.bg} ${card.color} flex items-center justify-center`}>{card.icon}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">سجلات الحضور</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">الموظف</TableHead>
                  <TableHead className="text-right">القسم</TableHead>
                  <TableHead className="text-right">الدخول</TableHead>
                  <TableHead className="text-right">الخروج</TableHead>
                  <TableHead className="text-right">ساعات العمل</TableHead>
                  <TableHead className="text-right">التأخير (د)</TableHead>
                  <TableHead className="text-right">خروج مبكر (د)</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">ملاحظات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>{Array.from({ length: 9 }).map((_, j) => (<TableCell key={j}><div className="h-4 bg-muted animate-pulse rounded" /></TableCell>))}</TableRow>
                  ))
                ) : records.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">لا توجد سجلات حضور لهذا التاريخ</TableCell></TableRow>
                ) : (
                  records.map((record) => (
                    <TableRow key={record.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        <div><span>{record.employee.firstName} {record.employee.lastName}</span><span className="text-xs text-muted-foreground block">{record.employee.employeeId}</span></div>
                      </TableCell>
                      <TableCell className="text-sm">{record.employee.department?.name || '—'}</TableCell>
                      <TableCell className="font-mono text-sm">{formatTime(record.checkIn)}</TableCell>
                      <TableCell className="font-mono text-sm">{formatTime(record.checkOut)}</TableCell>
                      <TableCell className="text-sm">{record.workHours ? `${record.workHours}h` : '—'}</TableCell>
                      <TableCell className="text-sm">{record.lateMinutes > 0 ? (<span className="text-amber-600 font-medium">{record.lateMinutes}</span>) : '0'}</TableCell>
                      <TableCell className="text-sm">{record.earlyLeaveMinutes > 0 ? (<span className="text-orange-600 font-medium">{record.earlyLeaveMinutes}</span>) : '0'}</TableCell>
                      <TableCell>{getStatusBadge(record.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-32 truncate">{record.note || (record.isManual ? 'يدوي' : '—')}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader><DialogTitle>إضافة سجل حضور يدوي</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>الموظف</Label>
              <Select value={formEmployeeId} onValueChange={setFormEmployeeId}>
                <SelectTrigger><SelectValue placeholder="اختر الموظف" /></SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (<SelectItem key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName} ({emp.employeeId})</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>الحالة</Label>
              <Select value={formStatus} onValueChange={setFormStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="present">حاضر</SelectItem>
                  <SelectItem value="late">متأخر</SelectItem>
                  <SelectItem value="absent">غائب</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formStatus !== 'absent' && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>وقت الدخول</Label><Input type="time" value={formCheckIn} onChange={(e) => setFormCheckIn(e.target.value)} /></div>
                <div className="space-y-2"><Label>وقت الخروج</Label><Input type="time" value={formCheckOut} onChange={(e) => setFormCheckOut(e.target.value)} /></div>
              </div>
            )}
            <div className="space-y-2"><Label>ملاحظات</Label><Input value={formNote} onChange={(e) => setFormNote(e.target.value)} placeholder="ملاحظات إضافية..." /></div>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleAddRecord} disabled={formSubmitting} className="flex-1 bg-emerald-600 hover:bg-emerald-700">{formSubmitting ? 'جاري الحفظ...' : 'حفظ'}</Button>
              <Button variant="outline" onClick={() => setShowAddDialog(false)} className="flex-1">إلغاء</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
