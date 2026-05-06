'use client';

import { useEffect, useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Plus, Pencil, Trash2, ChevronLeft, ChevronRight, Users } from 'lucide-react';

interface Employee {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  status: string;
  hireDate: string;
  departmentId: string | null;
  positionId: string | null;
  department: { id: string; name: string } | null;
  position: { id: string; title: string } | null;
  gender: string;
  address: string | null;
  city: string | null;
  nationalId: string | null;
  bankName: string | null;
  bankAccount: string | null;
  iban: string | null;
  workScheduleId: string | null;
  fingerprintId: string | null;
}

interface Department { id: string; name: string; }
interface Position { id: string; title: string; departmentId: string; }

const statusConfig: Record<string, { label: string; className: string }> = {
  active: { label: 'نشط', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  on_leave: { label: 'في إجازة', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  terminated: { label: 'مفصول', className: 'bg-red-100 text-red-800 border-red-200' },
};

const emptyForm = {
  employeeId: '', firstName: '', lastName: '', email: '', phone: '', gender: 'male',
  departmentId: '', positionId: '', status: 'active', hireDate: '',
  address: '', city: '', nationalId: '', bankName: '', bankAccount: '', iban: '',
  workScheduleId: '', fingerprintId: '',
};

export function EmployeesSection() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [fetchVersion, setFetchVersion] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const params = new URLSearchParams({ page: String(page), limit: '8' });
    if (search) params.set('search', search);
    if (filterDept) params.set('departmentId', filterDept);
    if (filterStatus) params.set('status', filterStatus);

    fetch(`/api/employees?${params}`, { signal: ctrl.signal })
      .then(r => r.json())
      .then(data => {
        setEmployees(data.employees || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotal(data.pagination?.total || 0);
        setLoading(false);
      })
      .catch(e => { if (e.name !== 'AbortError') setLoading(false); });

    return () => { ctrl.abort(); };
  }, [page, search, filterDept, filterStatus, fetchVersion]);

  useEffect(() => {
    fetch('/api/departments').then(r => r.json()).then(d => setDepartments(d)).catch(() => {});
    fetch('/api/positions').then(r => r.json()).then(d => setPositions(d)).catch(() => {});
  }, []);

  const refresh = () => {
    setLoading(true);
    setFetchVersion(v => v + 1);
  };

  const openAdd = () => { setEditingId(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (emp: Employee) => {
    setEditingId(emp.id);
    setForm({
      employeeId: emp.employeeId, firstName: emp.firstName, lastName: emp.lastName,
      email: emp.email || '', phone: emp.phone || '', gender: emp.gender,
      departmentId: emp.departmentId || '', positionId: emp.positionId || '',
      status: emp.status, hireDate: emp.hireDate ? new Date(emp.hireDate).toISOString().split('T')[0] : '',
      address: emp.address || '', city: emp.city || '', nationalId: emp.nationalId || '',
      bankName: emp.bankName || '', bankAccount: emp.bankAccount || '',
      iban: emp.iban || '', workScheduleId: emp.workScheduleId || '', fingerprintId: emp.fingerprintId || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.firstName || !form.lastName) return;
    setSaving(true);
    try {
      if (editingId) {
        await fetch(`/api/employees/${editingId}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
        });
      } else {
        await fetch('/api/employees', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
        });
      }
      setDialogOpen(false);
      refresh();
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الموظف؟')) return;
    await fetch(`/api/employees/${id}`, { method: 'DELETE' });
    refresh();
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
    setLoading(true);
  };

  const handleDeptChange = (v: string) => {
    setFilterDept(v === 'all' ? '' : v);
    setPage(1);
    setLoading(true);
  };

  const handleStatusChange = (v: string) => {
    setFilterStatus(v === 'all' ? '' : v);
    setPage(1);
    setLoading(true);
  };

  const filteredPositions = positions.filter(p => !form.departmentId || p.departmentId === form.departmentId);

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header & Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg">الموظفين</h3>
                <p className="text-xs text-muted-foreground">{total.toLocaleString('ar-JO')} موظف</p>
              </div>
            </div>
            <Button onClick={openAdd} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
              <Plus className="h-4 w-4" />
              إضافة موظف
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="بحث بالاسم أو الرقم..." className="pr-9" value={search} onChange={e => handleSearchChange(e.target.value)} />
            </div>
            <Select value={filterDept} onValueChange={handleDeptChange}>
              <SelectTrigger><SelectValue placeholder="جميع الأقسام" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الأقسام</SelectItem>
                {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={handleStatusChange}>
              <SelectTrigger><SelectValue placeholder="جميع الحالات" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="active">نشط</SelectItem>
                <SelectItem value="on_leave">في إجازة</SelectItem>
                <SelectItem value="terminated">مفصول</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">رقم الموظف</TableHead>
                  <TableHead className="text-right">الاسم</TableHead>
                  <TableHead className="text-right">القسم</TableHead>
                  <TableHead className="text-right">المنصب</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">الهاتف</TableHead>
                  <TableHead className="text-right">تاريخ التعيين</TableHead>
                  <TableHead className="text-right">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      {[...Array(8)].map((_, j) => (
                        <TableCell key={j}><div className="h-5 bg-muted rounded animate-pulse" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : employees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">لا يوجد موظفين</TableCell>
                  </TableRow>
                ) : (
                  employees.map((emp) => (
                    <TableRow key={emp.id} className="hover:bg-muted/50">
                      <TableCell className="font-mono text-sm">{emp.employeeId}</TableCell>
                      <TableCell className="font-medium">{emp.firstName} {emp.lastName}</TableCell>
                      <TableCell>{emp.department?.name || '—'}</TableCell>
                      <TableCell>{emp.position?.title || '—'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusConfig[emp.status]?.className || ''}>
                          {statusConfig[emp.status]?.label || emp.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{emp.phone || '—'}</TableCell>
                      <TableCell className="text-sm">{new Date(emp.hireDate).toLocaleDateString('ar-JO')}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(emp)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700" onClick={() => handleDelete(emp.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <p className="text-sm text-muted-foreground">
                صفحة {page.toLocaleString('ar-JO')} من {totalPages.toLocaleString('ar-JO')}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => { setPage(p => p - 1); setLoading(true); }}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => { setPage(p => p + 1); setLoading(true); }}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingId ? 'تعديل موظف' : 'إضافة موظف جديد'}</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="basic" className="mt-2">
            <TabsList className="w-full">
              <TabsTrigger value="basic" className="flex-1">معلومات أساسية</TabsTrigger>
              <TabsTrigger value="job" className="flex-1">معلومات الوظيفة</TabsTrigger>
              <TabsTrigger value="financial" className="flex-1">معلومات مالية</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-3 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>رقم الموظف</Label><Input value={form.employeeId} onChange={e => setForm({...form, employeeId: e.target.value})} placeholder="تلقائي" /></div>
                <div><Label>الجنس</Label>
                  <Select value={form.gender} onValueChange={v => setForm({...form, gender: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">ذكر</SelectItem>
                      <SelectItem value="female">أنثى</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>الاسم الأول *</Label><Input value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} /></div>
                <div><Label>اسم العائلة *</Label><Input value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>البريد الإلكتروني</Label><Input value={form.email} onChange={e => setForm({...form, email: e.target.value})} type="email" /></div>
                <div><Label>رقم الهاتف</Label><Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>الرقم الوطني</Label><Input value={form.nationalId} onChange={e => setForm({...form, nationalId: e.target.value})} /></div>
                <div><Label>المدينة</Label><Input value={form.city} onChange={e => setForm({...form, city: e.target.value})} /></div>
              </div>
              <div><Label>العنوان</Label><Input value={form.address} onChange={e => setForm({...form, address: e.target.value})} /></div>
            </TabsContent>

            <TabsContent value="job" className="space-y-3 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>القسم</Label>
                  <Select value={form.departmentId || '_none'} onValueChange={v => setForm({...form, departmentId: v === '_none' ? '' : v, positionId: ''})}>
                    <SelectTrigger><SelectValue placeholder="اختر القسم" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">بدون قسم</SelectItem>
                      {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>المنصب</Label>
                  <Select value={form.positionId || '_none'} onValueChange={v => setForm({...form, positionId: v === '_none' ? '' : v})}>
                    <SelectTrigger><SelectValue placeholder="اختر المنصب" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">بدون منصب</SelectItem>
                      {filteredPositions.map(p => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>تاريخ التعيين</Label><Input type="date" value={form.hireDate} onChange={e => setForm({...form, hireDate: e.target.value})} /></div>
                <div><Label>الحالة</Label>
                  <Select value={form.status} onValueChange={v => setForm({...form, status: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">نشط</SelectItem>
                      <SelectItem value="on_leave">في إجازة</SelectItem>
                      <SelectItem value="terminated">مفصول</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>رقم البصمة</Label><Input value={form.fingerprintId} onChange={e => setForm({...form, fingerprintId: e.target.value})} /></div>
            </TabsContent>

            <TabsContent value="financial" className="space-y-3 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>اسم البنك</Label><Input value={form.bankName} onChange={e => setForm({...form, bankName: e.target.value})} /></div>
                <div><Label>رقم الحساب</Label><Input value={form.bankAccount} onChange={e => setForm({...form, bankAccount: e.target.value})} /></div>
              </div>
              <div><Label>رقم الآيبان</Label><Input value={form.iban} onChange={e => setForm({...form, iban: e.target.value})} /></div>
            </TabsContent>
          </Tabs>
          <DialogFooter className="mt-4 gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
            <Button onClick={handleSave} disabled={saving || !form.firstName || !form.lastName} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {saving ? 'جاري الحفظ...' : editingId ? 'تحديث' : 'إضافة'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
