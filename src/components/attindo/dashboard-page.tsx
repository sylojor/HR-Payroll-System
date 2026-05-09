'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Users,
  Clock,
  CalendarDays,
  Banknote,
  TrendingUp,
  UserCheck,
  UserX,
  AlertCircle,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts'

interface DashboardData {
  totalEmployees: number
  activeEmployees: number
  presentToday: number
  absentToday: number
  onLeaveToday: number
  pendingLeaves: number
  departments: number
  monthlyPayroll: number
  attendanceChart: { name: string; present: number; absent: number }[]
  departmentDist: { name: string; value: number }[]
  payrollTrend: { month: string; amount: number }[]
  recentActivities: { id: string; action: string; time: string; type: string }[]
  fingerprintDevices?: { total: number; active: number }
  licenseStatus?: {
    fingerprint: { active: boolean; maxDevices: number; activatedDevices: number }
    hr: { active: boolean; expiresAt: string | null }
    payroll: { active: boolean; expiresAt: string | null }
  }
}

const COLORS = ['#0d9488', '#14b8a6', '#2dd4bf', '#5eead4', '#99f6e4']

export function DashboardPage() {
  const { language, licenseStatus } = useAppStore()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const isRTL = language === 'ar'

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/dashboard')
        if (res.ok) {
          const raw = await res.json()
          // Map API response to dashboard data format
          const mapped: DashboardData = {
            totalEmployees: raw.totalEmployees || 0,
            activeEmployees: raw.activeEmployees || 0,
            presentToday: raw.todayAttendance?.present || 0,
            absentToday: raw.todayAttendance?.absent || 0,
            onLeaveToday: raw.todayAttendance?.onLeave || 0,
            pendingLeaves: raw.pendingLeaves || 0,
            departments: raw.departmentsCount || 0,
            monthlyPayroll: raw.payrollSummary?.totalNet || 0,
            attendanceChart: raw.attendanceChart || [],
            departmentDist: raw.departmentDist || [],
            payrollTrend: raw.payrollTrend || [],
            recentActivities: [],
            fingerprintDevices: raw.fingerprintDevices,
            licenseStatus: raw.licenseStatus,
          }
          setData(mapped)
        }
      } catch {
        // Use fallback data
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-slate-200 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const fallbackData: DashboardData = {
    totalEmployees: 0,
    activeEmployees: 0,
    presentToday: 0,
    absentToday: 0,
    onLeaveToday: 0,
    pendingLeaves: 0,
    departments: 0,
    monthlyPayroll: 0,
    attendanceChart: [
      { name: 'Sun', present: 0, absent: 0 },
      { name: 'Mon', present: 0, absent: 0 },
      { name: 'Tue', present: 0, absent: 0 },
      { name: 'Wed', present: 0, absent: 0 },
      { name: 'Thu', present: 0, absent: 0 },
    ],
    departmentDist: [{ name: 'No Data', value: 1 }],
    payrollTrend: [
      { month: 'Jan', amount: 0 },
      { month: 'Feb', amount: 0 },
      { month: 'Mar', amount: 0 },
    ],
    recentActivities: [],
  }

  const d = data || fallbackData

  const statsCards = [
    {
      title: isRTL ? 'إجمالي الموظفين' : 'Total Employees',
      value: d.totalEmployees,
      icon: Users,
      color: 'text-teal-600',
      bg: 'bg-teal-50',
      change: `${d.activeEmployees} ${isRTL ? 'نشط' : 'active'}`,
    },
    {
      title: isRTL ? 'الحضور اليوم' : 'Present Today',
      value: d.presentToday,
      icon: UserCheck,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      change: `${d.absentToday} ${isRTL ? 'غائب' : 'absent'}`,
    },
    {
      title: isRTL ? 'في إجازة' : 'On Leave',
      value: d.onLeaveToday,
      icon: CalendarDays,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      change: `${d.pendingLeaves} ${isRTL ? 'معلق' : 'pending'}`,
    },
    {
      title: isRTL ? 'الرواتب الشهرية' : 'Monthly Payroll',
      value: `${d.monthlyPayroll.toLocaleString()} JOD`,
      icon: Banknote,
      color: 'text-violet-600',
      bg: 'bg-violet-50',
      change: isRTL ? 'هذا الشهر' : 'This month',
      locked: !licenseStatus.payroll,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          {isRTL ? 'لوحة التحكم' : 'Dashboard'}
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          {isRTL ? 'نظرة عامة على النظام' : 'System overview and key metrics'}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((card, i) => (
          <Card key={i} className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    {card.title}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-bold text-slate-900">{card.value}</p>
                    {card.locked && (
                      <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-600 bg-amber-50">
                        {isRTL ? 'مقفل' : 'Locked'}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">{card.change}</p>
                </div>
                <div className={`${card.bg} p-2.5 rounded-xl`}>
                  <card.icon className={`w-5 h-5 ${card.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Attendance Chart */}
        <Card className="lg:col-span-2 border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700">
              {isRTL ? 'حضور الأسبوع' : 'Weekly Attendance'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={d.attendanceChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                  />
                  <Bar dataKey="present" fill="#0d9488" radius={[4, 4, 0, 0]} name={isRTL ? 'حاضر' : 'Present'} />
                  <Bar dataKey="absent" fill="#f87171" radius={[4, 4, 0, 0]} name={isRTL ? 'غائب' : 'Absent'} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Department Distribution */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700">
              {isRTL ? 'توزيع الأقسام' : 'Department Distribution'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={d.departmentDist}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {d.departmentDist.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {d.departmentDist.map((item, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: COLORS[i % COLORS.length] }}
                  />
                  <span className="text-slate-600">{item.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payroll Trend & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Payroll Trend */}
        <Card className="lg:col-span-2 border-0 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-slate-700">
                {isRTL ? 'اتجاه الرواتب' : 'Payroll Trend'}
              </CardTitle>
              {licenseStatus.payroll && (
                <Badge className="bg-teal-50 text-teal-700 border-teal-200 text-[10px]">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  {isRTL ? 'مرخص' : 'Licensed'}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={d.payrollTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    stroke="#0d9488"
                    strokeWidth={2}
                    dot={{ r: 4, fill: '#0d9488' }}
                    name="JOD"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700">
              {isRTL ? 'النشاط الأخير' : 'Recent Activity'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {d.recentActivities.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                <AlertCircle className="w-8 h-8 mb-2" />
                <p className="text-sm">{isRTL ? 'لا يوجد نشاط' : 'No recent activity'}</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {d.recentActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div className="mt-0.5">
                      {activity.type === 'attendance' ? (
                        <UserCheck className="w-4 h-4 text-emerald-500" />
                      ) : activity.type === 'leave' ? (
                        <CalendarDays className="w-4 h-4 text-amber-500" />
                      ) : (
                        <UserX className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-700 truncate">{activity.action}</p>
                      <p className="text-[10px] text-slate-400">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
