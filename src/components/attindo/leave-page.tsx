'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { CalendarDays, Plus, Check, X, Clock, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface LeaveRecord {
  id: string
  employeeId: string
  startDate: string
  endDate: string
  days: number
  status: string
  reason: string
  approvedBy: string
  createdAt: string
  employee: {
    id: string
    employeeId: string
    firstName: string
    lastName: string
    firstNameAr: string
    lastNameAr: string
    department: { id: string; name: string }
  }
  leaveType: {
    id: string
    name: string
    nameAr: string
    isPaid: boolean
  }
}

interface Employee {
  id: string
  employeeId: string
  firstName: string
  lastName: string
}

interface LeaveType {
  id: string
  name: string
  nameAr: string
}

export function LeavePage() {
  const { language } = useAppStore()
  const isRTL = language === 'ar'
  const [leaves, setLeaves] = useState<LeaveRecord[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [form, setForm] = useState({
    employeeId: '',
    typeId: '',
    startDate: '',
    endDate: '',
    days: '1',
    reason: '',
  })

  useEffect(() => { fetchData() }, [statusFilter])

  const fetchData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter && statusFilter !== 'ALL') params.set('status', statusFilter)
      const [leaveRes, empRes] = await Promise.all([
        fetch(`/api/leave?${params}`),
        fetch('/api/employees'),
      ])
      if (leaveRes.ok) {
        const data = await leaveRes.json()
        setLeaves(data.leaves || data || [])
      }
      if (empRes.ok) {
        const data = await empRes.json()
        const empList = data.employees || data || []
        setEmployees(empList)
      }
      // Fetch leave types from seed data - we'll include them in the leave API
      // For now, use a local list
      setLeaveTypes([
        { id: 'annual', name: 'Annual Leave', nameAr: 'إجازة سنوية' },
        { id: 'sick', name: 'Sick Leave', nameAr: 'إجازة مرضية' },
        { id: 'maternity', name: 'Maternity Leave', nameAr: 'إجازة أمومة' },
        { id: 'unpaid', name: 'Unpaid Leave', nameAr: 'إجازة بدون راتب' },
      ])
    } catch { /* ignore */ } finally { setLoading(false) }
  }

  const handleSubmit = async () => {
    setSaving(true)
    try {
      // Use the first leave type from the database or the selected one
      const typeId = form.typeId || leaves[0]?.leaveType?.id
      if (!typeId) {
        toast.error(isRTL ? 'لا يوجد نوع إجازة' : 'No leave type found')
        setSaving(false)
        return
      }
      const res = await fetch('/api/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: form.employeeId,
          typeId,
          startDate: form.startDate,
          endDate: form.endDate,
          days: parseInt(form.days) || 1,
          reason: form.reason,
        }),
      })
      if (res.ok) {
        toast.success(isRTL ? 'تم إرسال طلب الإجازة' : 'Leave request submitted')
        setDialogOpen(false)
        setForm({ employeeId: '', typeId: '', startDate: '', endDate: '', days: '1', reason: '' })
        fetchData()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to submit leave request')
      }
    } catch {
      toast.error('Network error')
    } finally { setSaving(false) }
  }

  const handleApprove = async (id: string, action: 'approve' | 'reject') => {
    try {
      const res = await fetch('/api/leave', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action, approvedBy: 'Administrator' }),
      })
      if (res.ok) {
        toast.success(action === 'approve'
          ? isRTL ? 'تمت الموافقة' : 'Leave approved'
          : isRTL ? 'تم الرفض' : 'Leave rejected')
        fetchData()
      }
    } catch { /* ignore */ }
  }

  const pendingCount = leaves.filter((l) => l.status === 'PENDING').length
  const approvedCount = leaves.filter((l) => l.status === 'APPROVED').length

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
      APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      REJECTED: 'bg-red-50 text-red-700 border-red-200',
    }
    return map[status] || 'bg-slate-50 text-slate-600 border-slate-200'
  }

  const statusLabel = (status: string) => {
    const map: Record<string, string> = {
      PENDING: isRTL ? 'معلق' : 'Pending',
      APPROVED: isRTL ? 'موافق' : 'Approved',
      REJECTED: isRTL ? 'مرفوض' : 'Rejected',
    }
    return map[status] || status
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-teal-600" />
            {isRTL ? 'إدارة الإجازات' : 'Leave Management'}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {isRTL ? 'إدارة طلبات الإجازات والموافقة عليها' : 'Manage and approve leave requests'}
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-sm">
              <Plus className="w-4 h-4 mr-2" />
              {isRTL ? 'طلب إجازة' : 'Request Leave'}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle>{isRTL ? 'طلب إجازة جديد' : 'New Leave Request'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>{isRTL ? 'الموظف' : 'Employee'}</Label>
                <Select value={form.employeeId} onValueChange={(val) => setForm({ ...form, employeeId: val })}>
                  <SelectTrigger><SelectValue placeholder={isRTL ? 'اختر الموظف' : 'Select employee'} /></SelectTrigger>
                  <SelectContent>
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.employeeId})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? 'نوع الإجازة' : 'Leave Type'}</Label>
                <Select value={form.typeId} onValueChange={(val) => setForm({ ...form, typeId: val })}>
                  <SelectTrigger><SelectValue placeholder={isRTL ? 'اختر النوع' : 'Select type'} /></SelectTrigger>
                  <SelectContent>
                    {leaveTypes.map((lt) => (
                      <SelectItem key={lt.id} value={lt.id}>{isRTL ? lt.nameAr : lt.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>{isRTL ? 'تاريخ البداية' : 'Start Date'}</Label>
                  <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? 'تاريخ النهاية' : 'End Date'}</Label>
                  <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? 'عدد الأيام' : 'Days'}</Label>
                <Input type="number" min="1" value={form.days} onChange={(e) => setForm({ ...form, days: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? 'السبب' : 'Reason'}</Label>
                <Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder={isRTL ? 'سبب الإجازة...' : 'Reason for leave...'} />
              </div>
              <Button
                onClick={handleSubmit}
                disabled={saving || !form.employeeId || !form.startDate || !form.endDate}
                className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white"
              >
                {saving ? (isRTL ? 'جاري الإرسال...' : 'Submitting...') : (isRTL ? 'إرسال الطلب' : 'Submit Request')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-amber-50 p-2 rounded-lg"><Clock className="w-4 h-4 text-amber-600" /></div>
            <div>
              <p className="text-xs text-slate-500">{isRTL ? 'معلق' : 'Pending'}</p>
              <p className="text-xl font-bold text-slate-900">{pendingCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-emerald-50 p-2 rounded-lg"><Check className="w-4 h-4 text-emerald-600" /></div>
            <div>
              <p className="text-xs text-slate-500">{isRTL ? 'موافق' : 'Approved'}</p>
              <p className="text-xl font-bold text-slate-900">{approvedCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-slate-50 p-2 rounded-lg"><CalendarDays className="w-4 h-4 text-slate-600" /></div>
            <div>
              <p className="text-xs text-slate-500">{isRTL ? 'الإجمالي' : 'Total'}</p>
              <p className="text-xl font-bold text-slate-900">{leaves.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="w-40 bg-white border-slate-200">
          <SelectValue placeholder={isRTL ? 'الحالة' : 'Status'} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">{isRTL ? 'الكل' : 'All'}</SelectItem>
          <SelectItem value="PENDING">{isRTL ? 'معلق' : 'Pending'}</SelectItem>
          <SelectItem value="APPROVED">{isRTL ? 'موافق' : 'Approved'}</SelectItem>
          <SelectItem value="REJECTED">{isRTL ? 'مرفوض' : 'Rejected'}</SelectItem>
        </SelectContent>
      </Select>

      {/* Table */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center"><div className="animate-spin w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full mx-auto" /></div>
          ) : leaves.length === 0 ? (
            <div className="p-12 text-center">
              <CalendarDays className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">{isRTL ? 'لا توجد طلبات إجازة' : 'No leave requests'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80">
                    <TableHead className="text-xs font-semibold text-slate-600">{isRTL ? 'الموظف' : 'Employee'}</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-600">{isRTL ? 'النوع' : 'Type'}</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-600">{isRTL ? 'من' : 'From'}</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-600">{isRTL ? 'إلى' : 'To'}</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-600">{isRTL ? 'الأيام' : 'Days'}</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-600">{isRTL ? 'الحالة' : 'Status'}</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-600">{isRTL ? 'السبب' : 'Reason'}</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-600">{isRTL ? 'إجراء' : 'Action'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaves.map((leave) => (
                    <TableRow key={leave.id} className="hover:bg-slate-50/50">
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium text-slate-800">{leave.employee?.firstName} {leave.employee?.lastName}</p>
                          <p className="text-xs text-slate-400">{leave.employee?.department?.name}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">{isRTL ? leave.leaveType?.nameAr : leave.leaveType?.name}</TableCell>
                      <TableCell className="text-sm text-slate-600">{new Date(leave.startDate).toLocaleDateString()}</TableCell>
                      <TableCell className="text-sm text-slate-600">{new Date(leave.endDate).toLocaleDateString()}</TableCell>
                      <TableCell className="text-sm font-medium text-slate-800">{leave.days}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${statusBadge(leave.status)}`}>
                          {statusLabel(leave.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 max-w-[150px] truncate">{leave.reason || '-'}</TableCell>
                      <TableCell>
                        {leave.status === 'PENDING' && (
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant="outline" className="h-7 w-7 p-0 border-emerald-200 hover:bg-emerald-50" onClick={() => handleApprove(leave.id, 'approve')}>
                              <Check className="w-3 h-3 text-emerald-600" />
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 w-7 p-0 border-red-200 hover:bg-red-50" onClick={() => handleApprove(leave.id, 'reject')}>
                              <X className="w-3 h-3 text-red-600" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
