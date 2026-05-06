'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Users, Clock, CalendarDays, Banknote, TrendingUp, TrendingDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface DashboardData {
  totalEmployees: number;
  totalDepartments: number;
  totalDevices: number;
  onlineDevices: number;
  attendance: { totalPresent: number; totalAbsent: number; totalLate: number; avgWorkHours: number; attendanceRate: number };
  leaves: { pending: number; approved: number };
  totalBasicSalaries: number;
  departments: { name: string; count: number }[];
  dailyAttendance: { date: string; dayName: string; present: number; late: number; absent: number }[];
  recentNotifications: { id: string; title: string; message: string; type: string; createdAt: string }[];
  recentLeaves: { id: string; employee: string; type: string; startDate: string; endDate: string; totalDays: number; status: string }[];
  devices: { id: string; name: string; deviceType: string; status: string; lastSync: string | null; location: string | null }[];
  gender: { male: number; female: number };
}

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316'];
const formatCurrency = (amount: number) => amount.toLocaleString('ar-JO') + ' د.أ';

export function DashboardSection() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard')
      .then(res => res.json())
      .then(d => setData(d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!data) return null;

  const statCards = [
    { label: 'إجمالي الموظفين', value: data.totalEmployees, icon: <Users className="h-5 w-5" />, color: 'emerald', trend: '+2', trendUp: true },
    { label: 'معدل الحضور', value: data.attendance.attendanceRate + '%', icon: <Clock className="h-5 w-5" />, color: 'amber', trend: '+3%', trendUp: true },
    { label: 'إجازات معلقة', value: data.leaves.pending, icon: <CalendarDays className="h-5 w-5" />, color: 'rose', trend: '-1', trendUp: false },
    { label: 'إجمالي الرواتب', value: formatCurrency(data.totalBasicSalaries), icon: <Banknote className="h-5 w-5" />, color: 'violet', trend: '', trendUp: true },
  ];

  const colorMap: Record<string, { bg: string; text: string; iconBg: string }> = {
    emerald: { bg: 'bg-emerald-50 dark:bg-emerald-950/30', text: 'text-emerald-700 dark:text-emerald-300', iconBg: 'bg-emerald-100 dark:bg-emerald-900' },
    amber: { bg: 'bg-amber-50 dark:bg-amber-950/30', text: 'text-amber-700 dark:text-amber-300', iconBg: 'bg-amber-100 dark:bg-amber-900' },
    rose: { bg: 'bg-rose-50 dark:bg-rose-950/30', text: 'text-rose-700 dark:text-rose-300', iconBg: 'bg-rose-100 dark:bg-rose-900' },
    violet: { bg: 'bg-violet-50 dark:bg-violet-950/30', text: 'text-violet-700 dark:text-violet-300', iconBg: 'bg-violet-100 dark:bg-violet-900' },
  };

  const genderData = [
    { name: 'ذكور', value: data.gender.male },
    { name: 'إناث', value: data.gender.female },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s, i) => {
          const c = colorMap[s.color];
          return (
            <Card key={i} className={`${c.bg} border-0 shadow-sm`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
                    <p className={`text-xl font-bold ${c.text}`}>{s.value}</p>
                  </div>
                  <div className={`${c.iconBg} ${c.text} p-2 rounded-lg`}>
                    {s.icon}
                  </div>
                </div>
                {s.trend && (
                  <div className="flex items-center gap-1 mt-2">
                    {s.trendUp ? <TrendingUp className="h-3 w-3 text-emerald-500" /> : <TrendingDown className="h-3 w-3 text-rose-500" />}
                    <span className={`text-xs ${s.trendUp ? 'text-emerald-500' : 'text-rose-500'}`}>{s.trend}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">الحضور خلال آخر 7 أيام</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.dailyAttendance} barSize={20}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="dayName" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="present" name="حاضر" fill="#10b981" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="late" name="متأخر" fill="#f59e0b" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="absent" name="غائب" fill="#ef4444" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Gender Pie Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">توزيع الجنس</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={genderData} cx="50%" cy="50%" outerRadius={60} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {genderData.map((_, i) => (
                      <Cell key={i} fill={i === 0 ? '#10b981' : '#f59e0b'} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Department & Devices Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">توزيع الموظفين حسب القسم</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.departments.map((d, i) => (
                <div key={i} className="flex items-center justify-between gap-3">
                  <span className="text-sm min-w-[120px]">{d.name}</span>
                  <div className="flex-1 bg-muted rounded-full h-3">
                    <div
                      className="rounded-full h-3 transition-all"
                      style={{ width: `${Math.max((d.count / data.totalEmployees) * 100, 5)}%`, backgroundColor: COLORS[i % COLORS.length] }}
                    />
                  </div>
                  <span className="text-sm font-bold w-8 text-center">{d.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Fingerprint Devices */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">حالة أجهزة البصمة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.devices.map((d) => (
                <div key={d.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className={`h-3 w-3 rounded-full shrink-0 ${d.status === 'online' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{d.name}</p>
                    <p className="text-xs text-muted-foreground">{d.location || '—'} • {d.deviceType === 'zk' ? 'ZK' : 'Hikvision'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {d.status === 'online' ? (
                      <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">متصل</Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-700 text-[10px]">غير متصل</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Leave Requests & Notifications Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Leave Requests */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">طلبات الإجازة الأخيرة</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentLeaves.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">لا توجد طلبات إجازة</p>
            ) : (
              <div className="space-y-2">
                {data.recentLeaves.map((l) => (
                  <div key={l.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                    <div>
                      <p className="text-sm font-medium">{l.employee}</p>
                      <p className="text-xs text-muted-foreground">{l.type} • {l.totalDays} أيام</p>
                    </div>
                    <Badge className={
                      l.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                      l.status === 'rejected' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }>
                      {l.status === 'approved' ? 'مقبولة' : l.status === 'rejected' ? 'مرفوضة' : 'معلقة'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Notifications */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">التنبيهات الأخيرة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.recentNotifications.map(n => (
                <div key={n.id} className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/50">
                  <div className={`h-2.5 w-2.5 rounded-full mt-1.5 shrink-0 ${
                    n.type === 'success' ? 'bg-emerald-500' :
                    n.type === 'warning' ? 'bg-yellow-500' :
                    n.type === 'error' ? 'bg-red-500' : 'bg-blue-500'
                  }`} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{n.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{n.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
