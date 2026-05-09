'use client'

import { useState } from 'react'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Fingerprint, Loader2, Eye, EyeOff, Building2, UserCog, Settings2, Check, ArrowLeft, ArrowRight } from 'lucide-react'

interface SetupWizardProps {
  onComplete: (user: { id: string; username: string; name: string; email: string; role: string; isActive: boolean }) => void
}

export function SetupWizard({ onComplete }: SetupWizardProps) {
  const { language } = useAppStore()
  const isRTL = language === 'ar'

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Step 1: Company
  const [companyName, setCompanyName] = useState('')
  const [companyNameAr, setCompanyNameAr] = useState('')
  const [companyAddress, setCompanyAddress] = useState('')
  const [companyPhone, setCompanyPhone] = useState('')
  const [companyEmail, setCompanyEmail] = useState('')
  const [companyCurrency, setCompanyCurrency] = useState('JOD')

  // Step 2: Admin
  const [adminUsername, setAdminUsername] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('')
  const [adminName, setAdminName] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Step 3: Settings
  const [workingHours, setWorkingHours] = useState(8)
  const [overtimeRate, setOvertimeRate] = useState(1.5)

  const totalSteps = 3

  const validateStep1 = (): boolean => {
    if (!companyName.trim()) {
      setError(isRTL ? 'اسم الشركة مطلوب' : 'Company name is required')
      return false
    }
    return true
  }

  const validateStep2 = (): boolean => {
    if (!adminUsername.trim()) {
      setError(isRTL ? 'اسم المستخدم مطلوب' : 'Username is required')
      return false
    }
    if (adminUsername.length < 3) {
      setError(isRTL ? 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل' : 'Username must be at least 3 characters')
      return false
    }
    if (!adminName.trim()) {
      setError(isRTL ? 'الاسم الكامل مطلوب' : 'Full name is required')
      return false
    }
    if (!adminPassword) {
      setError(isRTL ? 'كلمة المرور مطلوبة' : 'Password is required')
      return false
    }
    if (adminPassword.length < 6) {
      setError(isRTL ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' : 'Password must be at least 6 characters')
      return false
    }
    if (adminPassword !== adminConfirmPassword) {
      setError(isRTL ? 'كلمات المرور غير متطابقة' : 'Passwords do not match')
      return false
    }
    return true
  }

  const handleNext = () => {
    setError('')
    if (step === 1 && !validateStep1()) return
    if (step === 2 && !validateStep2()) return
    setStep(step + 1)
  }

  const handleBack = () => {
    setError('')
    setStep(step - 1)
  }

  const handleComplete = async () => {
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: {
            name: companyName,
            nameAr: companyNameAr,
            address: companyAddress,
            phone: companyPhone,
            email: companyEmail,
            currency: companyCurrency,
            currencySymbol: companyCurrency === 'JOD' ? 'د.ا' : companyCurrency === 'SAR' ? 'ر.س' : companyCurrency === 'AED' ? 'د.إ' : companyCurrency === 'EGP' ? 'ج.م' : '$',
          },
          adminUser: {
            username: adminUsername,
            password: adminPassword,
            name: adminName,
            email: adminEmail,
          },
          settings: {
            workingHoursPerDay: workingHours,
            overtimeRate,
          },
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Setup failed')
        return
      }

      onComplete(data.user)
    } catch {
      setError(isRTL ? 'خطأ في الشبكة. يرجى المحاولة مرة أخرى.' : 'Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const stepIcons = [Building2, UserCog, Settings2]
  const stepLabels = isRTL
    ? ['معلومات الشركة', 'حساب المدير', 'إعدادات النظام']
    : ['Company Info', 'Admin Account', 'System Settings']

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-white to-emerald-50 px-4 py-8">
      <div className="w-full max-w-lg">
        {/* Logo & Brand */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 shadow-lg shadow-teal-200 mb-3">
            <Fingerprint className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Attindo</h1>
          <p className="text-slate-500 mt-1 text-sm">
            {isRTL ? 'إعداد النظام لأول مرة' : 'First Time Setup'}
          </p>
        </div>

        {/* Step Progress */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {stepLabels.map((label, idx) => {
            const StepIcon = stepIcons[idx]
            const stepNum = idx + 1
            const isActive = step === stepNum
            const isCompleted = step > stepNum
            return (
              <div key={idx} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                      isCompleted
                        ? 'bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-md'
                        : isActive
                        ? 'bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-lg shadow-teal-200/50'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {isCompleted ? <Check className="w-5 h-5" /> : <StepIcon className="w-4 h-4" />}
                  </div>
                  <span className={`text-[10px] mt-1 font-medium ${isActive ? 'text-teal-600' : isCompleted ? 'text-teal-500' : 'text-slate-400'}`}>
                    {label}
                  </span>
                </div>
                {idx < stepLabels.length - 1 && (
                  <div className={`w-8 h-0.5 mx-1 mb-4 rounded-full transition-colors ${step > stepNum ? 'bg-teal-400' : 'bg-slate-200'}`} />
                )}
              </div>
            )
          })}
        </div>

        {/* Setup Card */}
        <Card className="border-0 shadow-xl shadow-slate-200/50">
          <CardHeader className="pb-2 pt-6 px-6">
            <h2 className="text-lg font-semibold text-slate-800 text-center">
              {stepLabels[step - 1]}
            </h2>
            <p className="text-sm text-slate-500 text-center">
              {step === 1 && (isRTL ? 'أدخل معلومات شركتك' : 'Enter your company information')}
              {step === 2 && (isRTL ? 'أنشئ حساب المدير الرئيسي' : 'Create the main administrator account')}
              {step === 3 && (isRTL ? 'قم بتكوين إعدادات النظام الأساسية' : 'Configure basic system settings')}
            </p>
          </CardHeader>
          <CardContent className="p-6 pt-4">
            {/* Step 1: Company Info */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-slate-700 text-sm font-medium">
                    {isRTL ? 'اسم الشركة (إنجليزي) *' : 'Company Name (English) *'}
                  </Label>
                  <Input
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder={isRTL ? 'مثال: Attindo Corp' : 'e.g. Attindo Corp'}
                    className="h-11 border-slate-200 focus:border-teal-500 focus:ring-teal-500/20"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700 text-sm font-medium">
                    {isRTL ? 'اسم الشركة (عربي)' : 'Company Name (Arabic)'}
                  </Label>
                  <Input
                    value={companyNameAr}
                    onChange={(e) => setCompanyNameAr(e.target.value)}
                    placeholder={isRTL ? 'مثال: شركة أتيندو' : 'e.g. شركة أتيندو'}
                    className="h-11 border-slate-200 focus:border-teal-500 focus:ring-teal-500/20"
                    dir="rtl"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-700 text-sm font-medium">
                      {isRTL ? 'العنوان' : 'Address'}
                    </Label>
                    <Input
                      value={companyAddress}
                      onChange={(e) => setCompanyAddress(e.target.value)}
                      placeholder={isRTL ? 'عمان، الأردن' : 'Amman, Jordan'}
                      className="h-11 border-slate-200 focus:border-teal-500 focus:ring-teal-500/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 text-sm font-medium">
                      {isRTL ? 'الهاتف' : 'Phone'}
                    </Label>
                    <Input
                      value={companyPhone}
                      onChange={(e) => setCompanyPhone(e.target.value)}
                      placeholder="+96265100100"
                      className="h-11 border-slate-200 focus:border-teal-500 focus:ring-teal-500/20"
                      dir="ltr"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-700 text-sm font-medium">Email</Label>
                    <Input
                      type="email"
                      value={companyEmail}
                      onChange={(e) => setCompanyEmail(e.target.value)}
                      placeholder="info@company.com"
                      className="h-11 border-slate-200 focus:border-teal-500 focus:ring-teal-500/20"
                      dir="ltr"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 text-sm font-medium">
                      {isRTL ? 'العملة' : 'Currency'}
                    </Label>
                    <select
                      value={companyCurrency}
                      onChange={(e) => setCompanyCurrency(e.target.value)}
                      className="flex h-11 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/20 focus-visible:border-teal-500"
                    >
                      <option value="JOD">JOD - دينار أردني</option>
                      <option value="SAR">SAR - ريال سعودي</option>
                      <option value="AED">AED - درهم إماراتي</option>
                      <option value="EGP">EGP - جنيه مصري</option>
                      <option value="USD">USD - دولار أمريكي</option>
                      <option value="EUR">EUR - يورو</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Admin Account */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-700 text-sm font-medium">
                      {isRTL ? 'اسم المستخدم *' : 'Username *'}
                    </Label>
                    <Input
                      value={adminUsername}
                      onChange={(e) => setAdminUsername(e.target.value)}
                      placeholder={isRTL ? 'مثال: admin' : 'e.g. admin'}
                      className="h-11 border-slate-200 focus:border-teal-500 focus:ring-teal-500/20"
                      dir="ltr"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 text-sm font-medium">
                      {isRTL ? 'الاسم الكامل *' : 'Full Name *'}
                    </Label>
                    <Input
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      placeholder={isRTL ? 'مثال: أحمد محمد' : 'e.g. Ahmad Mohammad'}
                      className="h-11 border-slate-200 focus:border-teal-500 focus:ring-teal-500/20"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700 text-sm font-medium">Email</Label>
                  <Input
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="admin@company.com"
                    className="h-11 border-slate-200 focus:border-teal-500 focus:ring-teal-500/20"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700 text-sm font-medium">
                    {isRTL ? 'كلمة المرور *' : 'Password *'}
                  </Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder={isRTL ? '6 أحرف على الأقل' : 'At least 6 characters'}
                      className="h-11 border-slate-200 focus:border-teal-500 focus:ring-teal-500/20 pr-10"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700 text-sm font-medium">
                    {isRTL ? 'تأكيد كلمة المرور *' : 'Confirm Password *'}
                  </Label>
                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={adminConfirmPassword}
                      onChange={(e) => setAdminConfirmPassword(e.target.value)}
                      placeholder={isRTL ? 'أعد إدخال كلمة المرور' : 'Re-enter password'}
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
                {adminPassword && adminConfirmPassword && adminPassword !== adminConfirmPassword && (
                  <p className="text-red-500 text-xs">
                    {isRTL ? 'كلمات المرور غير متطابقة' : 'Passwords do not match'}
                  </p>
                )}
              </div>
            )}

            {/* Step 3: Settings */}
            {step === 3 && (
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-teal-50 to-emerald-50 rounded-xl p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-teal-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">{companyName}</p>
                      <p className="text-xs text-slate-500">{companyEmail || companyPhone || companyAddress}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                      <UserCog className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">{adminName}</p>
                      <p className="text-xs text-slate-500">@{adminUsername}</p>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-700 text-sm font-medium">
                      {isRTL ? 'ساعات العمل اليومية' : 'Working Hours/Day'}
                    </Label>
                    <Input
                      type="number"
                      step="0.5"
                      min={1}
                      max={24}
                      value={workingHours}
                      onChange={(e) => setWorkingHours(parseFloat(e.target.value) || 8)}
                      className="h-11 border-slate-200 focus:border-teal-500 focus:ring-teal-500/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 text-sm font-medium">
                      {isRTL ? 'معدل الأوفر تايم' : 'Overtime Rate'}
                    </Label>
                    <Input
                      type="number"
                      step="0.1"
                      min={1}
                      max={5}
                      value={overtimeRate}
                      onChange={(e) => setOvertimeRate(parseFloat(e.target.value) || 1.5)}
                      className="h-11 border-slate-200 focus:border-teal-500 focus:ring-teal-500/20"
                    />
                  </div>
                </div>
                <p className="text-xs text-slate-400">
                  {isRTL
                    ? 'يمكنك تعديل هذه الإعدادات لاحقاً من صفحة الإعدادات'
                    : 'You can modify these settings later from the Settings page'}
                </p>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
              {step > 1 ? (
                <Button
                  variant="outline"
                  onClick={handleBack}
                  disabled={loading}
                  className="border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  {isRTL ? <ArrowRight className="w-4 h-4 mr-1" /> : <ArrowLeft className="w-4 h-4 mr-1" />}
                  {isRTL ? 'السابق' : 'Back'}
                </Button>
              ) : (
                <div />
              )}

              {step < totalSteps ? (
                <Button
                  onClick={handleNext}
                  className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-medium shadow-lg shadow-teal-200/50"
                >
                  {isRTL ? 'التالي' : 'Next'}
                  {isRTL ? <ArrowLeft className="w-4 h-4 ml-1" /> : <ArrowRight className="w-4 h-4 ml-1" />}
                </Button>
              ) : (
                <Button
                  onClick={handleComplete}
                  disabled={loading}
                  className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-medium shadow-lg shadow-teal-200/50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      {isRTL ? 'جاري الإعداد...' : 'Setting up...'}
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      {isRTL ? 'إكمال الإعداد' : 'Complete Setup'}
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 mt-6">
          © 2025 Attindo HR & Payroll System
        </p>
      </div>
    </div>
  )
}

// Simple separator component
function Separator() {
  return <div className="border-t border-slate-200" />
}
