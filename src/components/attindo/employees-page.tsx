'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Users,
  Plus,
  Search,
  Lock,
  UserCheck,
  UserX,
  UserMinus,
  CalendarDays,
} from 'lucide-react'
import { toast } from 'sonner'

interface Employee {
  id: string
  employeeId: string
  firstName: string
  lastName: string
  firstNameAr: string
  lastNameAr: string
  email: string
  phone: string
  department: { id: string; name: string }
  position: { id: string; title: string }
  status: string
  salary: number
  hireDate: string
}

interface Department {
  id: string
  name: string
}

interface Position {
  id: string
  title: string
  departmentId: string
}

export function EmployeesPage() {
  const { language, licenseStatus } = useAppStore()
  const isRTL = language === 'ar'
  const [employees, setEmployees] = useState<Employee[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    firstNameAr: '',
    lastNameAr: '',
    email: '',
    phone: '',
    departmentId: '',
    positionId: '',
    salary: '',
    hireDate: new Date().toISOString().split('T')[0],
  })

  const isLocked = !licenseStatus.hr

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [empRes, deptRes, posRes] = await Promise.all([
        fetch('/api/employees'),
        fetch('/api/departments'),
        fetch('/api/positions'),
      ])
      if (empRes.ok) {
          const empData = await empRes.json()
          setEmployees(empData.employees || empData)
        }
      if (deptRes.ok) setDepartments(await deptRes.json())
      if (posRes.ok) setPositions(await posRes.json())
    } catch {
      // handle error
    } finally {
      setLoading(false)
    }
  }

  const filteredPositions = positions.filter((p) => p.departmentId === form.departmentId)

  const filtered = employees.filter((e) => {
    const q = search.toLowerCase()
    return (
      e.firstName.toLowerCase().includes(q) ||
      e.lastName.toLowerCase().includes(q) ||
      e.employeeId.toLowerCase().includes(q) ||
      e.email.toLowerCase().includes(q)
    )
  })

  const statusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
      case 'INACTIVE':
        return <UserMinus className="w-3.5 h-3.5 text-slate-400" />
      case 'TERMINATED':
        return <UserX className="w-3.5 h-3.5 text-red-500" />
      case 'ON_LEAVE':
        return <CalendarDays className="w-3.5 h-3.5 text-amber-500" />
      default:
        return null
    }
  }

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      INACTIVE: 'bg-slate-50 text-slate-600 border-slate-200',
      TERMINATED: 'bg-red-50 text-red-700 border-red-200',
      ON_LEAVE: 'bg-amber-50 text-amber-700 border-amber-200',
    }
    return map[status] || map.INACTIVE
  }

  const handleSubmit = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          salary: parseFloat(form.salary) || 0,
        }),
      })
      if (res.ok) {
        toast.success(isRTL ? 'تم إضافة الموظف' : 'Employee added successfully')
        setDialogOpen(false)
        setForm({
          firstName: '',
          lastName: '',
          firstNameAr: '',
          lastNameAr: '',
          email: '',
          phone: '',
          departmentId: '',
          positionId: '',
          salary: '',
          hireDate: new Date().toISOString().split('T')[0],
        })
        fetchData()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to add employee')
      }
    } catch {
      toast.error('Network error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-teal-600" />
            {isRTL ? 'الموظفين' : 'Employees'}
            {isLocked && <Lock className="w-4 h-4 text-amber-500" />}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {isRTL
              ? `${employees.length} موظف مسجل`
              : `${employees.length} employees registered`}
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-sm"
              disabled={isLocked}
            >
              <Plus className="w-4 h-4 mr-2" />
              {isRTL ? 'إضافة موظف' : 'Add Employee'}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{isRTL ? 'إضافة موظف جديد' : 'Add New Employee'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>{isRTL ? 'الاسم الأول' : 'First Name'}</Label>
                  <Input
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    placeholder={isRTL ? 'الاسم الأول' : 'First name'}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? 'الاسم الأخير' : 'Last Name'}</Label>
                  <Input
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    placeholder={isRTL ? 'الاسم الأخير' : 'Last name'}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>{isRTL ? 'الاسم الأول (عربي)' : 'First Name (Arabic)'}</Label>
                  <Input
                    dir="rtl"
                    value={form.firstNameAr}
                    onChange={(e) => setForm({ ...form, firstNameAr: e.target.value })}
                    placeholder="الاسم الأول"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? 'الاسم الأخير (عربي)' : 'Last Name (Arabic)'}</Label>
                  <Input
                    dir="rtl"
                    value={form.lastNameAr}
                    onChange={(e) => setForm({ ...form, lastNameAr: e.target.value })}
                    placeholder="الاسم الأخير"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="email@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? 'الهاتف' : 'Phone'}</Label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+962..."
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? 'القسم' : 'Department'}</Label>
                <Select
                  value={form.departmentId}
                  onValueChange={(val) => setForm({ ...form, departmentId: val, positionId: '' })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={isRTL ? 'اختر القسم' : 'Select department'} />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? 'المنصب' : 'Position'}</Label>
                <Select
                  value={form.positionId}
                  onValueChange={(val) => setForm({ ...form, positionId: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={isRTL ? 'اختر المنصب' : 'Select position'} />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredPositions.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>{isRTL ? 'الراتب (د.ا)' : 'Salary (JOD)'}</Label>
                  <Input
                    type="number"
                    value={form.salary}
                    onChange={(e) => setForm({ ...form, salary: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? 'تاريخ التعيين' : 'Hire Date'}</Label>
                  <Input
                    type="date"
                    value={form.hireDate}
                    onChange={(e) => setForm({ ...form, hireDate: e.target.value })}
                  />
                </div>
              </div>
              <Button
                onClick={handleSubmit}
                disabled={saving || !form.firstName || !form.lastName || !form.departmentId || !form.positionId}
                className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white"
              >
                {saving
                  ? isRTL
                    ? 'جاري الحفظ...'
                    : 'Saving...'
                  : isRTL
                    ? 'إضافة الموظف'
                    : 'Add Employee'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLocked && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 flex items-center gap-3">
            <Lock className="w-5 h-5 text-amber-600" />
            <div>
              <p className="text-sm font-medium text-amber-800">
                {isRTL ? 'ترخيص HR غير مفعل' : 'HR License Not Active'}
              </p>
              <p className="text-xs text-amber-600">
                {isRTL
                  ? 'يرجى تفعيل ترخيص HR للوصول إلى هذه الميزة'
                  : 'Please activate an HR license to access this feature'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder={isRTL ? 'بحث عن موظف...' : 'Search employees...'}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-white border-slate-200"
        />
      </div>

      {/* Table */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-slate-400">
              <div className="animate-spin w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full mx-auto" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">
                {search
                  ? isRTL
                    ? 'لا توجد نتائج'
                    : 'No results found'
                  : isRTL
                    ? 'لا يوجد موظفين بعد'
                    : 'No employees yet'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80">
                    <TableHead className="text-xs font-semibold text-slate-600">ID</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-600">
                      {isRTL ? 'الاسم' : 'Name'}
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-slate-600">
                      {isRTL ? 'القسم' : 'Department'}
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-slate-600">
                      {isRTL ? 'المنصب' : 'Position'}
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-slate-600">
                      {isRTL ? 'الحالة' : 'Status'}
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-slate-600 text-right">
                      {isRTL ? 'الراتب' : 'Salary'}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((emp) => (
                    <TableRow key={emp.id} className="hover:bg-slate-50/50">
                      <TableCell className="text-xs font-mono text-slate-500">
                        {emp.employeeId}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium text-slate-800">
                            {emp.firstName} {emp.lastName}
                          </p>
                          {(emp.firstNameAr || emp.lastNameAr) && (
                            <p className="text-xs text-slate-400" dir="rtl">
                              {emp.firstNameAr} {emp.lastNameAr}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">{emp.department?.name || '-'}</TableCell>
                      <TableCell className="text-sm text-slate-600">{emp.position?.title || '-'}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[10px] gap-1 ${statusBadge(emp.status)}`}
                        >
                          {statusIcon(emp.status)}
                          {emp.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm font-medium text-slate-800 text-right">
                        {emp.salary.toLocaleString()} JOD
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
