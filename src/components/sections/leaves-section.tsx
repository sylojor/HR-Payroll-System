'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Plus, Check, X, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';

interface LeaveRequest {
  id: string; employee: { firstName: string; lastName: string; employeeId: string }; leaveType: { name: string };
  startDate: string; endDate: string; totalDays: number; reason: string | null; status: string; rejectionReason: string | null;
}

interface LeaveType { id: string; name: string; nameEn: string | null; defaultDays: number; isPaid: boolean; requiresApproval: boolean; carryForward: boolean }

interface Employee { id: string; firstName: string; lastName: string; employeeId: string }

const statusMap: Record<string, { label: string; className: string }> = {
  pending: { label: 'معلقة', className: 'bg-yellow-100 text-yellow-700' },
  approved: { label: 'مقبولة', className: 'bg-emerald-100 text-emerald-700' },
  rejected: { label: 'مرفوضة', className: 'bg-red-100 text-red-700' },
};

export function LeavesSection() {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [showNewType, setShowNewType] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [rejectId, setRejectId] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  const fetchLeaves = async () => {
    const params = new URLSearchParams();
    if (statusFilter !== 'all') params.set('status', statusFilter);
    const res = await fetch(`/api/leaves?${params}`);
    const data = await res.json();
    setLeaves(data.requests || data);
  };

  const fetchLeaveTypes = async () => {
    const res = await fetch('/api/leaves/types');
    const data = await res.json();
    setLeaveTypes(data.types || data);
  };

  const fetchEmployees = async () => {
    const res = await fetch('/api/employees?limit=100');
    const data = await res.json();
    setEmployees(data.employees || []);
  };

  useEffect(() => {
    const params = new URLSearchParams();
    if (statusFilter !== 'all') params.set('status', statusFilter);
    Promise.all([
      fetch(`/api/leaves?${params}`).then(r => r.json()),
      fetch('/api/leaves/types').then(r => r.json()),
      fetch('/api/employees?limit=100').then(r => r.json()),
    ]).then(([leavesData, typesData, empData]) => {
      setLeaves(leavesData.requests || leavesData);
      setLeaveTypes(typesData.types || typesData);
      setEmployees(empData.employees || []);
      setLoading(false);
    });
  }, [statusFilter]);

  const handleApprove = async (id: string) => {
    await fetch(`/api/leaves/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'approved' }) });
    toast.success('تم قبول الإجازة');
    fetchLeaves();
  };

  const handleReject = async () => {
    await fetch(`/api/leaves/${rejectId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'rejected', rejectionReason: rejectReason }) });
    toast.success('تم رفض الإجازة');
    setShowReject(false);
    setRejectReason('');
    fetchLeaves();
  };

  const handleNewRequest = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body = { employeeId: fd.get('employeeId'), leaveTypeId: fd.get('leaveTypeId'), startDate: fd.get('startDate'), endDate: fd.get('endDate'), totalDays: Number(fd.get('totalDays')), reason: fd.get('reason') };
    await fetch('/api/leaves', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    toast.success('تم إنشاء طلب الإجازة');
    setShowNewRequest(false);
    fetchLeaves();
  };

  const handleNewType = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body = { name: fd.get('name'), nameEn: fd.get('nameEn'), defaultDays: Number(fd.get('defaultDays')), isPaid: fd.get('isPaid') === 'true', requiresApproval: fd.get('requiresApproval') === 'true', carryForward: fd.get('carryForward') === 'true' };
    await fetch('/api/leaves/types', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    toast.success('تم إضافة نوع الإجازة');
    setShowNewType(false);
    fetchLeaveTypes();
  };

  if (loading) return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <Tabs defaultValue="requests">
        <TabsList>
          <TabsTrigger value="requests">طلبات الإجازة</TabsTrigger>
          <TabsTrigger value="types">أنواع الإجازات</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-4 mt-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-2">
              {['all', 'pending', 'approved', 'rejected'].map(s => (
                <Button key={s} variant={statusFilter === s ? 'default' : 'outline'} size="sm" onClick={() => setStatusFilter(s)} className={statusFilter === s ? 'bg-emerald-600 hover:bg-emerald-700' : ''}>
                  {s === 'all' ? 'الكل' : statusMap[s]?.label}
                </Button>
              ))}
            </div>
            <div className="flex-1" />
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setShowNewRequest(true)}>
              <Plus className="h-4 w-4 ml-2" /> طلب جديد
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الموظف</TableHead>
                    <TableHead>نوع الإجازة</TableHead>
                    <TableHead>من</TableHead>
                    <TableHead>إلى</TableHead>
                    <TableHead>الأيام</TableHead>
                    <TableHead>السبب</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaves.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">لا توجد طلبات إجازة</TableCell></TableRow>
                  ) : leaves.map(l => (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium">{l.employee.firstName} {l.employee.lastName}</TableCell>
                      <TableCell>{l.leaveType.name}</TableCell>
                      <TableCell>{new Date(l.startDate).toLocaleDateString('ar-JO')}</TableCell>
                      <TableCell>{new Date(l.endDate).toLocaleDateString('ar-JO')}</TableCell>
                      <TableCell>{l.totalDays}</TableCell>
                      <TableCell className="max-w-[150px] truncate">{l.reason || '—'}</TableCell>
                      <TableCell><Badge className={statusMap[l.status]?.className}>{statusMap[l.status]?.label}</Badge></TableCell>
                      <TableCell>
                        {l.status === 'pending' && (
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-600" onClick={() => handleApprove(l.id)}><Check className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" onClick={() => { setRejectId(l.id); setShowReject(true); }}><X className="h-4 w-4" /></Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="types" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setShowNewType(true)}>
              <Plus className="h-4 w-4 ml-2" /> إضافة نوع
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الاسم</TableHead>
                    <TableHead>الأيام الافتراضية</TableHead>
                    <TableHead>مدفوعة</TableHead>
                    <TableHead>تحتاج موافقة</TableHead>
                    <TableHead>تراكمية</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaveTypes.map(lt => (
                    <TableRow key={lt.id}>
                      <TableCell className="font-medium">{lt.name}</TableCell>
                      <TableCell>{lt.defaultDays}</TableCell>
                      <TableCell><Badge className={lt.isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'}>{lt.isPaid ? 'نعم' : 'لا'}</Badge></TableCell>
                      <TableCell><Badge className={lt.requiresApproval ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}>{lt.requiresApproval ? 'نعم' : 'لا'}</Badge></TableCell>
                      <TableCell><Badge className={lt.carryForward ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'}>{lt.carryForward ? 'نعم' : 'لا'}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* New Request Dialog */}
      <Dialog open={showNewRequest} onOpenChange={setShowNewRequest}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>طلب إجازة جديد</DialogTitle></DialogHeader>
          <form onSubmit={handleNewRequest} className="space-y-4">
            <div><Label>الموظف</Label><Select name="employeeId" required><SelectTrigger><SelectValue placeholder="اختر الموظف" /></SelectTrigger><SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.employeeId})</SelectItem>)}</SelectContent></Select></div>
            <div><Label>نوع الإجازة</Label><Select name="leaveTypeId" required><SelectTrigger><SelectValue placeholder="اختر النوع" /></SelectTrigger><SelectContent>{leaveTypes.map(lt => <SelectItem key={lt.id} value={lt.id}>{lt.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>من تاريخ</Label><Input type="date" name="startDate" required /></div>
              <div><Label>إلى تاريخ</Label><Input type="date" name="endDate" required /></div>
            </div>
            <div><Label>عدد الأيام</Label><Input type="number" name="totalDays" min="1" required /></div>
            <div><Label>السبب</Label><Textarea name="reason" /></div>
            <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700">إرسال الطلب</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* New Type Dialog */}
      <Dialog open={showNewType} onOpenChange={setShowNewType}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>إضافة نوع إجازة</DialogTitle></DialogHeader>
          <form onSubmit={handleNewType} className="space-y-4">
            <div><Label>الاسم بالعربي</Label><Input name="name" required /></div>
            <div><Label>الاسم بالإنجليزي</Label><Input name="nameEn" /></div>
            <div><Label>الأيام الافتراضية</Label><Input type="number" name="defaultDays" defaultValue="0" required /></div>
            <div><Label>مدفوعة الراتب</Label><Select name="isPaid" defaultValue="true"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="true">نعم</SelectItem><SelectItem value="false">لا</SelectItem></SelectContent></Select></div>
            <div><Label>تحتاج موافقة</Label><Select name="requiresApproval" defaultValue="true"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="true">نعم</SelectItem><SelectItem value="false">لا</SelectItem></SelectContent></Select></div>
            <div><Label>تراكمية</Label><Select name="carryForward" defaultValue="false"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="true">نعم</SelectItem><SelectItem value="false">لا</SelectItem></SelectContent></Select></div>
            <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700">إضافة</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showReject} onOpenChange={setShowReject}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>سبب الرفض</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="أدخل سبب الرفض..." />
            <Button onClick={handleReject} className="w-full bg-red-600 hover:bg-red-700">رفض الإجازة</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
