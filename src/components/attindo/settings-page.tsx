'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Settings, Building2, Clock, Banknote, Fingerprint, Save, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

interface CompanyData {
  id: string
  name: string
  nameAr: string
  address: string
  phone: string
  email: string
  currency: string
  currencySymbol: string
  taxRate: number
  workingHoursPerDay: number
  overtimeRate: number
}

interface SettingsGroup {
  [category: string]: { id: string; key: string; value: string }[]
}

export function SettingsPage() {
  const { language } = useAppStore()
  const isRTL = language === 'ar'
  const [company, setCompany] = useState<CompanyData | null>(null)
  const [settings, setSettings] = useState<SettingsGroup>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [companyForm, setCompanyForm] = useState<Partial<CompanyData>>({})

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [compRes, settRes] = await Promise.all([
        fetch('/api/company'),
        fetch('/api/settings'),
      ])
      if (compRes.ok) {
        const data = await compRes.json()
        const c = data.company
        if (c) {
          setCompany(c)
          setCompanyForm(c)
        }
      }
      if (settRes.ok) {
        const data = await settRes.json()
        setSettings(data.settings || {})
      }
    } catch { /* ignore */ } finally { setLoading(false) }
  }

  const handleSaveCompany = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/company', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(companyForm),
      })
      if (res.ok) {
        toast.success(isRTL ? 'تم حفظ إعدادات الشركة' : 'Company settings saved')
        fetchData()
      } else {
        toast.error('Failed to save')
      }
    } catch {
      toast.error('Network error')
    } finally { setSaving(false) }
  }

  const handleSaveSettings = async (category: string) => {
    setSaving(true)
    try {
      const categorySettings = settings[category] || []
      const updateData = categorySettings.map((s) => ({ key: s.key, value: s.value }))
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: updateData }),
      })
      if (res.ok) {
        toast.success(isRTL ? 'تم حفظ الإعدادات' : 'Settings saved')
      } else {
        toast.error('Failed to save')
      }
    } catch {
      toast.error('Network error')
    } finally { setSaving(false) }
  }

  const updateSetting = (category: string, key: string, value: string) => {
    setSettings((prev) => ({
      ...prev,
      [category]: (prev[category] || []).map((s) =>
        s.key === key ? { ...s, value } : s
      ),
    }))
  }

  const settingLabel = (key: string): string => {
    const labels: Record<string, string> = {
      working_days: isRTL ? 'أيام العمل' : 'Working Days',
      work_start_time: isRTL ? 'بداية الدوام' : 'Work Start Time',
      work_end_time: isRTL ? 'نهاية الدوام' : 'Work End Time',
      grace_period_minutes: isRTL ? 'فترة السماح (دقيقة)' : 'Grace Period (min)',
      overtime_threshold_hours: isRTL ? 'حد الإضافي (ساعات)' : 'Overtime Threshold (hrs)',
      currency: isRTL ? 'العملة' : 'Currency',
      date_format: isRTL ? 'صيغة التاريخ' : 'Date Format',
      language: isRTL ? 'اللغة' : 'Language',
      company_name: isRTL ? 'اسم الشركة' : 'Company Name',
      tax_enabled: isRTL ? 'تفعيل الضريبة' : 'Tax Enabled',
      social_security_enabled: isRTL ? 'تفعيل الضمان' : 'Social Security Enabled',
      social_security_rate: isRTL ? 'نسبة الضمان (%)' : 'Social Security Rate (%)',
      tax_rate: isRTL ? 'نسبة الضريبة (%)' : 'Tax Rate (%)',
      payroll_cutoff_day: isRTL ? 'يوم قطع الرواتب' : 'Payroll Cutoff Day',
      auto_attendance_sync: isRTL ? 'مزامنة تلقائية' : 'Auto Attendance Sync',
      sync_interval_minutes: isRTL ? 'فترة المزامنة (دقيقة)' : 'Sync Interval (min)',
    }
    return labels[key] || key
  }

  const categoryLabel = (cat: string): string => {
    const map: Record<string, string> = {
      general: isRTL ? 'عام' : 'General',
      attendance: isRTL ? 'الحضور' : 'Attendance',
      payroll: isRTL ? 'الرواتب' : 'Payroll',
      fingerprint: isRTL ? 'البصمة' : 'Fingerprint',
    }
    return map[cat] || cat
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="animate-pulse"><CardContent className="p-6"><div className="h-40 bg-slate-200 rounded" /></CardContent></Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Settings className="w-6 h-6 text-teal-600" />
          {isRTL ? 'الإعدادات' : 'Settings'}
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          {isRTL ? 'إعدادات النظام والشركة' : 'System and company settings'}
        </p>
      </div>

      <Tabs defaultValue="company" className="space-y-4">
        <TabsList className="bg-slate-100">
          <TabsTrigger value="company" className="gap-1.5 data-[state=active]:bg-white">
            <Building2 className="w-3.5 h-3.5" /> {isRTL ? 'الشركة' : 'Company'}
          </TabsTrigger>
          <TabsTrigger value="attendance" className="gap-1.5 data-[state=active]:bg-white">
            <Clock className="w-3.5 h-3.5" /> {isRTL ? 'الحضور' : 'Attendance'}
          </TabsTrigger>
          <TabsTrigger value="payroll" className="gap-1.5 data-[state=active]:bg-white">
            <Banknote className="w-3.5 h-3.5" /> {isRTL ? 'الرواتب' : 'Payroll'}
          </TabsTrigger>
          <TabsTrigger value="fingerprint" className="gap-1.5 data-[state=active]:bg-white">
            <Fingerprint className="w-3.5 h-3.5" /> {isRTL ? 'البصمة' : 'Fingerprint'}
          </TabsTrigger>
          <TabsTrigger value="general" className="gap-1.5 data-[state=active]:bg-white">
            <Settings className="w-3.5 h-3.5" /> {isRTL ? 'عام' : 'General'}
          </TabsTrigger>
        </TabsList>

        {/* Company Tab */}
        <TabsContent value="company">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-teal-600" />
                {isRTL ? 'معلومات الشركة' : 'Company Information'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isRTL ? 'اسم الشركة (إنجليزي)' : 'Company Name (English)'}</Label>
                  <Input value={companyForm.name || ''} onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })} className="bg-white border-slate-200" />
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? 'اسم الشركة (عربي)' : 'Company Name (Arabic)'}</Label>
                  <Input dir="rtl" value={companyForm.nameAr || ''} onChange={(e) => setCompanyForm({ ...companyForm, nameAr: e.target.value })} className="bg-white border-slate-200" />
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? 'العنوان' : 'Address'}</Label>
                  <Input value={companyForm.address || ''} onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })} className="bg-white border-slate-200" />
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? 'الهاتف' : 'Phone'}</Label>
                  <Input value={companyForm.phone || ''} onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })} className="bg-white border-slate-200" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={companyForm.email || ''} onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })} className="bg-white border-slate-200" />
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? 'العملة' : 'Currency'}</Label>
                  <Input value={companyForm.currency || ''} onChange={(e) => setCompanyForm({ ...companyForm, currency: e.target.value })} className="bg-white border-slate-200" />
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? 'نسبة الضريبة (%)' : 'Tax Rate (%)'}</Label>
                  <Input type="number" step="0.1" value={companyForm.taxRate || 0} onChange={(e) => setCompanyForm({ ...companyForm, taxRate: parseFloat(e.target.value) || 0 })} className="bg-white border-slate-200" />
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? 'ساعات العمل اليومية' : 'Working Hours/Day'}</Label>
                  <Input type="number" step="0.5" value={companyForm.workingHoursPerDay || 8} onChange={(e) => setCompanyForm({ ...companyForm, workingHoursPerDay: parseFloat(e.target.value) || 8 })} className="bg-white border-slate-200" />
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? 'معدل الأوفر تايم' : 'Overtime Rate'}</Label>
                  <Input type="number" step="0.1" value={companyForm.overtimeRate || 1.5} onChange={(e) => setCompanyForm({ ...companyForm, overtimeRate: parseFloat(e.target.value) || 1.5 })} className="bg-white border-slate-200" />
                </div>
              </div>
              <Button
                onClick={handleSaveCompany}
                disabled={saving}
                className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white"
              >
                {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                {isRTL ? 'حفظ' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dynamic settings tabs */}
        {['attendance', 'payroll', 'fingerprint', 'general'].map((category) => (
          <TabsContent key={category} value={category}>
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-semibold text-slate-700">
                  {categoryLabel(category)} {isRTL ? 'إعدادات' : 'Settings'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(settings[category] || []).length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-4">{isRTL ? 'لا توجد إعدادات' : 'No settings found'}</p>
                ) : (
                  <div className="space-y-3">
                    {settings[category].map((s) => (
                      <div key={s.id} className="flex items-center gap-4">
                        <Label className="w-48 text-sm text-slate-600 shrink-0">{settingLabel(s.key)}</Label>
                        <Input
                          value={s.value}
                          onChange={(e) => updateSetting(category, s.key, e.target.value)}
                          className="bg-white border-slate-200 max-w-xs"
                        />
                      </div>
                    ))}
                  </div>
                )}
                <Button
                  onClick={() => handleSaveSettings(category)}
                  disabled={saving}
                  className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white"
                >
                  {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  {isRTL ? 'حفظ' : 'Save Changes'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
