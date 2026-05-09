'use client'

import { useAppStore } from '@/lib/store'
import { Card, CardContent } from '@/components/ui/card'
import { Clock, Lock } from 'lucide-react'

export function AttendancePage() {
  const { language } = useAppStore()
  const isRTL = language === 'ar'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Clock className="w-6 h-6 text-teal-600" />
          {isRTL ? 'الحضور والانصراف' : 'Attendance'}
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          {isRTL ? 'تتبع حضور وانصراف الموظفين' : 'Track employee check-in and check-out'}
        </p>
      </div>
      <Card className="border-0 shadow-sm">
        <CardContent className="p-12 text-center">
          <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">
            {isRTL ? 'الحضور والانصراف' : 'Attendance Tracking'}
          </p>
          <p className="text-slate-400 text-sm mt-1">
            {isRTL ? 'سيتم تفعيل هذه الميزة قريباً' : 'This feature will be available soon'}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export function FingerprintPage() {
  const { language, licenseStatus } = useAppStore()
  const isRTL = language === 'ar'
  const isLocked = !licenseStatus.fingerprint

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <svg className="w-6 h-6 text-teal-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" />
            <path d="M14 13.12c0 2.38 0 6.38-1 8.88" />
            <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02" />
            <path d="M2 12a10 10 0 0 1 18-6" />
            <path d="M2 16h.01" />
            <path d="M21.8 16c.2-2 .131-5.354 0-6" />
            <path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2" />
            <path d="M8.65 22c.21-.66.45-1.32.57-2" />
            <path d="M9 6.8a6 6 0 0 1 9 5.2v2" />
          </svg>
          {isRTL ? 'أجهزة البصمة' : 'Fingerprint Devices'}
          {isLocked && <Lock className="w-4 h-4 text-amber-500" />}
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          {isRTL ? 'إدارة أجهزة البصمة ZK' : 'Manage ZK fingerprint devices'}
        </p>
      </div>
      {isLocked && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 flex items-center gap-3">
            <Lock className="w-5 h-5 text-amber-600" />
            <div>
              <p className="text-sm font-medium text-amber-800">
                {isRTL ? 'ترخيص البصمة غير مفعل' : 'Fingerprint License Not Active'}
              </p>
              <p className="text-xs text-amber-600">
                {isRTL
                  ? 'يرجى تفعيل ترخيص البصمة للوصول إلى هذه الميزة'
                  : 'Please activate a Fingerprint license to access this feature'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-12 text-center">
          <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" />
            <path d="M14 13.12c0 2.38 0 6.38-1 8.88" />
            <path d="M2 12a10 10 0 0 1 18-6" />
          </svg>
          <p className="text-slate-500 font-medium">
            {isRTL ? 'أجهزة البصمة' : 'Fingerprint Device Management'}
          </p>
          <p className="text-slate-400 text-sm mt-1">
            {isRTL ? 'سيتم تفعيل هذه الميزة قريباً' : 'This feature will be available soon'}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export function LeavePage() {
  const { language } = useAppStore()
  const isRTL = language === 'ar'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <svg className="w-6 h-6 text-teal-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
            <line x1="16" x2="16" y1="2" y2="6" />
            <line x1="8" x2="8" y1="2" y2="6" />
            <line x1="3" x2="21" y1="10" y2="10" />
          </svg>
          {isRTL ? 'إدارة الإجازات' : 'Leave Management'}
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          {isRTL ? 'إدارة طلبات الإجازات' : 'Manage leave requests and approvals'}
        </p>
      </div>
      <Card className="border-0 shadow-sm">
        <CardContent className="p-12 text-center">
          <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
            <line x1="16" x2="16" y1="2" y2="6" />
            <line x1="8" x2="8" y1="2" y2="6" />
          </svg>
          <p className="text-slate-500 font-medium">
            {isRTL ? 'إدارة الإجازات' : 'Leave Management'}
          </p>
          <p className="text-slate-400 text-sm mt-1">
            {isRTL ? 'سيتم تفعيل هذه الميزة قريباً' : 'This feature will be available soon'}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export function PayrollPage() {
  const { language, licenseStatus } = useAppStore()
  const isRTL = language === 'ar'
  const isLocked = !licenseStatus.payroll

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <svg className="w-6 h-6 text-teal-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="20" height="14" x="2" y="5" rx="2" />
            <line x1="2" x2="22" y1="10" y2="10" />
          </svg>
          {isRTL ? 'الرواتب' : 'Payroll'}
          {isLocked && <Lock className="w-4 h-4 text-amber-500" />}
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          {isRTL ? 'إدارة الرواتب والمستحقات' : 'Manage payroll and compensation'}
        </p>
      </div>
      {isLocked && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 flex items-center gap-3">
            <Lock className="w-5 h-5 text-amber-600" />
            <div>
              <p className="text-sm font-medium text-amber-800">
                {isRTL ? 'ترخيص الرواتب غير مفعل' : 'Payroll License Not Active'}
              </p>
              <p className="text-xs text-amber-600">
                {isRTL
                  ? 'يرجى تفعيل ترخيص الرواتب للوصول إلى هذه الميزة'
                  : 'Please activate a Payroll license to access this feature'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-12 text-center">
          <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="20" height="14" x="2" y="5" rx="2" />
            <line x1="2" x2="22" y1="10" y2="10" />
          </svg>
          <p className="text-slate-500 font-medium">
            {isRTL ? 'الرواتب' : 'Payroll Management'}
          </p>
          <p className="text-slate-400 text-sm mt-1">
            {isRTL ? 'سيتم تفعيل هذه الميزة قريباً' : 'This feature will be available soon'}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export function LicensePage() {
  const { language } = useAppStore()
  const isRTL = language === 'ar'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <svg className="w-6 h-6 text-teal-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4" />
          </svg>
          {isRTL ? 'إدارة التراخيص' : 'License Management'}
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          {isRTL ? 'إدارة تراخيص النظام' : 'Manage system licenses and activations'}
        </p>
      </div>
      <Card className="border-0 shadow-sm">
        <CardContent className="p-12 text-center">
          <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4" />
          </svg>
          <p className="text-slate-500 font-medium">
            {isRTL ? 'إدارة التراخيص' : 'License Management'}
          </p>
          <p className="text-slate-400 text-sm mt-1">
            {isRTL ? 'سيتم تفعيل هذه الميزة قريباً' : 'This feature will be available soon'}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export function SettingsPage() {
  const { language } = useAppStore()
  const isRTL = language === 'ar'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <svg className="w-6 h-6 text-teal-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          {isRTL ? 'الإعدادات' : 'Settings'}
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          {isRTL ? 'إعدادات النظام والشركة' : 'System and company settings'}
        </p>
      </div>
      <Card className="border-0 shadow-sm">
        <CardContent className="p-12 text-center">
          <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <p className="text-slate-500 font-medium">
            {isRTL ? 'الإعدادات' : 'Settings'}
          </p>
          <p className="text-slate-400 text-sm mt-1">
            {isRTL ? 'سيتم تفعيل هذه الميزة قريباً' : 'This feature will be available soon'}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
