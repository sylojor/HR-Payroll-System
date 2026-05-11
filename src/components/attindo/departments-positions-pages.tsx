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
import { Building2, Briefcase, Plus, Lock } from 'lucide-react'
import { toast } from 'sonner'

interface Department {
  id: string
  name: string
  nameAr: string
  description: string
  _count?: { employees: number; positions: number }
}

interface Position {
  id: string
  title: string
  titleAr: string
  departmentId: string
  minSalary: number
  maxSalary: number
  department?: { id: string; name: string }
  _count?: { employees: number }
}

export function DepartmentsPage() {
  const { language } = useAppStore()
  const isRTL = language === 'ar'
  // Departments are free - no license restriction
  const isLocked = false
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', nameAr: '', description: '' })

  useEffect(() => {
    fetchDepartments()
  }, [])

  const fetchDepartments = async () => {
    try {
      const res = await fetch('/api/departments')
      if (res.ok) setDepartments(await res.json())
    } catch {
      // handle
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        toast.success(isRTL ? 'تم إضافة القسم' : 'Department added successfully')
        setDialogOpen(false)
        setForm({ name: '', nameAr: '', description: '' })
        fetchDepartments()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed')
      }
    } catch {
      toast.error('Network error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-teal-600" />
            {isRTL ? 'الأقسام' : 'Departments'}
            {isLocked && <Lock className="w-4 h-4 text-amber-500" />}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {isRTL ? `عدد الأقسام: ${departments.length}` : `${departments.length} departments`}
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-sm"
              disabled={isLocked}
            >
              <Plus className="w-4 h-4 mr-2" />
              {isRTL ? 'إضافة قسم' : 'Add Department'}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{isRTL ? 'إضافة قسم جديد' : 'Add New Department'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>{isRTL ? 'اسم القسم' : 'Department Name'}</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={isRTL ? 'اسم القسم' : 'Department name'} />
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? 'اسم القسم (عربي)' : 'Name (Arabic)'}</Label>
                <Input dir="rtl" value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} placeholder="اسم القسم" />
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? 'الوصف' : 'Description'}</Label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder={isRTL ? 'وصف القسم' : 'Description'} />
              </div>
              <Button onClick={handleSubmit} disabled={saving || !form.name} className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white">
                {saving ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : isRTL ? 'إضافة' : 'Add Department'}
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
              <p className="text-sm font-medium text-amber-800">{isRTL ? 'ترخيص HR غير مفعل' : 'HR License Not Active'}</p>
              <p className="text-xs text-amber-600">{isRTL ? 'يرجى تفعيل ترخيص HR للوصول إلى هذه الميزة' : 'Please activate an HR license to access this feature'}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-0 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center"><div className="animate-spin w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full mx-auto" /></div>
          ) : departments.length === 0 ? (
            <div className="p-12 text-center">
              <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">{isRTL ? 'لا توجد أقسام بعد' : 'No departments yet'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80">
                    <TableHead className="text-xs font-semibold text-slate-600">{isRTL ? 'الاسم' : 'Name'}</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-600">{isRTL ? 'الاسم (عربي)' : 'Name (Arabic)'}</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-600">{isRTL ? 'الوصف' : 'Description'}</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-600 text-right">{isRTL ? 'الموظفين' : 'Employees'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departments.map((dept) => (
                    <TableRow key={dept.id} className="hover:bg-slate-50/50">
                      <TableCell className="font-medium text-slate-800">{dept.name}</TableCell>
                      <TableCell className="text-slate-600" dir="rtl">{dept.nameAr || '-'}</TableCell>
                      <TableCell className="text-slate-500 text-sm">{dept.description || '-'}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200">
                          {dept._count?.employees || 0}
                        </Badge>
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

export function PositionsPage() {
  const { language } = useAppStore()
  const isRTL = language === 'ar'
  // Positions are free - no license restriction
  const isLocked = false
  const [positions, setPositions] = useState<Position[]>([])
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ title: '', titleAr: '', departmentId: '', minSalary: '', maxSalary: '' })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [posRes, deptRes] = await Promise.all([fetch('/api/positions'), fetch('/api/departments')])
      if (posRes.ok) setPositions(await posRes.json())
      if (deptRes.ok) setDepartments(await deptRes.json())
    } catch {
      // handle
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/positions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          minSalary: parseFloat(form.minSalary) || 0,
          maxSalary: parseFloat(form.maxSalary) || 0,
        }),
      })
      if (res.ok) {
        toast.success(isRTL ? 'تم إضافة المنصب' : 'Position added successfully')
        setDialogOpen(false)
        setForm({ title: '', titleAr: '', departmentId: '', minSalary: '', maxSalary: '' })
        fetchData()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed')
      }
    } catch {
      toast.error('Network error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-teal-600" />
            {isRTL ? 'المناصب' : 'Positions'}
            {isLocked && <Lock className="w-4 h-4 text-amber-500" />}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {isRTL ? `عدد المناصب: ${positions.length}` : `${positions.length} positions`}
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-sm"
              disabled={isLocked}
            >
              <Plus className="w-4 h-4 mr-2" />
              {isRTL ? 'إضافة منصب' : 'Add Position'}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{isRTL ? 'إضافة منصب جديد' : 'Add New Position'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>{isRTL ? 'المسمى الوظيفي' : 'Job Title'}</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={isRTL ? 'المسمى الوظيفي' : 'Job title'} />
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? 'المسمى (عربي)' : 'Title (Arabic)'}</Label>
                <Input dir="rtl" value={form.titleAr} onChange={(e) => setForm({ ...form, titleAr: e.target.value })} placeholder="المسمى الوظيفي" />
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? 'القسم' : 'Department'}</Label>
                <select
                  className="w-full h-10 rounded-md border border-slate-200 px-3 text-sm"
                  value={form.departmentId}
                  onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
                >
                  <option value="">{isRTL ? 'اختر القسم' : 'Select department'}</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>{isRTL ? 'الحد الأدنى للراتب' : 'Min Salary'}</Label>
                  <Input type="number" value={form.minSalary} onChange={(e) => setForm({ ...form, minSalary: e.target.value })} placeholder="0" />
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? 'الحد الأقصى للراتب' : 'Max Salary'}</Label>
                  <Input type="number" value={form.maxSalary} onChange={(e) => setForm({ ...form, maxSalary: e.target.value })} placeholder="0" />
                </div>
              </div>
              <Button onClick={handleSubmit} disabled={saving || !form.title || !form.departmentId} className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white">
                {saving ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : isRTL ? 'إضافة' : 'Add Position'}
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
              <p className="text-sm font-medium text-amber-800">{isRTL ? 'ترخيص HR غير مفعل' : 'HR License Not Active'}</p>
              <p className="text-xs text-amber-600">{isRTL ? 'يرجى تفعيل ترخيص HR للوصول إلى هذه الميزة' : 'Please activate an HR license to access this feature'}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-0 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center"><div className="animate-spin w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full mx-auto" /></div>
          ) : positions.length === 0 ? (
            <div className="p-12 text-center">
              <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">{isRTL ? 'لا توجد مناصب بعد' : 'No positions yet'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80">
                    <TableHead className="text-xs font-semibold text-slate-600">{isRTL ? 'المسمى' : 'Title'}</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-600">{isRTL ? 'القسم' : 'Department'}</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-600 text-right">{isRTL ? 'نطاق الراتب' : 'Salary Range'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {positions.map((pos) => (
                    <TableRow key={pos.id} className="hover:bg-slate-50/50">
                      <TableCell>
                        <div>
                          <p className="font-medium text-slate-800">{pos.title}</p>
                          {pos.titleAr && <p className="text-xs text-slate-400" dir="rtl">{pos.titleAr}</p>}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">{pos.department?.name || '-'}</TableCell>
                      <TableCell className="text-sm text-slate-800 text-right font-medium">
                        {pos.minSalary.toLocaleString()} - {pos.maxSalary.toLocaleString()} JOD
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
