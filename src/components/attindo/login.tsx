'use client'

import { useState, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { SetupWizard } from '@/components/attindo/setup-wizard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Fingerprint, Loader2, Eye, EyeOff } from 'lucide-react'

export function Login() {
  const { setAuthenticated, setUser, language } = useAppStore()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null)
  const [checkingSetup, setCheckingSetup] = useState(true)

  const isRTL = language === 'ar'

  useEffect(() => {
    const checkSetup = async () => {
      try {
        const res = await fetch('/api/setup/check')
        const data = await res.json()
        setNeedsSetup(data.needsSetup)
      } catch {
        // If check fails, assume setup is needed
        setNeedsSetup(true)
      } finally {
        setCheckingSetup(false)
      }
    }
    checkSetup()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Login failed')
        return
      }

      setUser(data.user)
      setAuthenticated(true)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSetupComplete = (user: { id: string; username: string; name: string; email: string; role: string; isActive: boolean }) => {
    setUser(user)
    setAuthenticated(true)
  }

  // Show loading while checking if setup is needed
  if (checkingSetup) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-white to-emerald-50">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 shadow-lg shadow-teal-200 mb-4 animate-pulse">
            <Fingerprint className="w-8 h-8 text-white" />
          </div>
          <div className="flex items-center gap-2 text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">{isRTL ? 'جاري التحميل...' : 'Loading...'}</span>
          </div>
        </div>
      </div>
    )
  }

  // Show setup wizard if no users exist
  if (needsSetup) {
    return <SetupWizard onComplete={handleSetupComplete} />
  }

  // Show login form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-white to-emerald-50 px-4">
      <div className="w-full max-w-md">
        {/* Logo & Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 shadow-lg shadow-teal-200 mb-4">
            <Fingerprint className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Attindo</h1>
          <p className="text-slate-500 mt-1 text-sm">
            {isRTL ? 'نظام الموارد البشرية والرواتب' : 'HR & Payroll System'}
          </p>
        </div>

        {/* Login Card */}
        <Card className="border-0 shadow-xl shadow-slate-200/50">
          <CardHeader className="pb-2 pt-6 px-6">
            <h2 className="text-lg font-semibold text-slate-800 text-center">
              {isRTL ? 'تسجيل الدخول' : 'Sign In'}
            </h2>
          </CardHeader>
          <CardContent className="p-6 pt-2">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-slate-700 text-sm font-medium">
                  {isRTL ? 'اسم المستخدم' : 'Username'}
                </Label>
                <Input
                  id="username"
                  type="text"
                  placeholder={isRTL ? 'أدخل اسم المستخدم' : 'Enter your username'}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="h-11 border-slate-200 focus:border-teal-500 focus:ring-teal-500/20"
                  required
                  dir={isRTL ? 'rtl' : 'ltr'}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-700 text-sm font-medium">
                  {isRTL ? 'كلمة المرور' : 'Password'}
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={isRTL ? 'أدخل كلمة المرور' : 'Enter your password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 border-slate-200 focus:border-teal-500 focus:ring-teal-500/20 pr-10"
                    required
                    dir={isRTL ? 'rtl' : 'ltr'}
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

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-medium shadow-lg shadow-teal-200/50 transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    {isRTL ? 'جاري الدخول...' : 'Signing in...'}
                  </>
                ) : (
                  isRTL ? 'تسجيل الدخول' : 'Sign In'
                )}
              </Button>
            </form>

            {/* Default credentials hint */}
            <div className="mt-4 bg-teal-50 border border-teal-200 rounded-lg p-3">
              <p className="text-xs text-teal-700 font-medium mb-1">
                {isRTL ? '🔑 بيانات الدخول الافتراضية:' : '🔑 Default Credentials:'}
              </p>
              <p className="text-xs text-teal-600">
                {isRTL ? 'المستخدم: admin | كلمة المرور: admin123' : 'Username: admin | Password: admin123'}
              </p>
              <p className="text-[10px] text-teal-500 mt-1">
                {isRTL ? 'يمكنك تغييرها من الإعدادات ← الأمان' : 'You can change this from Settings → Security'}
              </p>
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
