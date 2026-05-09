'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Clock, Search, UserCheck, UserX, AlertCircle, CalendarDays } from 'lucide-react'

interface AttendanceRecord {
  id: string
  employeeId: string
  date: string
  checkIn: string | null
  checkOut: string | null
  status: string
  overtimeHours: number
  lateMinutes: number
  earlyLeaveMinutes: number
  fingerprintMatch: boolean
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

export function AttendancePage() {
  const { language } = useAppStore()
  const isRTL = language === 'ar'
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0])
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [search, setSearch] = useState('')

  useEffect(() => { fetchAttendance() }, [dateFilter, statusFilter])

  const fetchAttendance = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('date', dateFilter)
      if (statusFilter && statusFilter !== 'ALL') params.set('status', statusFilter)
      const res = await fetch(`/api/attendance?${params}`)
      if (res.ok) {
        const data = await res.json()
        setRecords(data.attendance || data || [])
      }
    } catch { /* ignore */ } finally { setLoading(false) }
  }

  const filtered = records.filter((r) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      r.employee?.firstName?.toLowerCase().includes(q) ||
      r.employee?.lastName?.toLowerCase().includes(q) ||
      r.employee?.employeeId?.toLowerCase().includes(q)
    )
  })

  const stats = {
    present: records.filter((r) => r.status === 'PRESENT' || r.status === 'LATE').length,
    absent: records.filter((r) => r.status === 'ABSENT').length,
    late: records.filter((r) => r.status === 'LATE').length,
    onLeave: records.filter((r) => r.status === 'LEAVE').length,
  }

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      PRESENT: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      ABSENT: 'bg-red-50 text-red-700 border-red-200',
      LATE: 'bg-amber-50 text-amber-700 border-amber-200',
      HALF_DAY: 'bg-sky-50 text-sky-700 border-sky-200',
      LEAVE: 'bg-violet-50 text-violet-700 border-violet-200',
      HOLIDAY: 'bg-teal-50 text-teal-700 border-teal-200',
    }
    return map[status] || 'bg-slate-50 text-slate-600 border-slate-200'
  }

  const statusLabel = (status: string) => {
    const map: Record<string, string> = {
      PRESENT: isRTL ? 'حاضر' : 'Present',
      ABSENT: isRTL ? 'غائب' : 'Absent',
      LATE: isRTL ? 'متأخر' : 'Late',
      HALF_DAY: isRTL ? 'نصف يوم' : 'Half Day',
      LEAVE: isRTL ? 'إجازة' : 'Leave',
      HOLIDAY: isRTL ? 'عطلة' : 'Holiday',
    }
    return map[status] || status
  }

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
  }

  const statCards = [
    { label: isRTL ? 'حاضر' : 'Present', value: stats.present, icon: UserCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: isRTL ? 'غائب' : 'Absent', value: stats.absent, icon: UserX, color: 'text-red-600', bg: 'bg-red-50' },
    { label: isRTL ? 'متأخر' : 'Late', value: stats.late, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: isRTL ? 'إجازة' : 'On Leave', value: stats.onLeave, icon: CalendarDays, color: 'text-violet-600', bg: 'bg-violet-50' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-6 h-6 text-teal-600" />
            {isRTL ? 'الحضور والانصراف' : 'Attendance'}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {isRTL ? 'تتبع حضور وانصراف الموظفين' : 'Track employee check-in and check-out'}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((s, i) => (
          <Card key={i} className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`${s.bg} p-2 rounded-lg`}>
                <s.icon className={`w-4 h-4 ${s.color}`} />
              </div>
              <div>
                <p className="text-xs text-slate-500">{s.label}</p>
                <p className="text-xl font-bold text-slate-900">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-44 bg-white border-slate-200"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 bg-white border-slate-200">
            <SelectValue placeholder={isRTL ? 'الحالة' : 'Status'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{isRTL ? 'الكل' : 'All'}</SelectItem>
            <SelectItem value="PRESENT">{isRTL ? 'حاضر' : 'Present'}</SelectItem>
            <SelectItem value="ABSENT">{isRTL ? 'غائب' : 'Absent'}</SelectItem>
            <SelectItem value="LATE">{isRTL ? 'متأخر' : 'Late'}</SelectItem>
            <SelectItem value="LEAVE">{isRTL ? 'إجازة' : 'Leave'}</SelectItem>
            <SelectItem value="HALF_DAY">{isRTL ? 'نصف يوم' : 'Half Day'}</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder={isRTL ? 'بحث عن موظف...' : 'Search employee...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white border-slate-200"
          />
        </div>
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
              <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">{isRTL ? 'لا توجد سجلات' : 'No attendance records found'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80">
                    <TableHead className="text-xs font-semibold text-slate-600">{isRTL ? 'الموظف' : 'Employee'}</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-600">{isRTL ? 'القسم' : 'Department'}</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-600">{isRTL ? 'الحضور' : 'Check In'}</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-600">{isRTL ? 'الانصراف' : 'Check Out'}</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-600">{isRTL ? 'الحالة' : 'Status'}</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-600">{isRTL ? 'التأخير (د)' : 'Late (min)'}</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-600">{isRTL ? 'إضافي (س)' : 'OT (hrs)'}</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-600">{isRTL ? 'بصمة' : 'FP'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <TableRow key={r.id} className="hover:bg-slate-50/50">
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium text-slate-800">{r.employee?.firstName} {r.employee?.lastName}</p>
                          <p className="text-xs text-slate-400">{r.employee?.employeeId}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">{r.employee?.department?.name || '-'}</TableCell>
                      <TableCell className="text-sm text-slate-600 font-mono">{formatTime(r.checkIn)}</TableCell>
                      <TableCell className="text-sm text-slate-600 font-mono">{formatTime(r.checkOut)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${statusBadge(r.status)}`}>
                          {statusLabel(r.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">{r.lateMinutes > 0 ? r.lateMinutes : '-'}</TableCell>
                      <TableCell className="text-sm text-slate-600">{r.overtimeHours > 0 ? r.overtimeHours : '-'}</TableCell>
                      <TableCell>
                        {r.fingerprintMatch ? (
                          <span className="text-emerald-500 text-xs font-medium">✓</span>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
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
