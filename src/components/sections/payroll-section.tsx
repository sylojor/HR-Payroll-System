'use client';

import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Banknote,
  TrendingUp,
  TrendingDown,
  Users,
  Play,
  CheckCircle2,
  Download,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react';

const formatCurrency = (amount: number) => {
  return amount.toLocaleString('ar-JO') + ' د.أ';
};

const arabicMonths = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

interface PayrollItem {
  id: string;
  employeeId: string;
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
  details: string | null;
  status: string;
  paidAt: string | null;
  employee: {
    id: string;
    employeeId: string;
    firstName: string;
    lastName: string;
    department?: { name: string };
    position?: { title: string };
  };
}

interface Payroll {
  id: string;
  month: number;
  year: number;
  status: string;
  totalEarnings: number;
  totalDeductions: number;
  totalNet: number;
  processedAt: string | null;
  items: PayrollItem[];
}

interface SalaryComponent {
  id: string;
  name: string;
  nameEn: string | null;
  type: string;
  category: string;
  isFixed: boolean;
  isTaxable: boolean;
  defaultValue: number;
  description: string | null;
  _count?: { employeeComponents: number };
}

export function PayrollSection() {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(String(now.getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState(String(now.getFullYear()));
  const [payroll, setPayroll] = useState<Payroll | null>(null);
  const [summary, setSummary] = useState<{
    totalEarnings: number;
    totalDeductions: number;
    totalNet: number;
    employeeCount: number;
    paidCount: number;
    pendingCount: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Salary components state
  const [components, setComponents] = useState<SalaryComponent[]>([]);
  const [compDialogOpen, setCompDialogOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<SalaryComponent | null>(null);
  const [compForm, setCompForm] = useState({
    name: '',
    nameEn: '',
    type: 'earning',
    category: 'basic',
    isFixed: true,
    isTaxable: true,
    defaultValue: 0,
    description: '',
  });

  const fetchPayroll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/payroll?month=${selectedMonth}&year=${selectedYear}`);
      const data = await res.json();
      setPayroll(data.payroll);
      setSummary(data.summary);
    } catch (error) {
      console.error('Error fetching payroll:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  const fetchComponents = useCallback(async () => {
    try {
      const res = await fetch('/api/salary-components');
      const data = await res.json();
      setComponents(data.components);
    } catch (error) {
      console.error('Error fetching components:', error);
    }
  }, []);

  useEffect(() => {
    fetchPayroll();
  }, [fetchPayroll]);

  useEffect(() => {
    fetchComponents();
  }, [fetchComponents]);

  const processPayroll = async () => {
    setProcessing(true);
    try {
      const res = await fetch('/api/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: parseInt(selectedMonth), year: parseInt(selectedYear) }),
      });
      const data = await res.json();
      if (res.ok) {
        setPayroll(data.payroll);
        fetchPayroll();
      } else {
        alert(data.error || 'فشل في معالجة الرواتب');
      }
    } catch (error) {
      console.error('Error processing payroll:', error);
    } finally {
      setProcessing(false);
    }
  };

  const payAll = async () => {
    if (!payroll) return;
    try {
      const res = await fetch(`/api/payroll/${payroll.id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        fetchPayroll();
      }
    } catch (error) {
      console.error('Error paying all:', error);
    }
  };

  const toggleRow = (itemId: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const openComponentDialog = (comp?: SalaryComponent) => {
    if (comp) {
      setEditingComponent(comp);
      setCompForm({
        name: comp.name,
        nameEn: comp.nameEn || '',
        type: comp.type,
        category: comp.category,
        isFixed: comp.isFixed,
        isTaxable: comp.isTaxable,
        defaultValue: comp.defaultValue,
        description: comp.description || '',
      });
    } else {
      setEditingComponent(null);
      setCompForm({
        name: '',
        nameEn: '',
        type: 'earning',
        category: 'basic',
        isFixed: true,
        isTaxable: true,
        defaultValue: 0,
        description: '',
      });
    }
    setCompDialogOpen(true);
  };

  const saveComponent = async () => {
    try {
      if (editingComponent) {
        await fetch(`/api/salary-components/${editingComponent.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(compForm),
        });
      } else {
        await fetch('/api/salary-components', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(compForm),
        });
      }
      setCompDialogOpen(false);
      fetchComponents();
    } catch (error) {
      console.error('Error saving component:', error);
    }
  };

  const deleteComponent = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المكون؟')) return;
    try {
      await fetch(`/api/salary-components/${id}`, { method: 'DELETE' });
      fetchComponents();
    } catch (error) {
      console.error('Error deleting component:', error);
    }
  };

  const getTypeLabel = (type: string) => type === 'earning' ? 'استحقاق' : 'خصم';
  const getCategoryLabel = (cat: string) => {
    const map: Record<string, string> = {
      basic: 'أساسي',
      allowance: 'بدل',
      overtime: 'إضافي',
      attendance: 'حضور',
      tax: 'ضريبة',
      insurance: 'تأمين',
      loan: 'سلفة',
    };
    return map[cat] || cat;
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">الرواتب والكشوفات</h2>
          <p className="text-muted-foreground text-sm">إدارة رواتب الموظفين ومكوناتها</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {arabicMonths.map((m, i) => (
                <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[2024, 2025, 2026].map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={processPayroll}
            disabled={processing || !!payroll}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {processing ? (
              <Loader2 className="h-4 w-4 animate-spin ml-2" />
            ) : (
              <Play className="h-4 w-4 ml-2" />
            )}
            {payroll ? 'تمت المعالجة' : 'معالجة الرواتب'}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">إجمالي الاستحقاقات</p>
                <p className="text-lg font-bold text-emerald-700">
                  {summary ? formatCurrency(summary.totalEarnings) : '—'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
                <TrendingDown className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">إجمالي الخصومات</p>
                <p className="text-lg font-bold text-red-700">
                  {summary ? formatCurrency(summary.totalDeductions) : '—'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <Banknote className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">صافي الرواتب</p>
                <p className="text-lg font-bold text-emerald-700">
                  {summary ? formatCurrency(summary.totalNet) : '—'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">عدد الموظفين</p>
                <p className="text-lg font-bold text-blue-700">
                  {summary?.employeeCount ?? '—'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="payroll" className="space-y-4">
        <TabsList>
          <TabsTrigger value="payroll">كشف الرواتب</TabsTrigger>
          <TabsTrigger value="components">مكونات الرواتب</TabsTrigger>
        </TabsList>

        {/* Payroll Tab */}
        <TabsContent value="payroll">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-base">
                كشف رواتب {arabicMonths[parseInt(selectedMonth) - 1]} {selectedYear}
              </CardTitle>
              {payroll && (
                <div className="flex gap-2">
                  <Button onClick={payAll} variant="outline" size="sm" className="text-emerald-600 border-emerald-300 hover:bg-emerald-50">
                    <CheckCircle2 className="h-4 w-4 ml-1" />
                    صرف الكل
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 ml-1" />
                    تصدير القسائم
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                </div>
              ) : !payroll ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Banknote className="h-12 w-12 mx-auto mb-3 opacity-40" />
                  <p className="text-lg font-medium">لم يتم معالجة كشف الرواتب بعد</p>
                  <p className="text-sm">اضغط على &quot;معالجة الرواتب&quot; لإنشاء كشف رواتب هذا الشهر</p>
                </div>
              ) : (
                <div>
                  <ScrollArea className="max-h-[500px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-right w-8"></TableHead>
                          <TableHead className="text-right">رقم الموظف</TableHead>
                          <TableHead className="text-right">اسم الموظف</TableHead>
                          <TableHead className="text-right">الراتب الأساسي</TableHead>
                          <TableHead className="text-right">إجمالي الاستحقاقات</TableHead>
                          <TableHead className="text-right">إجمالي الخصومات</TableHead>
                          <TableHead className="text-right">صافي الراتب</TableHead>
                          <TableHead className="text-right">الحالة</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payroll.items.map((item) => {
                          const isExpanded = expandedRows.has(item.id);

                          return (
                            <TableRow
                              key={item.id}
                              className="cursor-pointer"
                              onClick={() => toggleRow(item.id)}
                            >
                              <TableCell>
                                {isExpanded ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </TableCell>
                              <TableCell className="font-mono text-sm">{item.employee.employeeId}</TableCell>
                              <TableCell className="font-medium">
                                {item.employee.firstName} {item.employee.lastName}
                              </TableCell>
                              <TableCell>{formatCurrency(item.basicSalary)}</TableCell>
                              <TableCell className="text-emerald-600">{formatCurrency(item.totalEarnings)}</TableCell>
                              <TableCell className="text-red-600">{formatCurrency(item.totalDeductions)}</TableCell>
                              <TableCell className="font-bold">{formatCurrency(item.netSalary)}</TableCell>
                              <TableCell>
                                <Badge
                                  className={item.status === 'paid'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-yellow-100 text-yellow-700'
                                  }
                                >
                                  {item.status === 'paid' ? 'مدفوع' : 'معلق'}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </ScrollArea>

                  {/* Expanded Details */}
                  {payroll.items.map((item) => {
                    if (!expandedRows.has(item.id)) return null;
                    let details: { name: string; type: string; amount: number }[] = [];
                    try {
                      details = item.details ? JSON.parse(item.details) : [];
                    } catch { /* ignore */ }

                    return (
                      <div key={`detail-${item.id}`} className="border-t border-b bg-muted/30 p-4 my-1">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="font-semibold text-sm">
                            {item.employee.firstName} {item.employee.lastName}
                          </span>
                          <span className="text-xs text-muted-foreground">({item.employee.employeeId})</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl">
                          <div>
                            <h4 className="text-sm font-semibold text-emerald-700 mb-2">الاستحقاقات</h4>
                            {details.filter(d => d.type === 'earning').map((d, i) => (
                              <div key={i} className="flex justify-between text-sm py-1">
                                <span className="text-muted-foreground">{d.name}</span>
                                <span className="font-medium text-emerald-600">{formatCurrency(d.amount)}</span>
                              </div>
                            ))}
                            <div className="flex justify-between text-sm py-1 border-t mt-1 pt-1 font-semibold">
                              <span>إجمالي الاستحقاقات</span>
                              <span className="text-emerald-700">{formatCurrency(item.totalEarnings)}</span>
                            </div>
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold text-red-700 mb-2">الخصومات</h4>
                            {details.filter(d => d.type === 'deduction').map((d, i) => (
                              <div key={i} className="flex justify-between text-sm py-1">
                                <span className="text-muted-foreground">{d.name}</span>
                                <span className="font-medium text-red-600">{formatCurrency(d.amount)}</span>
                              </div>
                            ))}
                            <div className="flex justify-between text-sm py-1 border-t mt-1 pt-1 font-semibold">
                              <span>إجمالي الخصومات</span>
                              <span className="text-red-700">{formatCurrency(item.totalDeductions)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 pt-2 border-t flex justify-between items-center max-w-4xl">
                          <span className="font-bold">صافي الراتب</span>
                          <span className="text-lg font-bold text-emerald-700">{formatCurrency(item.netSalary)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Salary Components Tab */}
        <TabsContent value="components">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-base">مكونات الرواتب</CardTitle>
              <Button onClick={() => openComponentDialog()} size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="h-4 w-4 ml-1" />
                إضافة مكون
              </Button>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">اسم المكون</TableHead>
                      <TableHead className="text-right">النوع</TableHead>
                      <TableHead className="text-right">الفئة</TableHead>
                      <TableHead className="text-right">ثابت</TableHead>
                      <TableHead className="text-right">خاضع للضريبة</TableHead>
                      <TableHead className="text-right">القيمة الافتراضية</TableHead>
                      <TableHead className="text-right">عدد الموظفين</TableHead>
                      <TableHead className="text-right">إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {components.map(comp => (
                      <TableRow key={comp.id}>
                        <TableCell className="font-medium">{comp.name}</TableCell>
                        <TableCell>
                          <Badge className={comp.type === 'earning'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-red-100 text-red-700'
                          }>
                            {getTypeLabel(comp.type)}
                          </Badge>
                        </TableCell>
                        <TableCell>{getCategoryLabel(comp.category)}</TableCell>
                        <TableCell>{comp.isFixed ? 'نعم' : 'لا'}</TableCell>
                        <TableCell>{comp.isTaxable ? 'نعم' : 'لا'}</TableCell>
                        <TableCell>{comp.defaultValue > 1 ? formatCurrency(comp.defaultValue) : comp.defaultValue > 0 ? (comp.defaultValue * 100) + '%' : '—'}</TableCell>
                        <TableCell>{comp._count?.employeeComponents ?? 0}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openComponentDialog(comp)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => deleteComponent(comp.id)} className="text-red-600 hover:text-red-700">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Component Dialog */}
      <Dialog open={compDialogOpen} onOpenChange={setCompDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingComponent ? 'تعديل مكون الراتب' : 'إضافة مكون راتب جديد'}</DialogTitle>
            <DialogDescription>
              {editingComponent ? 'قم بتعديل بيانات مكون الراتب' : 'أدخل بيانات مكون الراتب الجديد'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>اسم المكون (عربي)</Label>
                <Input
                  value={compForm.name}
                  onChange={e => setCompForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="مثال: بدل سكن"
                />
              </div>
              <div className="space-y-2">
                <Label>اسم المكون (إنجليزي)</Label>
                <Input
                  value={compForm.nameEn}
                  onChange={e => setCompForm(prev => ({ ...prev, nameEn: e.target.value }))}
                  placeholder="e.g. Housing Allowance"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>النوع</Label>
                <Select value={compForm.type} onValueChange={v => setCompForm(prev => ({ ...prev, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="earning">استحقاق</SelectItem>
                    <SelectItem value="deduction">خصم</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>الفئة</Label>
                <Select value={compForm.category} onValueChange={v => setCompForm(prev => ({ ...prev, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">أساسي</SelectItem>
                    <SelectItem value="allowance">بدل</SelectItem>
                    <SelectItem value="overtime">إضافي</SelectItem>
                    <SelectItem value="attendance">حضور</SelectItem>
                    <SelectItem value="tax">ضريبة</SelectItem>
                    <SelectItem value="insurance">تأمين</SelectItem>
                    <SelectItem value="loan">سلفة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>القيمة الافتراضية</Label>
                <Input
                  type="number"
                  value={compForm.defaultValue}
                  onChange={e => setCompForm(prev => ({ ...prev, defaultValue: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label>الوصف</Label>
                <Input
                  value={compForm.description}
                  onChange={e => setCompForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="وصف اختياري"
                />
              </div>
            </div>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={compForm.isFixed}
                  onChange={e => setCompForm(prev => ({ ...prev, isFixed: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                <span className="text-sm">مبلغ ثابت</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={compForm.isTaxable}
                  onChange={e => setCompForm(prev => ({ ...prev, isTaxable: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                <span className="text-sm">خاضع للضريبة</span>
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompDialogOpen(false)}>إلغاء</Button>
            <Button onClick={saveComponent} className="bg-emerald-600 hover:bg-emerald-700" disabled={!compForm.name}>
              {editingComponent ? 'تحديث' : 'إضافة'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
