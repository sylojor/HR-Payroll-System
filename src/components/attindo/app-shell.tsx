'use client'

import { useEffect } from 'react'
import { useAppStore, type PageId } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  LayoutDashboard,
  Users,
  Building2,
  Briefcase,
  Clock,
  Fingerprint,
  CalendarDays,
  Banknote,
  PartyPopper,
  Key,
  Settings,
  LogOut,
  Menu,
  ChevronLeft,
  ChevronRight,
  Lock,
  Globe,
} from 'lucide-react'
import { DashboardPage } from './dashboard-page'
import { EmployeesPage } from './employees-page'
import { DepartmentsPage, PositionsPage } from './departments-positions-pages'
import { AttendancePage } from './attendance-page'
import { FingerprintPage } from './fingerprint-page'
import { LeavePage } from './leave-page'
import { PayrollPage } from './payroll-page'
import { LicensePage } from './license-page'
import { SettingsPage } from './settings-page'
import { HolidaysPage } from './holidays-page'

interface NavItem {
  id: PageId
  label: string
  labelAr: string
  icon: React.ElementType
  licenseKey?: 'hr' | 'payroll' | 'fingerprint'
}

const hrNavItems: NavItem[] = [
  { id: 'employees', label: 'Employees', labelAr: 'الموظفين', icon: Users, licenseKey: 'hr' },
  { id: 'departments', label: 'Departments', labelAr: 'الأقسام', icon: Building2, licenseKey: 'hr' },
  { id: 'positions', label: 'Positions', labelAr: 'المناصب', icon: Briefcase, licenseKey: 'hr' },
]

const attendanceNavItems: NavItem[] = [
  { id: 'attendance', label: 'Attendance', labelAr: 'الحضور', icon: Clock },
  { id: 'fingerprint', label: 'Fingerprint Devices', labelAr: 'أجهزة البصمة', icon: Fingerprint, licenseKey: 'fingerprint' },
  { id: 'leave', label: 'Leave Management', labelAr: 'الإجازات', icon: CalendarDays },
]

const payrollNavItems: NavItem[] = [
  { id: 'payroll', label: 'Payroll', labelAr: 'الرواتب', icon: Banknote, licenseKey: 'payroll' },
  { id: 'holidays', label: 'Holidays', labelAr: 'العطلات', icon: PartyPopper, licenseKey: 'payroll' },
]

// Extracted NavButton as a separate component to avoid creating components during render
function NavButton({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const currentPage = useAppStore((s) => s.currentPage)
  const setCurrentPage = useAppStore((s) => s.setCurrentPage)
  const language = useAppStore((s) => s.language)
  const licenseStatus = useAppStore((s) => s.licenseStatus)

  const isRTL = language === 'ar'
  const isActive = currentPage === item.id
  const isLocked = item.licenseKey ? !licenseStatus[item.licenseKey] : false

  return (
    <button
      onClick={() => setCurrentPage(item.id)}
      className={`
        w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150
        ${isActive
          ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30'
          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
        }
        ${collapsed ? 'justify-center' : ''}
      `}
      title={collapsed ? (isRTL ? item.labelAr : item.label) : undefined}
    >
      <item.icon className={`w-[18px] h-[18px] flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
      {!collapsed && (
        <>
          <span className="flex-1 text-left" dir={isRTL ? 'rtl' : 'ltr'}>
            {isRTL ? item.labelAr : item.label}
          </span>
          {isLocked && (
            <Lock className={`w-3.5 h-3.5 ${isActive ? 'text-teal-200' : 'text-amber-500'}`} />
          )}
        </>
      )}
      {collapsed && isLocked && (
        <Lock className="w-3 h-3 text-amber-500 absolute top-1 right-1" />
      )}
    </button>
  )
}

export function AppShell() {
  const {
    currentPage,
    sidebarOpen,
    toggleSidebar,
    language,
    setLanguage,
    user,
    logout,
    licenseStatus,
  } = useAppStore()

  const isRTL = language === 'ar'

  useEffect(() => {
    // Fetch license status on mount
    const fetchLicenses = async () => {
      try {
        const res = await fetch('/api/license')
        if (res.ok) {
          const data = await res.json()
          const licenses = data.licenses || data
          const status = {
            hr: licenses.some((l: { module: string; isActive: boolean }) => l.module === 'HR' && l.isActive),
            payroll: licenses.some((l: { module: string; isActive: boolean }) => l.module === 'PAYROLL' && l.isActive),
            fingerprint: licenses.some((l: { module: string; isActive: boolean }) => l.module === 'FINGERPRINT' && l.isActive),
          }
          useAppStore.getState().setLicenseStatus(status)
        }
      } catch {
        // ignore
      }
    }
    fetchLicenses()
  }, [])

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage />
      case 'employees':
        return <EmployeesPage />
      case 'departments':
        return <DepartmentsPage />
      case 'positions':
        return <PositionsPage />
      case 'attendance':
        return <AttendancePage />
      case 'fingerprint':
        return <FingerprintPage />
      case 'leave':
        return <LeavePage />
      case 'payroll':
        return <PayrollPage />
      case 'holidays':
        return <HolidaysPage />
      case 'license':
        return <LicensePage />
      case 'settings':
        return <SettingsPage />
      default:
        return <DashboardPage />
    }
  }

  return (
    <div className={`min-h-screen flex ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Sidebar */}
      <aside
        className={`
          ${sidebarOpen ? 'w-64' : 'w-[68px]'}
          bg-slate-900 flex flex-col transition-all duration-300 ease-in-out
          fixed inset-y-0 ${isRTL ? 'right-0' : 'left-0'} z-40
        `}
        style={{ borderInlineEnd: '1px solid #1e293b' }}
      >
        {/* Sidebar Header */}
        <div className="flex items-center gap-3 px-4 h-16 border-b border-slate-800">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-teal-500/30">
            <Fingerprint className="w-5 h-5 text-white" />
          </div>
          {sidebarOpen && (
            <div className={`flex-1 min-w-0 ${isRTL ? 'text-right' : ''}`}>
              <h1 className="text-lg font-bold text-white tracking-tight">Attindo</h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest">
                {isRTL ? 'موارد بشرية' : 'HR & Payroll'}
              </p>
            </div>
          )}
        </div>

        {/* Nav Items */}
        <ScrollArea className="flex-1 py-4 px-3">
          <div className="space-y-1">
            {/* Dashboard */}
            <NavButton
              item={{ id: 'dashboard', label: 'Dashboard', labelAr: 'لوحة التحكم', icon: LayoutDashboard }}
              collapsed={!sidebarOpen}
            />

            {/* HR Module Section */}
            {sidebarOpen && (
              <div className="pt-4 pb-1 px-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                  {isRTL ? 'وحدة الموارد البشرية' : 'HR Module'}
                </p>
              </div>
            )}
            {!sidebarOpen && <div className="py-2"><Separator className="bg-slate-800" /></div>}
            {hrNavItems.map((item) => (
              <NavButton key={item.id} item={item} collapsed={!sidebarOpen} />
            ))}

            {/* Attendance Section */}
            {sidebarOpen && (
              <div className="pt-4 pb-1 px-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                  {isRTL ? 'الحضور والانصراف' : 'Time & Attendance'}
                </p>
              </div>
            )}
            {!sidebarOpen && <div className="py-2"><Separator className="bg-slate-800" /></div>}
            {attendanceNavItems.map((item) => (
              <NavButton key={item.id} item={item} collapsed={!sidebarOpen} />
            ))}

            {/* Payroll Module Section */}
            {sidebarOpen && (
              <div className="pt-4 pb-1 px-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                  {isRTL ? 'وحدة الرواتب' : 'Payroll Module'}
                </p>
              </div>
            )}
            {!sidebarOpen && <div className="py-2"><Separator className="bg-slate-800" /></div>}
            {payrollNavItems.map((item) => (
              <NavButton key={item.id} item={item} collapsed={!sidebarOpen} />
            ))}

            {/* System Section */}
            {sidebarOpen && (
              <div className="pt-4 pb-1 px-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                  {isRTL ? 'النظام' : 'System'}
                </p>
              </div>
            )}
            {!sidebarOpen && <div className="py-2"><Separator className="bg-slate-800" /></div>}
            <NavButton
              item={{ id: 'license', label: 'License', labelAr: 'التراخيص', icon: Key }}
              collapsed={!sidebarOpen}
            />
            <NavButton
              item={{ id: 'settings', label: 'Settings', labelAr: 'الإعدادات', icon: Settings }}
              collapsed={!sidebarOpen}
            />
          </div>
        </ScrollArea>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-slate-800">
          {sidebarOpen && (
            <div className="flex items-center gap-2 mb-3 px-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center">
                <span className="text-white text-xs font-bold">
                  {user?.name?.charAt(0)?.toUpperCase() || 'A'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-200 truncate">{user?.name || 'Admin'}</p>
                <p className="text-[10px] text-slate-500">{user?.role || 'ADMIN'}</p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="text-slate-400 hover:text-red-400 hover:bg-slate-800 flex-1 justify-start"
            >
              <LogOut className="w-4 h-4" />
              {sidebarOpen && <span className="ml-2 text-xs">{isRTL ? 'تسجيل الخروج' : 'Logout'}</span>}
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div
        className={`
          flex-1 flex flex-col min-h-screen
          transition-all duration-300 ease-in-out
        `}
        style={{
          marginInlineStart: sidebarOpen ? '16rem' : '68px',
        }}
      >
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="h-9 w-9 text-slate-500 hover:text-slate-700 hover:bg-slate-100"
            >
              {sidebarOpen ? (
                isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />
              ) : (
                <Menu className="w-4 h-4" />
              )}
            </Button>
            <div className="hidden sm:block">
              <h2 className="text-sm font-semibold text-slate-800">
                {isRTL ? getPageTitleAr(currentPage) : getPageTitle(currentPage)}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Language Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
              className="h-8 gap-1.5 text-xs border-slate-200 hover:border-teal-300 hover:text-teal-600"
            >
              <Globe className="w-3.5 h-3.5" />
              {language === 'en' ? 'العربية' : 'English'}
            </Button>

            {/* License indicators */}
            <div className="hidden md:flex items-center gap-1">
              {licenseStatus.hr && (
                <Badge variant="outline" className="text-[10px] border-teal-200 text-teal-700 bg-teal-50 px-1.5">
                  HR
                </Badge>
              )}
              {licenseStatus.payroll && (
                <Badge variant="outline" className="text-[10px] border-teal-200 text-teal-700 bg-teal-50 px-1.5">
                  Payroll
                </Badge>
              )}
              {licenseStatus.fingerprint && (
                <Badge variant="outline" className="text-[10px] border-teal-200 text-teal-700 bg-teal-50 px-1.5">
                  FP
                </Badge>
              )}
            </div>

            {/* User Avatar */}
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center ml-1">
              <span className="text-white text-xs font-bold">
                {user?.name?.charAt(0)?.toUpperCase() || 'A'}
              </span>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-6 bg-slate-50">
          {renderPage()}
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-slate-200 py-3 px-4 lg:px-6">
          <p className="text-xs text-slate-400 text-center">
            © 2025 Attindo HR & Payroll System
          </p>
        </footer>
      </div>
    </div>
  )
}

function getPageTitle(page: PageId): string {
  const titles: Record<PageId, string> = {
    dashboard: 'Dashboard',
    employees: 'Employee Management',
    attendance: 'Attendance Tracking',
    fingerprint: 'Fingerprint Devices',
    leave: 'Leave Management',
    payroll: 'Payroll Management',
    license: 'License Management',
    settings: 'System Settings',
    departments: 'Department Management',
    positions: 'Position Management',
    holidays: 'Holiday Management',
  }
  return titles[page] || 'Dashboard'
}

function getPageTitleAr(page: PageId): string {
  const titles: Record<PageId, string> = {
    dashboard: 'لوحة التحكم',
    employees: 'إدارة الموظفين',
    attendance: 'تتبع الحضور',
    fingerprint: 'أجهزة البصمة',
    leave: 'إدارة الإجازات',
    payroll: 'إدارة الرواتب',
    license: 'إدارة التراخيص',
    settings: 'إعدادات النظام',
    departments: 'إدارة الأقسام',
    positions: 'إدارة المناصب',
    holidays: 'إدارة العطلات',
  }
  return titles[page] || 'لوحة التحكم'
}
