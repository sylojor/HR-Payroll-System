'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  User,
  Briefcase,
  DollarSign,
  Clock,
  CalendarDays,
  Receipt,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Heart,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Timer,
  Building2,
  Fingerprint,
  StickyNote,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';

// ============ Types ============

interface EmployeeFull {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  firstNameEn: string | null;
  lastNameEn: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  nationalId: string | null;
  passportNumber: string | null;
  birthDate: string | null;
  hireDate: string;
  endDate: string | null;
  gender: string;
  maritalStatus: string;
  address: string | null;
  city: string | null;
  country: string | null;
  photo: string | null;
  status: string;
  fingerprintId: string | null;
  bankName: string | null;
  bankAccount: string | null;
  iban: string | null;
  emergencyContact: string | null;
  emergencyPhone: string | null;
  notes: string | null;
  departmentId: string | null;
  positionId: string | null;
  workScheduleId: string | null;
  department: { id: string; name: string; nameEn: string | null } | null;
  position: { id: string; title: string; titleEn: string | null } | null;
  workSchedule: {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
    sunday: boolean;
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
  } | null;
  salaryComponents: {
    id: string;
    amount: number;
    effectiveDate: string;
    endDate: string | null;
    component: {
      id: string;
      name: string;
      nameEn: string | null;
      type: string;
      category: string;
    };
  }[];
}

interface AttendanceRecord {
  id: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  workHours: number | null;
  overtimeHours: number | null;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  status: string;
  note: string | null;
  isManual: boolean;
}

interface LeaveRequest {
  id: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string | null;
  status: string;
  approvedAt: string | null;
  rejectionReason: string | null;
  leaveType: {
    id: string;
    name: string;
    isPaid: boolean;
  };
}

interface PayrollItem {
  id: string;
  basicSalary: number;
  totalEarnings: number;
  totalDeductions: number;
  netSalary: number;
  overtimePay: number;
  lateDeduction: number;
  absenceDeduction: number;
  loanDeduction: number;
  taxAmount: number;
  socialSecurity: number;
  status: string;
  paidAt: string | null;
  payroll: {
    month: number;
    year: number;
    status: string;
  };
}

interface EmployeeDetailsResponse {
  employee: EmployeeFull;
  attendanceRecords: AttendanceRecord[];
  leaveRequests: LeaveRequest[];
  payrollItems: PayrollItem[];
}

// ============ Config ============

const statusConfig: Record<string, { label: string; className: string }> = {
  active: { label: 'نشط', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  on_leave: { label: 'في إجازة', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  terminated: { label: 'مفصول', className: 'bg-red-100 text-red-800 border-red-200' },
};

const genderConfig: Record<string, string> = {
  male: 'ذكر',
  female: 'أنثى',
};

const maritalConfig: Record<string, string> = {
  single: 'أعزب',
  married: 'متزوج',
  divorced: 'مطلق',
  widowed: 'أرمل',
};

const attendanceStatusConfig: Record<string, { label: string; className: string }> = {
  present: { label: 'حاضر', className: 'bg-emerald-100 text-emerald-800' },
  absent: { label: 'غائب', className: 'bg-red-100 text-red-800' },
  late: { label: 'متأخر', className: 'bg-yellow-100 text-yellow-800' },
  leave: { label: 'إجازة', className: 'bg-sky-100 text-sky-800' },
  holiday: { label: 'عطلة', className: 'bg-purple-100 text-purple-800' },
  half_day: { label: 'نصف يوم', className: 'bg-orange-100 text-orange-800' },
};

const leaveStatusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: 'معلق', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  approved: { label: 'موافق', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  rejected: { label: 'مرفوض', className: 'bg-red-100 text-red-800 border-red-200' },
};

const payrollItemStatusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: 'معلق', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  processed: { label: 'تم المعالجة', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  paid: { label: 'مدفوع', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
};

const arabicMonths = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

const dayLabels: Record<string, string> = {
  sunday: 'الأحد',
  monday: 'الاثنين',
  tuesday: 'الثلاثاء',
  wednesday: 'الأربعاء',
  thursday: 'الخميس',
  friday: 'الجمعة',
  saturday: 'السبت',
};

// ============ Helper ============

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('ar-JO');
}

function formatTime(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleTimeString('ar-JO', { hour: '2-digit', minute: '2-digit' });
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString('ar-JO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ============ Info Row ============

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-start gap-2 py-2">
      <Icon className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium truncate">{value || '—'}</p>
      </div>
    </div>
  );
}

// ============ Skeleton Loader ============

function DetailSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[...Array(8)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}

// ============ Main Component ============

interface EmployeeDetailProps {
  employeeId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EmployeeDetailDialog({ employeeId, open, onOpenChange }: EmployeeDetailProps) {
  const [data, setData] = useState<EmployeeDetailsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');
  const [attendanceMonth, setAttendanceMonth] = useState<string>(
    String(new Date().getMonth() + 1)
  );
  const [attendanceYear, setAttendanceYear] = useState<string>(
    String(new Date().getFullYear())
  );

  const fetchVersionRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!open || !employeeId) return;

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const version = ++fetchVersionRef.current;

    // Reset tab and mark loading (use microtask to avoid synchronous setState in effect)
    Promise.resolve().then(() => {
      if (version !== fetchVersionRef.current) return;
      setActiveTab('personal');
      setLoading(true);
    });

    fetch(`/api/employees/${employeeId}/details`, { signal: ctrl.signal })
      .then(r => r.json())
      .then(d => {
        if (version === fetchVersionRef.current) setData(d);
      })
      .catch(e => {
        if (e.name !== 'AbortError' && version === fetchVersionRef.current) {
          setData(null);
        }
      })
      .finally(() => {
        if (version === fetchVersionRef.current) setLoading(false);
      });

    return () => { ctrl.abort(); };
  }, [open, employeeId]);

  // Reset data when dialog closes
  const handleOpenChange = useCallback((nextOpen: boolean) => {
    if (!nextOpen) {
      setData(null);
      setLoading(false);
    }
    onOpenChange(nextOpen);
  }, [onOpenChange]);

  if (!open) return null;

  const emp = data?.employee;
  const attendance = data?.attendanceRecords || [];
  const leaves = data?.leaveRequests || [];
  const payroll = data?.payrollItems || [];

  // Filter attendance by selected month/year
  const filteredAttendance = attendance.filter(a => {
    const d = new Date(a.date);
    return d.getMonth() + 1 === parseInt(attendanceMonth) && d.getFullYear() === parseInt(attendanceYear);
  });

  // Salary calculations
  const earnings = emp?.salaryComponents.filter(sc => sc.component.type === 'earning') || [];
  const deductions = emp?.salaryComponents.filter(sc => sc.component.type === 'deduction') || [];
  const totalEarnings = earnings.reduce((sum, sc) => sum + sc.amount, 0);
  const totalDeductions = deductions.reduce((sum, sc) => sum + sc.amount, 0);
  const basicSalary = earnings.find(sc => sc.component.category === 'basic')?.amount || 0;

  const fullName = emp ? `${emp.firstName} ${emp.lastName}` : '';
  const fullNameEn = emp?.firstNameEn && emp?.lastNameEn ? `${emp.firstNameEn} ${emp.lastNameEn}` : null;
  const initials = emp ? `${emp.firstName.charAt(0)}${emp.lastName.charAt(0)}` : '';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-4xl max-h-[92vh] overflow-hidden flex flex-col p-0"
        dir="rtl"
      >
        {/* Header */}
        <div className="border-b p-4 shrink-0">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <Avatar className="h-14 w-14 border-2 border-emerald-200">
                <AvatarImage src={emp?.photo || undefined} alt={fullName} />
                <AvatarFallback className="bg-emerald-100 text-emerald-700 text-lg font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-lg font-bold truncate">
                  {loading ? <Skeleton className="h-6 w-40" /> : fullName}
                </DialogTitle>
                {loading ? (
                  <Skeleton className="h-4 w-28 mt-1" />
                ) : (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-muted-foreground font-mono">
                      {emp?.employeeId}
                    </span>
                    {emp?.status && (
                      <Badge variant="outline" className={statusConfig[emp.status]?.className || ''}>
                        {statusConfig[emp.status]?.label || emp.status}
                      </Badge>
                    )}
                    {emp?.department && (
                      <Badge variant="secondary" className="text-xs">
                        {emp.department.name}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Tabs */}
        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <div className="border-b px-4 shrink-0">
              <TabsList className="h-auto flex-wrap gap-1 bg-transparent p-0 justify-start">
                <TabsTrigger value="personal" className="gap-1.5 text-xs px-3 py-2 data-[state=active]:bg-emerald-100 data-[state=active]:text-emerald-800">
                  <User className="h-3.5 w-3.5" />
                  المعلومات الشخصية
                </TabsTrigger>
                <TabsTrigger value="job" className="gap-1.5 text-xs px-3 py-2 data-[state=active]:bg-emerald-100 data-[state=active]:text-emerald-800">
                  <Briefcase className="h-3.5 w-3.5" />
                  معلومات الوظيفة
                </TabsTrigger>
                <TabsTrigger value="salary" className="gap-1.5 text-xs px-3 py-2 data-[state=active]:bg-emerald-100 data-[state=active]:text-emerald-800">
                  <DollarSign className="h-3.5 w-3.5" />
                  الرواتب والاستحقاقات
                </TabsTrigger>
                <TabsTrigger value="attendance" className="gap-1.5 text-xs px-3 py-2 data-[state=active]:bg-emerald-100 data-[state=active]:text-emerald-800">
                  <Clock className="h-3.5 w-3.5" />
                  سجل الحضور
                </TabsTrigger>
                <TabsTrigger value="leaves" className="gap-1.5 text-xs px-3 py-2 data-[state=active]:bg-emerald-100 data-[state=active]:text-emerald-800">
                  <CalendarDays className="h-3.5 w-3.5" />
                  الإجازات
                </TabsTrigger>
                <TabsTrigger value="payroll" className="gap-1.5 text-xs px-3 py-2 data-[state=active]:bg-emerald-100 data-[state=active]:text-emerald-800">
                  <Receipt className="h-3.5 w-3.5" />
                  كشف الرواتب
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <DetailSkeleton />
              ) : !emp ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <AlertCircle className="h-10 w-10 mb-2" />
                  <p>لم يتم العثور على بيانات الموظف</p>
                </div>
              ) : (
                <>
                  {/* ====== Tab 1: Personal Info ====== */}
                  <TabsContent value="personal" className="mt-0 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Basic Identity */}
                      <Card>
                        <CardHeader className="pb-2 pt-4 px-4">
                          <CardTitle className="text-sm font-semibold text-emerald-700 flex items-center gap-2">
                            <User className="h-4 w-4" />
                            الهوية والمعلومات الأساسية
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-4 space-y-1">
                          <InfoRow icon={CreditCard} label="رقم الموظف" value={emp.employeeId} />
                          <InfoRow icon={User} label="الاسم الكامل" value={fullName} />
                          {fullNameEn && <InfoRow icon={User} label="الاسم بالإنجليزية" value={fullNameEn} />}
                          <InfoRow icon={User} label="الجنس" value={genderConfig[emp.gender] || emp.gender} />
                          <InfoRow icon={CreditCard} label="الرقم الوطني" value={emp.nationalId} />
                          {emp.passportNumber && <InfoRow icon={CreditCard} label="رقم جواز السفر" value={emp.passportNumber} />}
                          <InfoRow icon={CalendarDays} label="تاريخ الميلاد" value={formatDate(emp.birthDate)} />
                          <InfoRow icon={Heart} label="الحالة الاجتماعية" value={maritalConfig[emp.maritalStatus] || emp.maritalStatus} />
                        </CardContent>
                      </Card>

                      {/* Contact Info */}
                      <Card>
                        <CardHeader className="pb-2 pt-4 px-4">
                          <CardTitle className="text-sm font-semibold text-emerald-700 flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            معلومات الاتصال
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-4 space-y-1">
                          <InfoRow icon={Phone} label="رقم الهاتف" value={emp.phone} />
                          <InfoRow icon={Phone} label="رقم الجوال" value={emp.mobile} />
                          <InfoRow icon={Mail} label="البريد الإلكتروني" value={emp.email} />
                          <Separator className="my-2" />
                          <InfoRow icon={MapPin} label="العنوان" value={emp.address} />
                          <InfoRow icon={MapPin} label="المدينة" value={emp.city} />
                          <InfoRow icon={MapPin} label="الدولة" value={emp.country} />
                        </CardContent>
                      </Card>

                      {/* Emergency Contact */}
                      <Card>
                        <CardHeader className="pb-2 pt-4 px-4">
                          <CardTitle className="text-sm font-semibold text-emerald-700 flex items-center gap-2">
                            <AlertCircle className="h-4 w-4" />
                            جهة الطوارئ
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-4 space-y-1">
                          <InfoRow icon={User} label="اسم جهة الاتصال" value={emp.emergencyContact} />
                          <InfoRow icon={Phone} label="هاتف الطوارئ" value={emp.emergencyPhone} />
                        </CardContent>
                      </Card>

                      {/* Bank Info */}
                      <Card>
                        <CardHeader className="pb-2 pt-4 px-4">
                          <CardTitle className="text-sm font-semibold text-emerald-700 flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            المعلومات البنكية
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-4 space-y-1">
                          <InfoRow icon={Building2} label="اسم البنك" value={emp.bankName} />
                          <InfoRow icon={CreditCard} label="رقم الحساب" value={emp.bankAccount} />
                          <InfoRow icon={CreditCard} label="رقم الآيبان" value={emp.iban} />
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  {/* ====== Tab 2: Job Info ====== */}
                  <TabsContent value="job" className="mt-0 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card>
                        <CardHeader className="pb-2 pt-4 px-4">
                          <CardTitle className="text-sm font-semibold text-emerald-700 flex items-center gap-2">
                            <Briefcase className="h-4 w-4" />
                            تفاصيل الوظيفة
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-4 space-y-1">
                          <InfoRow icon={Building2} label="القسم" value={emp.department?.name} />
                          <InfoRow icon={Briefcase} label="المنصب" value={emp.position?.title} />
                          <InfoRow icon={CalendarDays} label="تاريخ التعيين" value={formatDate(emp.hireDate)} />
                          {emp.endDate && <InfoRow icon={CalendarDays} label="تاريخ الانتهاء" value={formatDate(emp.endDate)} />}
                          <InfoRow icon={Fingerprint} label="رقم البصمة" value={emp.fingerprintId} />
                          <InfoRow icon={User} label="الحالة" value={statusConfig[emp.status]?.label || emp.status} />
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2 pt-4 px-4">
                          <CardTitle className="text-sm font-semibold text-emerald-700 flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            جدول العمل
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-4 space-y-1">
                          {emp.workSchedule ? (
                            <>
                              <InfoRow icon={Clock} label="اسم الجدول" value={emp.workSchedule.name} />
                              <InfoRow icon={Timer} label="ساعات العمل" value={`${emp.workSchedule.startTime} - ${emp.workSchedule.endTime}`} />
                              <div className="mt-3">
                                <p className="text-xs text-muted-foreground mb-2">أيام العمل</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {Object.entries(dayLabels).map(([day, label]) => {
                                    const isActive = emp.workSchedule![day as keyof typeof emp.workSchedule] as boolean;
                                    return (
                                      <Badge
                                        key={day}
                                        variant={isActive ? 'default' : 'outline'}
                                        className={`text-xs ${isActive ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'text-muted-foreground'}`}
                                      >
                                        {label}
                                      </Badge>
                                    );
                                  })}
                                </div>
                              </div>
                            </>
                          ) : (
                            <p className="text-sm text-muted-foreground">لم يتم تحديد جدول عمل</p>
                          )}
                        </CardContent>
                      </Card>

                      {emp.notes && (
                        <Card className="md:col-span-2">
                          <CardHeader className="pb-2 pt-4 px-4">
                            <CardTitle className="text-sm font-semibold text-emerald-700 flex items-center gap-2">
                              <StickyNote className="h-4 w-4" />
                              ملاحظات
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="px-4 pb-4">
                            <p className="text-sm whitespace-pre-wrap">{emp.notes}</p>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </TabsContent>

                  {/* ====== Tab 3: Salary & Earnings ====== */}
                  <TabsContent value="salary" className="mt-0 space-y-4">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <Card className="border-emerald-200">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-1">
                            <TrendingUp className="h-4 w-4 text-emerald-600" />
                            <span className="text-xs text-muted-foreground">إجمالي الاستحقاقات</span>
                          </div>
                          <p className="text-lg font-bold text-emerald-700">{formatCurrency(totalEarnings)}</p>
                        </CardContent>
                      </Card>
                      <Card className="border-red-200">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-1">
                            <TrendingDown className="h-4 w-4 text-red-600" />
                            <span className="text-xs text-muted-foreground">إجمالي الخصومات</span>
                          </div>
                          <p className="text-lg font-bold text-red-700">{formatCurrency(totalDeductions)}</p>
                        </CardContent>
                      </Card>
                      <Card className="border-emerald-300 bg-emerald-50">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-1">
                            <DollarSign className="h-4 w-4 text-emerald-700" />
                            <span className="text-xs text-muted-foreground">صافي الراتب</span>
                          </div>
                          <p className="text-lg font-bold text-emerald-800">{formatCurrency(totalEarnings - totalDeductions)}</p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Earnings Table */}
                    <Card>
                      <CardHeader className="pb-2 pt-4 px-4">
                        <CardTitle className="text-sm font-semibold text-emerald-700 flex items-center gap-2">
                          <TrendingUp className="h-4 w-4" />
                          الاستحقاقات ({earnings.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-0 pb-0">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-right">المكون</TableHead>
                              <TableHead className="text-right">التصنيف</TableHead>
                              <TableHead className="text-right">المبلغ</TableHead>
                              <TableHead className="text-right">تاريخ السريان</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {earnings.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                                  لا توجد استحقاقات
                                </TableCell>
                              </TableRow>
                            ) : (
                              earnings.map(sc => (
                                <TableRow key={sc.id}>
                                  <TableCell className="font-medium">{sc.component.name}</TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="text-xs">
                                      {sc.component.category === 'basic' ? 'أساسي' :
                                       sc.component.category === 'allowance' ? 'بدل' :
                                       sc.component.category === 'bonus' ? 'مكافأة' :
                                       sc.component.category}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="font-mono text-emerald-700 font-semibold">
                                    {formatCurrency(sc.amount)}
                                  </TableCell>
                                  <TableCell className="text-sm text-muted-foreground">
                                    {formatDate(sc.effectiveDate)}
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>

                    {/* Deductions Table */}
                    <Card>
                      <CardHeader className="pb-2 pt-4 px-4">
                        <CardTitle className="text-sm font-semibold text-red-700 flex items-center gap-2">
                          <TrendingDown className="h-4 w-4" />
                          الخصومات ({deductions.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-0 pb-0">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-right">المكون</TableHead>
                              <TableHead className="text-right">التصنيف</TableHead>
                              <TableHead className="text-right">المبلغ</TableHead>
                              <TableHead className="text-right">تاريخ السريان</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {deductions.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                                  لا توجد خصومات
                                </TableCell>
                              </TableRow>
                            ) : (
                              deductions.map(sc => (
                                <TableRow key={sc.id}>
                                  <TableCell className="font-medium">{sc.component.name}</TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="text-xs">
                                      {sc.component.category === 'tax' ? 'ضريبة' :
                                       sc.component.category === 'insurance' ? 'تأمين' :
                                       sc.component.category === 'deduction' ? 'خصم' :
                                       sc.component.category}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="font-mono text-red-700 font-semibold">
                                    {formatCurrency(sc.amount)}
                                  </TableCell>
                                  <TableCell className="text-sm text-muted-foreground">
                                    {formatDate(sc.effectiveDate)}
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* ====== Tab 4: Attendance ====== */}
                  <TabsContent value="attendance" className="mt-0 space-y-4">
                    {/* Month/Year Filter */}
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="text-sm font-medium text-muted-foreground">تصفية حسب:</span>
                          <Select value={attendanceMonth} onValueChange={setAttendanceMonth}>
                            <SelectTrigger className="w-36">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {arabicMonths.map((m, i) => (
                                <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select value={attendanceYear} onValueChange={setAttendanceYear}>
                            <SelectTrigger className="w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {[2024, 2025, 2026].map(y => (
                                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Badge variant="secondary" className="text-xs">
                            {filteredAttendance.length} سجل
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Attendance Table */}
                    <Card>
                      <CardContent className="p-0">
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-right">التاريخ</TableHead>
                                <TableHead className="text-right">الحضور</TableHead>
                                <TableHead className="text-right">الانصراف</TableHead>
                                <TableHead className="text-right">ساعات العمل</TableHead>
                                <TableHead className="text-right">التأخير (د)</TableHead>
                                <TableHead className="text-right">الحالة</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredAttendance.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                    لا توجد سجلات حضور لهذه الفترة
                                  </TableCell>
                                </TableRow>
                              ) : (
                                filteredAttendance.map(rec => (
                                  <TableRow key={rec.id}>
                                    <TableCell className="text-sm">
                                      {new Date(rec.date).toLocaleDateString('ar-JO', { weekday: 'short', day: 'numeric', month: 'short' })}
                                    </TableCell>
                                    <TableCell className="font-mono text-sm">
                                      {formatTime(rec.checkIn)}
                                    </TableCell>
                                    <TableCell className="font-mono text-sm">
                                      {formatTime(rec.checkOut)}
                                    </TableCell>
                                    <TableCell className="text-sm">
                                      {rec.workHours != null ? `${rec.workHours.toFixed(1)}` : '—'}
                                    </TableCell>
                                    <TableCell className="text-sm">
                                      {rec.lateMinutes > 0 ? (
                                        <span className="text-red-600 font-medium">{rec.lateMinutes}</span>
                                      ) : (
                                        <span className="text-emerald-600">0</span>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant="outline" className={`text-xs ${attendanceStatusConfig[rec.status]?.className || ''}`}>
                                        {attendanceStatusConfig[rec.status]?.label || rec.status}
                                      </Badge>
                                    </TableCell>
                                  </TableRow>
                                ))
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* ====== Tab 5: Leaves ====== */}
                  <TabsContent value="leaves" className="mt-0 space-y-4">
                    <Card>
                      <CardContent className="p-0">
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-right">نوع الإجازة</TableHead>
                                <TableHead className="text-right">من</TableHead>
                                <TableHead className="text-right">إلى</TableHead>
                                <TableHead className="text-right">الأيام</TableHead>
                                <TableHead className="text-right">الحالة</TableHead>
                                <TableHead className="text-right">السبب</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {leaves.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                    لا توجد طلبات إجازة
                                  </TableCell>
                                </TableRow>
                              ) : (
                                leaves.map(lr => (
                                  <TableRow key={lr.id}>
                                    <TableCell className="font-medium">
                                      {lr.leaveType.name}
                                      {lr.leaveType.isPaid && (
                                        <Badge variant="secondary" className="text-xs mr-1">مدفوعة</Badge>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-sm">{formatDate(lr.startDate)}</TableCell>
                                    <TableCell className="text-sm">{formatDate(lr.endDate)}</TableCell>
                                    <TableCell className="text-sm font-medium">{lr.totalDays}</TableCell>
                                    <TableCell>
                                      <Badge variant="outline" className={`text-xs ${leaveStatusConfig[lr.status]?.className || ''}`}>
                                        {leaveStatusConfig[lr.status]?.label || lr.status}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground max-w-32 truncate">
                                      {lr.reason || '—'}
                                    </TableCell>
                                  </TableRow>
                                ))
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* ====== Tab 6: Payroll History ====== */}
                  <TabsContent value="payroll" className="mt-0 space-y-4">
                    <Card>
                      <CardContent className="p-0">
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-right">الشهر</TableHead>
                                <TableHead className="text-right">الراتب الأساسي</TableHead>
                                <TableHead className="text-right">الاستحقاقات</TableHead>
                                <TableHead className="text-right">الخصومات</TableHead>
                                <TableHead className="text-right">صافي الراتب</TableHead>
                                <TableHead className="text-right">الحالة</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {payroll.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                    لا توجد سجلات رواتب
                                  </TableCell>
                                </TableRow>
                              ) : (
                                payroll.map(pi => (
                                  <TableRow key={pi.id}>
                                    <TableCell className="font-medium">
                                      {arabicMonths[pi.payroll.month - 1]} {pi.payroll.year}
                                    </TableCell>
                                    <TableCell className="font-mono text-sm">
                                      {formatCurrency(pi.basicSalary)}
                                    </TableCell>
                                    <TableCell className="font-mono text-sm text-emerald-700">
                                      {formatCurrency(pi.totalEarnings)}
                                    </TableCell>
                                    <TableCell className="font-mono text-sm text-red-700">
                                      {formatCurrency(pi.totalDeductions)}
                                    </TableCell>
                                    <TableCell className="font-mono text-sm font-bold">
                                      {formatCurrency(pi.netSalary)}
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant="outline" className={`text-xs ${payrollItemStatusConfig[pi.status]?.className || ''}`}>
                                        {payrollItemStatusConfig[pi.status]?.label || pi.status}
                                      </Badge>
                                    </TableCell>
                                  </TableRow>
                                ))
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </>
              )}
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
