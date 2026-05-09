'use client'

import { useEffect, useState, useRef } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Settings, Building2, Clock, Banknote, Fingerprint, Save, RefreshCw, Database, Download, Upload, Key, Eye, EyeOff, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

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
  const { language, user } = useAppStore()
  const isRTL = language === 'ar'
  const [company, setCompany] = useState<CompanyData | null>(null)
  const [settings, setSettings] = useState<SettingsGroup>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [companyForm, setCompanyForm] = useState<Partial<CompanyData>>({})

  // Backup/Restore
  const [backingUp, setBackingUp] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Change Password
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)

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

  // Backup handler
  const handleBackup = async () => {
    setBackingUp(true)
    try {
      const res = await fetch('/api/backup')
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Backup failed')
      }
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const contentDisposition = res.headers.get('Content-Disposition')
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : `attindo-backup-${new Date().toISOString().slice(0, 10)}.db`
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success(isRTL ? 'تم إنشاء النسخة الاحتياطية بنجاح' : 'Backup created successfully')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create backup')
    } finally {
      setBackingUp(false)
    }
  }

  // Restore handler
  const handleRestore = async (file: File) => {
    setRestoring(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/backup', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Restore failed')
      }
      toast.success(isRTL ? 'تم استعادة النسخة الاحتياطية بنجاح. يرجى تحديث الصفحة.' : 'Database restored successfully. Please refresh the page.')
      // Reload after a short delay so the user sees the toast
      setTimeout(() => window.location.reload(), 2000)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to restore backup')
    } finally {
      setRestoring(false)
    }
  }

  // Change password handler
  const handleChangePassword = async () => {
    if (!user?.id) {
      toast.error(isRTL ? 'لم يتم العثور على المستخدم' : 'User not found')
      return
    }
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      toast.error(isRTL ? 'يرجى ملء جميع الحقول' : 'Please fill in all fields')
      return
    }
    if (newPassword.length < 6) {
      toast.error(isRTL ? 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل' : 'New password must be at least 6 characters')
      return
    }
    if (newPassword !== confirmNewPassword) {
      toast.error(isRTL ? 'كلمات المرور غير متطابقة' : 'Passwords do not match')
      return
    }

    setChangingPassword(true)
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          currentPassword,
          newPassword,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to change password')
      }
      toast.success(isRTL ? 'تم تغيير كلمة المرور بنجاح' : 'Password changed successfully')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmNewPassword('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to change password')
    } finally {
      setChangingPassword(false)
    }
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
        <TabsList className="bg-slate-100 flex flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="company" className="gap-1.5 data-[state=active]:bg-white text-xs sm:text-sm">
            <Building2 className="w-3.5 h-3.5" /> {isRTL ? 'الشركة' : 'Company'}
          </TabsTrigger>
          <TabsTrigger value="attendance" className="gap-1.5 data-[state=active]:bg-white text-xs sm:text-sm">
            <Clock className="w-3.5 h-3.5" /> {isRTL ? 'الحضور' : 'Attendance'}
          </TabsTrigger>
          <TabsTrigger value="payroll" className="gap-1.5 data-[state=active]:bg-white text-xs sm:text-sm">
            <Banknote className="w-3.5 h-3.5" /> {isRTL ? 'الرواتب' : 'Payroll'}
          </TabsTrigger>
          <TabsTrigger value="fingerprint" className="gap-1.5 data-[state=active]:bg-white text-xs sm:text-sm">
            <Fingerprint className="w-3.5 h-3.5" /> {isRTL ? 'البصمة' : 'Fingerprint'}
          </TabsTrigger>
          <TabsTrigger value="general" className="gap-1.5 data-[state=active]:bg-white text-xs sm:text-sm">
            <Settings className="w-3.5 h-3.5" /> {isRTL ? 'عام' : 'General'}
          </TabsTrigger>
          <TabsTrigger value="backup" className="gap-1.5 data-[state=active]:bg-white text-xs sm:text-sm">
            <Database className="w-3.5 h-3.5" /> {isRTL ? 'الباكاب' : 'Backup'}
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-1.5 data-[state=active]:bg-white text-xs sm:text-sm">
            <Key className="w-3.5 h-3.5" /> {isRTL ? 'الأمان' : 'Security'}
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

        {/* Backup Tab */}
        <TabsContent value="backup">
          <div className="space-y-4">
            {/* Create Backup */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Download className="w-4 h-4 text-teal-600" />
                  {isRTL ? 'إنشاء نسخة احتياطية' : 'Create Backup'}
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  {isRTL
                    ? 'قم بتنزيل نسخة احتياطية كاملة من قاعدة البيانات. يمكنك استخدامها لاستعادة البيانات لاحقاً.'
                    : 'Download a complete backup of your database. You can use it to restore your data later.'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={handleBackup}
                  disabled={backingUp}
                  className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white"
                >
                  {backingUp ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      {isRTL ? 'جاري الإنشاء...' : 'Creating backup...'}
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      {isRTL ? 'تنزيل النسخة الاحتياطية' : 'Download Backup'}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Restore Backup */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Upload className="w-4 h-4 text-amber-600" />
                  {isRTL ? 'استعادة من نسخة احتياطية' : 'Restore from Backup'}
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  {isRTL
                    ? 'استعادة قاعدة البيانات من ملف نسخة احتياطية سابقة.'
                    : 'Restore the database from a previous backup file.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Warning */}
                <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">
                      {isRTL ? 'تحذير: سيتم استبدال جميع البيانات' : 'Warning: All data will be replaced'}
                    </p>
                    <p className="text-xs text-amber-700 mt-1">
                      {isRTL
                        ? 'ستؤدي عملية الاستعادة إلى استبدال جميع البيانات الحالية بالبيانات الموجودة في ملف النسخة الاحتياطية. لا يمكن التراجع عن هذا الإجراء.'
                        : 'Restoring will replace all current data with the data in the backup file. This action cannot be undone.'}
                    </p>
                  </div>
                </div>

                {/* File input (hidden) */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".db"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      handleRestore(file)
                    }
                    // Reset the input so the same file can be selected again
                    e.target.value = ''
                  }}
                />

                <div className="flex items-center gap-3">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="border-amber-300 text-amber-700 hover:bg-amber-50"
                        disabled={restoring}
                        onClick={() => {
                          // Don't open file picker yet, open confirmation first
                        }}
                      >
                        {restoring ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            {isRTL ? 'جاري الاستعادة...' : 'Restoring...'}
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 mr-2" />
                            {isRTL ? 'استعادة من نسخة احتياطية' : 'Restore from Backup'}
                          </>
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5 text-amber-600" />
                          {isRTL ? 'تأكيد الاستعادة' : 'Confirm Restore'}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          {isRTL
                            ? 'هل أنت متأكد من رغبتك في استعادة قاعدة البيانات من نسخة احتياطية؟ سيتم استبدال جميع البيانات الحالية ولا يمكن التراجع عن هذا الإجراء.'
                            : 'Are you sure you want to restore the database from a backup? All current data will be replaced and this action cannot be undone.'}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{isRTL ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => {
                            fileInputRef.current?.click()
                          }}
                          className="bg-amber-600 hover:bg-amber-700 text-white"
                        >
                          {isRTL ? 'متابعة واختيار الملف' : 'Continue & Select File'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Security Tab (Change Password) */}
        <TabsContent value="security">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Key className="w-4 h-4 text-teal-600" />
                {isRTL ? 'تغيير كلمة المرور' : 'Change Password'}
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                {isRTL
                  ? 'قم بتغيير كلمة مرور حسابك.'
                  : 'Update your account password.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="max-w-md space-y-4">
                {/* Current Password */}
                <div className="space-y-2">
                  <Label className="text-slate-700 text-sm font-medium">
                    {isRTL ? 'كلمة المرور الحالية' : 'Current Password'}
                  </Label>
                  <div className="relative">
                    <Input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder={isRTL ? 'أدخل كلمة المرور الحالية' : 'Enter current password'}
                      className="h-11 border-slate-200 focus:border-teal-500 focus:ring-teal-500/20 pr-10"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div className="space-y-2">
                  <Label className="text-slate-700 text-sm font-medium">
                    {isRTL ? 'كلمة المرور الجديدة' : 'New Password'}
                  </Label>
                  <div className="relative">
                    <Input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder={isRTL ? '6 أحرف على الأقل' : 'At least 6 characters'}
                      className="h-11 border-slate-200 focus:border-teal-500 focus:ring-teal-500/20 pr-10"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm New Password */}
                <div className="space-y-2">
                  <Label className="text-slate-700 text-sm font-medium">
                    {isRTL ? 'تأكيد كلمة المرور الجديدة' : 'Confirm New Password'}
                  </Label>
                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder={isRTL ? 'أعد إدخال كلمة المرور الجديدة' : 'Re-enter new password'}
                      className="h-11 border-slate-200 focus:border-teal-500 focus:ring-teal-500/20 pr-10"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {newPassword && confirmNewPassword && newPassword !== confirmNewPassword && (
                  <p className="text-red-500 text-xs">
                    {isRTL ? 'كلمات المرور غير متطابقة' : 'Passwords do not match'}
                  </p>
                )}

                <Button
                  onClick={handleChangePassword}
                  disabled={changingPassword}
                  className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white"
                >
                  {changingPassword ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      {isRTL ? 'جاري التغيير...' : 'Changing...'}
                    </>
                  ) : (
                    <>
                      <Key className="w-4 h-4 mr-2" />
                      {isRTL ? 'تغيير كلمة المرور' : 'Change Password'}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
