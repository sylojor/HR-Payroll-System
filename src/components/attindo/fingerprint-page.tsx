'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Fingerprint, Plus, RefreshCw, Wifi, WifiOff, Download, Upload, Users, Zap, CheckCircle2, XCircle } from 'lucide-react'
import { toast } from 'sonner'

interface Device {
  id: string
  name: string
  ip: string
  port: number
  deviceType: string
  status: string
  location: string
  lastSync: string | null
  sn: string
  firmware: string
  createdAt: string
}

interface LicenseSummary {
  active: boolean
  maxDevices: number
  activatedDevices: number
  expiresAt: string | null
}

export function FingerprintPage() {
  const { language, licenseStatus, setLicenseStatus } = useAppStore()
  const isRTL = language === 'ar'
  const [devices, setDevices] = useState<Device[]>([])
  const [licenseInfo, setLicenseInfo] = useState<LicenseSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const [pushingId, setPushingId] = useState<string | null>(null)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [syncResult, setSyncResult] = useState<{ deviceId: string; recordsPulled: number; recordsSaved: number; errors?: string[] } | null>(null)
  const [form, setForm] = useState({ name: '', ip: '', port: '4370', location: '', sn: '' })

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [devRes, licRes] = await Promise.all([
        fetch('/api/fingerprint'),
        fetch('/api/license'),
      ])
      if (devRes.ok) {
        const data = await devRes.json()
        setDevices(data.devices || data || [])
      }
      if (licRes.ok) {
        const data = await licRes.json()
        const fpLic = data.summary?.fingerprint
        setLicenseInfo(fpLic || null)
        setLicenseStatus({
          ...licenseStatus,
          fingerprint: fpLic?.active ?? false,
        })
      }
    } catch { /* ignore */ } finally { setLoading(false) }
  }

  const handleAddDevice = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/fingerprint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          ip: form.ip,
          port: parseInt(form.port) || 4370,
          location: form.location,
          sn: form.sn,
        }),
      })
      if (res.ok) {
        toast.success(isRTL ? 'تم إضافة الجهاز' : 'Device added successfully')
        setDialogOpen(false)
        setForm({ name: '', ip: '', port: '4370', location: '', sn: '' })
        fetchData()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to add device')
      }
    } catch {
      toast.error('Network error')
    } finally { setSaving(false) }
  }

  const handleTestConnection = async (deviceId: string) => {
    setTestingId(deviceId)
    try {
      const res = await fetch('/api/fingerprint', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deviceId, action: 'test' }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(isRTL ? 'تم الاتصال بنجاح!' : 'Connection successful!', {
          description: data.sn ? `SN: ${data.sn}` : '',
        })
      } else {
        toast.error(isRTL ? 'فشل الاتصال' : 'Connection failed', {
          description: data.error || '',
        })
      }
      fetchData()
    } catch {
      toast.error('Network error')
    } finally { setTestingId(null) }
  }

  const handleSync = async (deviceId: string) => {
    setSyncingId(deviceId)
    setSyncResult(null)
    try {
      const res = await fetch('/api/fingerprint', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deviceId, action: 'sync' }),
      })
      const data = await res.json()
      if (data.success) {
        setSyncResult({ deviceId, recordsPulled: data.recordsPulled, recordsSaved: data.recordsSaved, errors: data.errors })
        toast.success(
          isRTL
            ? `تم جلب ${data.recordsSaved} سجل حضور`
            : `Synced ${data.recordsSaved} attendance records`,
          {
            description: isRTL
              ? `تم سحب ${data.recordsPulled} سجل من الجهاز`
              : `Pulled ${data.recordsPulled} logs from device`,
          }
        )
        fetchData()
      } else {
        toast.error(isRTL ? 'فشلت المزامنة' : 'Sync failed', { description: data.error })
      }
    } catch {
      toast.error('Network error')
    } finally { setSyncingId(null) }
  }

  const handlePushAll = async (deviceId: string) => {
    setPushingId(deviceId)
    try {
      const res = await fetch('/api/fingerprint', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deviceId, action: 'push_all_employees' }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(
          isRTL
            ? `تم رفع ${data.pushedCount} موظف`
            : `Pushed ${data.pushedCount} employees to device`
        )
      } else {
        toast.error(isRTL ? 'فشل رفع الموظفين' : 'Push failed', { description: data.error })
      }
    } catch {
      toast.error('Network error')
    } finally { setPushingId(null) }
  }

  const handleToggleStatus = async (deviceId: string, currentStatus: string) => {
    try {
      const action = currentStatus === 'ACTIVE' ? 'deactivate' : 'activate'
      const res = await fetch('/api/fingerprint', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deviceId, action }),
      })
      if (res.ok) {
        toast.success(isRTL ? 'تم التحديث' : 'Status updated')
        fetchData()
      }
    } catch { /* ignore */ }
  }

  const isFreeTier = !licenseInfo?.active || (licenseInfo?.maxDevices ?? 6) <= 6
  const maxDevices = licenseInfo?.maxDevices ?? 6
  const canAddMore = devices.length < maxDevices

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      INACTIVE: 'bg-slate-50 text-slate-600 border-slate-200',
      ERROR: 'bg-red-50 text-red-700 border-red-200',
    }
    return map[status] || map.INACTIVE
  }

  const statusLabel = (status: string) => {
    const map: Record<string, string> = {
      ACTIVE: isRTL ? 'نشط' : 'Active',
      INACTIVE: isRTL ? 'غير نشط' : 'Inactive',
      ERROR: isRTL ? 'خطأ' : 'Error',
    }
    return map[status] || status
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Fingerprint className="w-6 h-6 text-teal-600" />
            {isRTL ? 'أجهزة البصمة' : 'Fingerprint Devices'}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {isRTL ? 'إدارة أجهزة البصمة ZK ومزامنة الحضور' : 'Manage ZK fingerprint devices & sync attendance'}
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-sm"
              disabled={!canAddMore}
            >
              <Plus className="w-4 h-4 mr-2" />
              {isRTL ? 'إضافة جهاز' : 'Add Device'}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle>{isRTL ? 'إضافة جهاز بصمة جديد' : 'Add New Fingerprint Device'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>{isRTL ? 'اسم الجهاز' : 'Device Name'}</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Main Entrance" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>IP Address</Label>
                  <Input value={form.ip} onChange={(e) => setForm({ ...form, ip: e.target.value })} placeholder="192.168.1.100" />
                </div>
                <div className="space-y-2">
                  <Label>Port</Label>
                  <Input value={form.port} onChange={(e) => setForm({ ...form, port: e.target.value })} placeholder="4370" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? 'الموقع' : 'Location'}</Label>
                <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Building A - Floor 1" />
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? 'الرقم التسلسلي' : 'Serial Number'}</Label>
                <Input value={form.sn} onChange={(e) => setForm({ ...form, sn: e.target.value })} placeholder="Auto-detected on sync" />
              </div>
              <Button
                onClick={handleAddDevice}
                disabled={saving || !form.name || !form.ip}
                className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white"
              >
                {saving ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : (isRTL ? 'إضافة الجهاز' : 'Add Device')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* License Info Card */}
      <Card className={`border-0 shadow-sm ${isFreeTier ? 'bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200' : 'bg-gradient-to-r from-teal-50 to-emerald-50'}`}>
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-teal-100">
                <Fingerprint className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  {isFreeTier
                    ? isRTL ? `الخطة المجانية - ${maxDevices} أجهزة بصمة` : `Free Tier - ${maxDevices} Fingerprint Devices`
                    : isRTL ? 'ترخيص البصمة مفعل' : 'Fingerprint License Active'}
                </p>
                <p className="text-xs text-slate-500">
                  {isRTL
                    ? `${devices.length} من ${maxDevices} أجهزة مسجلة`
                    : `${devices.length} of ${maxDevices} devices registered`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-teal-200 text-teal-700 bg-teal-50">
                {isRTL ? 'مجاني' : 'Free'}
              </Badge>
              {!canAddMore && (
                <Badge variant="outline" className="border-red-200 text-red-700 bg-red-50">
                  {isRTL ? 'الحد الأقصى' : 'Limit Reached'}
                </Badge>
              )}
            </div>
          </div>
          <div className="mt-3">
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div
                className="h-2 rounded-full transition-all bg-teal-500"
                style={{ width: `${Math.min((devices.length / maxDevices) * 100, 100)}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sync Result Banner */}
      {syncResult && (
        <Card className="border-0 shadow-sm bg-emerald-50 border border-emerald-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-emerald-800">
                  {isRTL ? `تم جلب ${syncResult.recordsSaved} سجل حضور` : `Synced ${syncResult.recordsSaved} attendance records`}
                </p>
                <p className="text-xs text-emerald-600">
                  {isRTL
                    ? `${syncResult.recordsPulled} سجل تم سحبه من الجهاز`
                    : `${syncResult.recordsPulled} logs pulled from device`}
                </p>
                {syncResult.errors && syncResult.errors.length > 0 && (
                  <div className="mt-2 text-xs text-red-600">
                    {syncResult.errors.map((err, i) => <p key={i}>{err}</p>)}
                  </div>
                )}
              </div>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setSyncResult(null)}>×</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Devices Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse"><CardContent className="p-6"><div className="h-48 bg-slate-200 rounded" /></CardContent></Card>
          ))}
        </div>
      ) : devices.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-12 text-center">
            <Fingerprint className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">{isRTL ? 'لا توجد أجهزة بصمة' : 'No fingerprint devices'}</p>
            <p className="text-slate-400 text-sm mt-1">
              {isRTL ? 'أضف جهاز بصمة لبدء مزامنة الحضور' : 'Add a fingerprint device to start syncing attendance'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {devices.map((device) => (
            <Card key={device.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-teal-50">
                      <Fingerprint className="w-4 h-4 text-teal-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{device.name}</p>
                      <p className="text-xs text-slate-400">{device.location || 'No location'}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className={`text-[10px] ${statusBadge(device.status)}`}>
                    {statusLabel(device.status)}
                  </Badge>
                </div>
                <div className="space-y-2 text-xs text-slate-600 mb-4">
                  <div className="flex justify-between">
                    <span className="text-slate-400">IP</span>
                    <span className="font-mono">{device.ip}:{device.port}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">{isRTL ? 'الرقم التسلسلي' : 'SN'}</span>
                    <span className="font-mono">{device.sn || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">{isRTL ? 'آخر مزامنة' : 'Last Sync'}</span>
                    <span>{device.lastSync ? new Date(device.lastSync).toLocaleString() : '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">{isRTL ? 'البرنامج' : 'Firmware'}</span>
                    <span>{device.firmware || '-'}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2">
                  {/* Primary Actions Row */}
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      className="flex-1 h-8 text-xs bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white"
                      onClick={() => handleSync(device.id)}
                      disabled={syncingId === device.id}
                    >
                      <Download className={`w-3 h-3 mr-1 ${syncingId === device.id ? 'animate-spin' : ''}`} />
                      {syncingId === device.id
                        ? (isRTL ? 'جاري المزامنة...' : 'Syncing...')
                        : (isRTL ? 'جلب الحضور' : 'Pull Attendance')}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 h-8 text-xs"
                      onClick={() => handlePushAll(device.id)}
                      disabled={pushingId === device.id}
                    >
                      <Upload className={`w-3 h-3 mr-1 ${pushingId === device.id ? 'animate-spin' : ''}`} />
                      {isRTL ? 'رفع الموظفين' : 'Push Staff'}
                    </Button>
                  </div>

                  {/* Secondary Actions Row */}
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleTestConnection(device.id)}
                      disabled={testingId === device.id}
                      className="flex-1 h-7 text-[11px]"
                    >
                      <Zap className={`w-3 h-3 mr-1 ${testingId === device.id ? 'animate-spin' : ''}`} />
                      {isRTL ? 'اختبار اتصال' : 'Test'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleStatus(device.id, device.status)}
                      className="flex-1 h-7 text-[11px]"
                    >
                      {device.status === 'ACTIVE' ? (
                        <><WifiOff className="w-3 h-3 mr-1" />{isRTL ? 'إيقاف' : 'Disable'}</>
                      ) : (
                        <><Wifi className="w-3 h-3 mr-1" />{isRTL ? 'تفعيل' : 'Enable'}</>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
