'use client';

import { useAppStore, type Section } from '@/store/app-store';
import {
  LayoutDashboard,
  Users,
  Clock,
  Fingerprint,
  CalendarDays,
  Banknote,
  BookOpen,
  MessageSquare,
  Bell,
  Settings,
  ChevronRight,
  Building2,
  Menu,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

const navItems: { id: Section; label: string; icon: React.ReactNode; group: string }[] = [
  { id: 'dashboard', label: 'لوحة التحكم', icon: <LayoutDashboard className="h-5 w-5" />, group: 'الرئيسية' },
  { id: 'employees', label: 'الموظفين', icon: <Users className="h-5 w-5" />, group: 'الموارد البشرية' },
  { id: 'attendance', label: 'الحضور والانصراف', icon: <Clock className="h-5 w-5" />, group: 'الموارد البشرية' },
  { id: 'devices', label: 'أجهزة البصمة', icon: <Fingerprint className="h-5 w-5" />, group: 'الموارد البشرية' },
  { id: 'leaves', label: 'الإجازات', icon: <CalendarDays className="h-5 w-5" />, group: 'الموارد البشرية' },
  { id: 'payroll', label: 'الرواتب والكشوفات', icon: <Banknote className="h-5 w-5" />, group: 'المالية' },
  { id: 'accounting', label: 'المحاسبة', icon: <BookOpen className="h-5 w-5" />, group: 'المالية' },
  { id: 'messages', label: 'الرسائل', icon: <MessageSquare className="h-5 w-5" />, group: 'التواصل' },
  { id: 'notifications', label: 'التنبيهات', icon: <Bell className="h-5 w-5" />, group: 'التواصل' },
  { id: 'settings', label: 'الإعدادات', icon: <Settings className="h-5 w-5" />, group: 'النظام' },
];

export function AppSidebar() {
  const { activeSection, setActiveSection, sidebarOpen, setSidebarOpen } = useAppStore();

  const groups = [...new Set(navItems.map((item) => item.group))];

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed top-0 right-0 z-50 h-full bg-card border-l border-border shadow-lg transition-all duration-300 flex flex-col',
          sidebarOpen ? 'w-72' : 'w-0 lg:w-16',
          'lg:relative lg:z-0'
        )}
      >
        {/* Header */}
        <div className={cn(
          'flex items-center gap-3 p-4 border-b border-border min-h-[64px]',
          !sidebarOpen && 'lg:justify-center lg:p-2'
        )}>
          <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-emerald-600 text-white shrink-0">
            <Building2 className="h-5 w-5" />
          </div>
          {sidebarOpen && (
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-sm truncate">نظام الموارد البشرية</h1>
              <p className="text-xs text-muted-foreground truncate">إدارة شاملة ومتكاملة</p>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 py-2">
          <nav className="px-2">
            {groups.map((group) => (
              <div key={group} className="mb-2">
                {sidebarOpen && (
                  <p className="px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    {group}
                  </p>
                )}
                {navItems
                  .filter((item) => item.group === group)
                  .map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveSection(item.id);
                        if (window.innerWidth < 1024) setSidebarOpen(false);
                      }}
                      className={cn(
                        'w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 mb-0.5',
                        activeSection === item.id
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                        !sidebarOpen && 'lg:justify-center lg:px-2'
                      )}
                    >
                      <span className="shrink-0">{item.icon}</span>
                      {sidebarOpen && (
                        <>
                          <span className="flex-1 text-right">{item.label}</span>
                          {item.id === 'notifications' && (
                            <Badge className="bg-red-500 text-white text-[10px] h-5 min-w-5 flex items-center justify-center">
                              3
                            </Badge>
                          )}
                          {item.id === 'messages' && (
                            <Badge className="bg-emerald-500 text-white text-[10px] h-5 min-w-5 flex items-center justify-center">
                              2
                            </Badge>
                          )}
                          <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100" />
                        </>
                      )}
                    </button>
                  ))}
                {sidebarOpen && <Separator className="my-2" />}
              </div>
            ))}
          </nav>
        </ScrollArea>

        {/* Footer */}
        {sidebarOpen && (
          <div className="p-4 border-t border-border">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold">
                م
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">مدير النظام</p>
                <p className="text-xs text-muted-foreground truncate">admin@system.com</p>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
