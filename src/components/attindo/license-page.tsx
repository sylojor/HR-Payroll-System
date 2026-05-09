'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Key, Shield, Fingerprint, Users, Banknote, CheckCircle2, XCircle, AlertTriangle, Plus, RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'

interface LicenseRecord {
  id: string
  key: string
  module: string
  maxDevices: number
  activatedDevices: number
  activatedAt: string | null
  expiresAt: string | null
  isActive: boolean
  machineId: string
  companyName: string
  contactEmail: string
  createdAt: string
}

interface LicenseSummary {
  fingerprint: { active: boolean; maxDevices: number; activatedDevices: number; expiresAt: string | null }
  hr: { active: boolean; expiresAt: string | null }
  payroll: { active: boolean; expiresAt: string | null }
}

export function LicensePage() {
  const { language, setLicenseStatus, licenseStatus } = useAppStore()
  const isRTL = language === 'ar'
  const [licenses, setLicenses] = useState<LicenseRecord[]>([])
  const [summary, setSummary] = useState<LicenseSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [licenseKey, setLicenseKey] = useState('')
  const [activating, setActivating] = useState(false)

  useEffect(() => { fetchLicenses() }, [])

  const fetchLicenses = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/license')
      if (res.ok) {
        const data = await res.json()
        setLicenses(data.licenses || [])
        setSummary(data.summary || null)
        // Update global license status
        const s = data.summary
        if (s) {
          setLicenseStatus({
            hr: s.hr?.active ?? false,
            payroll: s.payroll?.active ?? false,
            fingerprint: s.fingerprint?.active ?? false,
          })
        }
      }
    } catch { /* ignore */ } finally { setLoading(false) }
  }

  const handleActivate = async () => {
    setActivating(true)
    try {
      const res = await fetch('/api/license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: licenseKey }),
      })
      if (res.ok) {
        toast.success(isRTL ? 'تم تفعيل الترخيص' : 'License activated successfully')
        setLicenseKey('')
        fetchLicenses()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Activation failed')
      }
    } catch {
      toast.error('Network error')
    } finally { setActivating(false) }
  }

  const handleDeactivate = async (id: string) => {
    try {
      const res = await fetch('/api/license', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'deactivate' }),
      })
      if (res.ok) {
        toast.success(isRTL ? 'تم إلغاء الترخيص' : 'License deactivated')
        fetchLicenses()
      }
    } catch { /* ignore */ }
  }

  const moduleIcon = (mod: string) => {
    switch (mod) {
      case 'FINGERPRINT': return Fingerprint
      case 'HR': return Users
      case 'PAYROLL': return Banknote
      default: return Key
    }
  }

  const moduleLabel = (mod: string) => {
    const map: Record<string, string> = {
      FINGERPRINT: isRTL ? 'البصمة' : 'Fingerprint',
      HR: isRTL ? 'الموارد البشرية' : 'HR Module',
      PAYROLL: isRTL ? 'الرواتب' : 'Payroll',
    }
    return map[mod] || mod
  }

  const moduleDesc = (mod: string) => {
    const map: Record<string, string> = {
      FINGERPRINT: isRTL ? 'إدارة أجهزة البصمة ZK' : 'ZK Fingerprint device management',
      HR: isRTL ? 'إدارة الموظفين والأقسام والمناصب' : 'Employee, department & position management',
      PAYROLL: isRTL ? 'كشوف الرواتب والبدلات والخصومات' : 'Payroll, allowances & deductions',
    }
    return map[mod] || ''
  }

  // Define the three license modules for display
  const licenseModules = [
    { key: 'FINGERPRINT' as const, freeLimit: 3 },
    { key: 'HR' as const, freeLimit: 0 },
    { key: 'PAYROLL' as const, freeLimit: 0 },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Key className="w-6 h-6 text-teal-600" />
          {isRTL ? 'إدارة التراخيص' : 'License Management'}
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          {isRTL ? 'إدارة تراخيص النظام والتفعيل' : 'Manage system licenses and activations'}
        </p>
      </div>

      {/* License Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {licenseModules.map((mod) => {
          const lic = licenses.find((l) => l.module === mod.key)
          const isActive = lic?.isActive ?? false
          const Icon = moduleIcon(mod.key)
          const isFree = mod.key === 'FINGERPRINT' && (!lic || lic.maxDevices <= 3)

          return (
            <Card key={mod.key} className={`border-0 shadow-sm ${isActive ? 'ring-2 ring-teal-200' : ''}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${isActive ? 'bg-teal-50' : 'bg-slate-50'}`}>
                      <Icon className={`w-5 h-5 ${isActive ? 'text-teal-600' : 'text-slate-400'}`} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{moduleLabel(mod.key)}</p>
                      <p className="text-xs text-slate-400">{moduleDesc(mod.key)}</p>
                    </div>
                  </div>
                  {isActive ? (
                    <CheckCircle2 className="w-5 h-5 text-teal-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-slate-300" />
                  )}
                </div>

                <div className="space-y-2 text-xs">
                  {mod.key === 'FINGERPRINT' && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">{isRTL ? 'الأجهزة' : 'Devices'}</span>
                      <span className="font-medium">{lic?.activatedDevices ?? 0} / {lic?.maxDevices ?? mod.freeLimit}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-400">{isRTL ? 'الحالة' : 'Status'}</span>
                    <Badge variant="outline" className={`text-[10px] ${isActive ? 'bg-teal-50 text-teal-700 border-teal-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                      {isActive ? (isRTL ? 'مفعل' : 'Active') : (isFree ? (isRTL ? 'مجاني' : 'Free') : (isRTL ? 'غير مفعل' : 'Inactive'))}
                    </Badge>
                  </div>
                  {lic?.expiresAt && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">{isRTL ? 'تاريخ الانتهاء' : 'Expires'}</span>
                      <span>{new Date(lic.expiresAt).toLocaleDateString()}</span>
                    </div>
                  )}
                  {lic?.activatedAt && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">{isRTL ? 'تاريخ التفعيل' : 'Activated'}</span>
                      <span>{new Date(lic.activatedAt).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                {lic && lic.isActive && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeactivate(lic.id)}
                      className="w-full h-7 text-xs text-red-600 hover:bg-red-50 border-red-200"
                    >
                      {isRTL ? 'إلغاء التفعيل' : 'Deactivate'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Activate License */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-teal-600" />
            <h3 className="text-sm font-semibold text-slate-800">
              {isRTL ? 'تفعيل ترخيص جديد' : 'Activate New License'}
            </h3>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value)}
                placeholder={isRTL ? 'أدخل مفتاح الترخيص...' : 'Enter license key...'}
                className="font-mono bg-white border-slate-200"
              />
            </div>
            <Button
              onClick={handleActivate}
              disabled={activating || !licenseKey}
              className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white"
            >
              {activating ? (
                <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />{isRTL ? 'جاري التفعيل...' : 'Activating...'}</>
              ) : (
                <><Key className="w-4 h-4 mr-2" />{isRTL ? 'تفعيل' : 'Activate'}</>
              )}
            </Button>
          </div>

          {/* Available test license keys */}
          <div className="mt-4 p-3 bg-slate-50 rounded-lg">
            <p className="text-xs text-slate-500 mb-2">
              {isRTL ? 'مفاتيح تجريبية للاختبار:' : 'Test license keys for activation:'}
            </p>
            <div className="space-y-1">
              <button
                onClick={() => setLicenseKey('ATT-HR-2025-PRO-001')}
                className="block text-xs font-mono text-teal-600 hover:text-teal-800 underline"
              >
                ATT-HR-2025-PRO-001 (HR Module)
              </button>
              <button
                onClick={() => setLicenseKey('ATT-PAY-2025-PRO-001')}
                className="block text-xs font-mono text-teal-600 hover:text-teal-800 underline"
              >
                ATT-PAY-2025-PRO-001 (Payroll Module)
              </button>
              <button
                onClick={() => setLicenseKey('ATT-FP-2025-PRO-010')}
                className="block text-xs font-mono text-teal-600 hover:text-teal-800 underline"
              >
                ATT-FP-2025-PRO-010 (Fingerprint - 10 Devices)
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* All Licenses List */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-700">
            {isRTL ? 'جميع التراخيص' : 'All Licenses'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {licenses.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">{isRTL ? 'لا توجد تراخيص' : 'No licenses found'}</p>
          ) : (
            <div className="space-y-3">
              {licenses.map((lic) => {
                const Icon = moduleIcon(lic.module)
                return (
                  <div key={lic.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                    <div className={`p-2 rounded-lg ${lic.isActive ? 'bg-teal-100' : 'bg-slate-100'}`}>
                      <Icon className={`w-4 h-4 ${lic.isActive ? 'text-teal-600' : 'text-slate-400'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-slate-800">{moduleLabel(lic.module)}</p>
                        <Badge variant="outline" className={`text-[9px] ${lic.isActive ? 'bg-teal-50 text-teal-700 border-teal-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                          {lic.isActive ? (isRTL ? 'مفعل' : 'Active') : (isRTL ? 'غير مفعل' : 'Inactive')}
                        </Badge>
                      </div>
                      <p className="text-xs font-mono text-slate-400 truncate">{lic.key}</p>
                    </div>
                    <div className="text-right">
                      {lic.expiresAt && (
                        <p className="text-xs text-slate-500">
                          {isRTL ? 'ينتهي: ' : 'Expires: '}{new Date(lic.expiresAt).toLocaleDateString()}
                        </p>
                      )}
                      {lic.module === 'FINGERPRINT' && (
                        <p className="text-xs text-slate-400">{lic.activatedDevices}/{lic.maxDevices} {isRTL ? 'أجهزة' : 'devices'}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
