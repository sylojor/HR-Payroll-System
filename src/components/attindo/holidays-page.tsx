'use client'

import { useAppStore } from '@/lib/store'
import { Card, CardContent } from '@/components/ui/card'
import { Lock } from 'lucide-react'

export function HolidaysPage() {
  const { language, licenseStatus } = useAppStore()
  const isRTL = language === 'ar'
  const isLocked = !licenseStatus.payroll

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <svg className="w-6 h-6 text-teal-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5.8 11.3 2 22l10.7-3.79" />
            <path d="M4 3h.01" />
            <path d="M22 8h.01" />
            <path d="M15 2h.01" />
            <path d="M22 20h.01" />
            <path d="m22 2-2.24.75a2.9 2.9 0 0 0-1.96 3.12v0c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10" />
            <path d="m22 13-.82-.33c-.86-.34-1.82.2-1.98 1.11v0c-.11.7-.72 1.22-1.43 1.22H17" />
            <path d="m11 2 .33.82c.34.86-.2 1.82-1.11 1.98v0C9.52 4.9 9 5.52 9 6.23V7" />
          </svg>
          {isRTL ? 'العطلات' : 'Holidays'}
          {isLocked && <Lock className="w-4 h-4 text-amber-500" />}
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          {isRTL ? 'إدارة العطلات الرسمية والشركة' : 'Manage public and company holidays'}
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
            <path d="M5.8 11.3 2 22l10.7-3.79" />
            <path d="m22 2-2.24.75a2.9 2.9 0 0 0-1.96 3.12v0c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10" />
          </svg>
          <p className="text-slate-500 font-medium">
            {isRTL ? 'إدارة العطلات' : 'Holiday Management'}
          </p>
          <p className="text-slate-400 text-sm mt-1">
            {isRTL ? 'سيتم تفعيل هذه الميزة قريباً' : 'This feature will be available soon'}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
