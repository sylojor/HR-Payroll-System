'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Banknote, Lock, Plus, AlertCircle, TrendingUp, TrendingDown, DollarSign, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

interface PayrollItem {
  id: string
  employeeId: string
  basicSalary: number
  totalAllowances: number
  totalDeductions: number
  grossSalary: number
  taxAmount: number
  netSalary: number
  daysWorked: number
  overtimeHours: number
  overtimeAmount: number
  details: string
  employee: {
    id: string
    employeeId: string
    firstName: string
    lastName: string
    firstNameAr: string
    lastNameAr: string
    department: { id: string; name: string }
  }
}

interface PayrollRecord {
  id: string
  month: number
  year: number
  status: string
  totalGross: number
  totalDeductions: number
  totalNet: number
  generatedAt: string
  paidAt: string | null
  notes: string
  items: PayrollItem[]
}

export function PayrollPage() {
  const { language, licenseStatus } = useAppStore()
  const isRTL = language === 'ar'
  const isLocked = !licenseStatus.payroll
  const [payrolls, setPayrolls] = useState<PayrollRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPayroll, setSelectedPayroll] = useState<PayrollRecord | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [genForm, setGenForm] = useState({
    month: String(new Date().getMonth() + 1),
    year: String(new Date().getFullYear()),
  })

  useEffect(() => { fetchPayroll() }, [])

  const fetchPayroll = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/payroll')
      if (res.ok) {
        const data = await res.json()
        const list = data.payrolls || data || []
        setPayrolls(list)
        if (list.length > 0) setSelectedPayroll(list[0])
      }
    } catch { /* ignore */ } finally { setLoading(false) }
  }

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const res = await fetch('/api/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: parseInt(genForm.month),
          year: parseInt(genForm.year),
        }),
      })
      if (res.ok) {
        toast.success(isRTL ? 'تم إنشاء كشف الرواتب' : 'Payroll generated successfully')
        setDialogOpen(false)
        fetchPayroll()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to generate payroll')
      }
    } catch {
      toast.error('Network error')
    } finally { setGenerating(false) }
  }

  const monthName = (m: number) => {
    return new Date(2025, m - 1, 1).toLocaleString(isRTL ? 'ar' : 'en', { month: 'long' })
  }

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      DRAFT: 'bg-slate-50 text-slate-700 border-slate-200',
      PROCESSING: 'bg-sky-50 text-sky-700 border-sky-200',
      COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      PAID: 'bg-teal-50 text-teal-700 border-teal-200',
    }
    return map[status] || map.DRAFT
  }

  const statusLabel = (status: string) => {
    const map: Record<string, string> = {
      DRAFT: isRTL ? 'مسودة' : 'Draft',
      PROCESSING: isRTL ? 'قيد المعالجة' : 'Processing',
      COMPLETED: isRTL ? 'مكتمل' : 'Completed',
      PAID: isRTL ? 'مدفوع' : 'Paid',
    }
    return map[status] || status
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Banknote className="w-6 h-6 text-teal-600" />
            {isRTL ? 'إدارة الرواتب' : 'Payroll'}
            {isLocked && <Lock className="w-4 h-4 text-amber-500" />}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {isRTL ? 'إدارة الرواتب والمستحقات' : 'Manage payroll and compensation'}
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-sm"
              disabled={isLocked}
            >
              <Plus className="w-4 h-4 mr-2" />
              {isRTL ? 'إنشاء كشف رواتب' : 'Generate Payroll'}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[380px]">
            <DialogHeader>
              <DialogTitle>{isRTL ? 'إنشاء كشف رواتب جديد' : 'Generate New Payroll'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>{isRTL ? 'الشهر' : 'Month'}</Label>
                <Select value={genForm.month} onValueChange={(val) => setGenForm({ ...genForm, month: val })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>{monthName(i + 1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? 'السنة' : 'Year'}</Label>
                <Select value={genForm.year} onValueChange={(val) => setGenForm({ ...genForm, year: val })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[2024, 2025, 2026].map((y) => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleGenerate}
                disabled={generating}
                className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white"
              >
                {generating ? (isRTL ? 'جاري الإنشاء...' : 'Generating...') : (isRTL ? 'إنشاء' : 'Generate')}
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
              <p className="text-sm font-medium text-amber-800">{isRTL ? 'ترخيص الرواتب غير مفعل' : 'Payroll License Not Active'}</p>
              <p className="text-xs text-amber-600">{isRTL ? 'يرجى تفعيل ترخيص الرواتب' : 'Please activate a Payroll license to access this feature'}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse"><CardContent className="p-6"><div className="h-20 bg-slate-200 rounded" /></CardContent></Card>
          ))}
        </div>
      ) : payrolls.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-12 text-center">
            <Banknote className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">{isRTL ? 'لا توجد كشوف رواتب' : 'No payroll records'}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Payroll Periods */}
          <div className="flex flex-wrap gap-2">
            {payrolls.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedPayroll(p)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedPayroll?.id === p.id
                    ? 'bg-teal-600 text-white shadow-md'
                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                }`}
              >
                {monthName(p.month)} {p.year}
              </button>
            ))}
          </div>

          {selectedPayroll && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3">
                      <div className="bg-emerald-50 p-2.5 rounded-xl"><TrendingUp className="w-5 h-5 text-emerald-600" /></div>
                      <div>
                        <p className="text-xs text-slate-500">{isRTL ? 'إجمالي الرواتب' : 'Total Gross'}</p>
                        <p className="text-xl font-bold text-slate-900">{selectedPayroll.totalGross.toLocaleString()} JOD</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3">
                      <div className="bg-red-50 p-2.5 rounded-xl"><TrendingDown className="w-5 h-5 text-red-600" /></div>
                      <div>
                        <p className="text-xs text-slate-500">{isRTL ? 'إجمالي الخصومات' : 'Total Deductions'}</p>
                        <p className="text-xl font-bold text-slate-900">{selectedPayroll.totalDeductions.toLocaleString()} JOD</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3">
                      <div className="bg-teal-50 p-2.5 rounded-xl"><DollarSign className="w-5 h-5 text-teal-600" /></div>
                      <div>
                        <p className="text-xs text-slate-500">{isRTL ? 'صافي الرواتب' : 'Net Pay'}</p>
                        <p className="text-xl font-bold text-slate-900">{selectedPayroll.totalNet.toLocaleString()} JOD</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Status and Info */}
              <div className="flex items-center gap-3">
                <Badge variant="outline" className={`text-xs ${statusBadge(selectedPayroll.status)}`}>
                  {statusLabel(selectedPayroll.status)}
                </Badge>
                <span className="text-xs text-slate-400">
                  {isRTL ? `${selectedPayroll.items?.length || 0} موظف` : `${selectedPayroll.items?.length || 0} employees`}
                </span>
              </div>

              {/* Payroll Items Table */}
              <Card className="border-0 shadow-sm overflow-hidden">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50/80">
                          <TableHead className="text-xs font-semibold text-slate-600">{isRTL ? 'الموظف' : 'Employee'}</TableHead>
                          <TableHead className="text-xs font-semibold text-slate-600">{isRTL ? 'الراتب الأساسي' : 'Basic'}</TableHead>
                          <TableHead className="text-xs font-semibold text-slate-600">{isRTL ? 'البدلات' : 'Allowances'}</TableHead>
                          <TableHead className="text-xs font-semibold text-slate-600">{isRTL ? 'الخصومات' : 'Deductions'}</TableHead>
                          <TableHead className="text-xs font-semibold text-slate-600">{isRTL ? 'الإجمالي' : 'Gross'}</TableHead>
                          <TableHead className="text-xs font-semibold text-slate-600">{isRTL ? 'أيام العمل' : 'Days'}</TableHead>
                          <TableHead className="text-xs font-semibold text-slate-600">{isRTL ? 'إضافي' : 'OT'}</TableHead>
                          <TableHead className="text-xs font-semibold text-slate-600 text-right">{isRTL ? 'الصافي' : 'Net'}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedPayroll.items?.map((item) => (
                          <TableRow key={item.id} className="hover:bg-slate-50/50">
                            <TableCell>
                              <div>
                                <p className="text-sm font-medium text-slate-800">{item.employee?.firstName} {item.employee?.lastName}</p>
                                <p className="text-xs text-slate-400">{item.employee?.department?.name}</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-slate-600">{item.basicSalary.toLocaleString()}</TableCell>
                            <TableCell className="text-sm text-emerald-600">+{item.totalAllowances.toLocaleString()}</TableCell>
                            <TableCell className="text-sm text-red-600">-{item.totalDeductions.toLocaleString()}</TableCell>
                            <TableCell className="text-sm font-medium text-slate-800">{item.grossSalary.toLocaleString()}</TableCell>
                            <TableCell className="text-sm text-slate-600">{item.daysWorked}</TableCell>
                            <TableCell className="text-sm text-slate-600">{item.overtimeHours}h</TableCell>
                            <TableCell className="text-sm font-bold text-teal-700 text-right">{item.netSalary.toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="text-sm font-medium text-slate-700">{children}</label>
}
