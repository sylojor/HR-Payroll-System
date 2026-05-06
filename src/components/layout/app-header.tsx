'use client';

import { useAppStore, type Section } from '@/store/app-store';
import { Menu, Bell, MessageSquare, Search, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState } from 'react';

const sectionTitles: Record<Section, string> = {
  dashboard: 'لوحة التحكم',
  employees: 'إدارة الموظفين',
  attendance: 'الحضور والانصراف',
  devices: 'أجهزة البصمة',
  leaves: 'إدارة الإجازات',
  payroll: 'الرواتب والكشوفات',
  accounting: 'المحاسبة',
  messages: 'الرسائل',
  notifications: 'التنبيهات',
  license: 'الترخيص والتفعيل',
  settings: 'الإعدادات',
};

const sectionDescriptions: Record<Section, string> = {
  dashboard: 'نظرة عامة على حالة النظام',
  employees: 'إدارة بيانات الموظفين والاقسام والمناصب',
  attendance: 'متابعة الحضور والانصراف والتأخير',
  devices: 'إدارة أجهزة البصمة ZK و Hikvision',
  leaves: 'إدارة طلبات الإجازات والموافقات',
  payroll: 'معالجة الرواتب وإنشاء الكشوفات',
  accounting: 'إدارة الحسابات والقيود المحاسبية',
  messages: 'المراسلات الداخلية بين الموظفين',
  notifications: 'التنبيهات والإشعارات',
  license: 'إدارة الترخيص وتفعيل النظام',
  settings: 'إعدادات النظام والشركة',
};

export function AppHeader() {
  const { activeSection, toggleSidebar, sidebarOpen } = useAppStore();
  const [darkMode, setDarkMode] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const initTimer = requestAnimationFrame(() => {
      setMounted(true);
      setCurrentTime(new Date());
    });
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => {
      cancelAnimationFrame(initTimer);
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  return (
    <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-md border-b border-border">
      <div className="flex items-center gap-4 px-4 h-16">
        {/* Toggle Sidebar */}
        <Button variant="ghost" size="icon" onClick={toggleSidebar} className="shrink-0">
          <Menu className="h-5 w-5" />
        </Button>

        {/* Section Info */}
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-lg truncate">{sectionTitles[activeSection]}</h2>
          <p className="text-xs text-muted-foreground truncate hidden sm:block">
            {sectionDescriptions[activeSection]}
          </p>
        </div>

        {/* Search */}
        <div className="hidden md:flex items-center relative max-w-xs flex-1">
          <Search className="absolute right-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="بحث..."
            className="pr-9 bg-muted/50 border-0 focus-visible:ring-1"
          />
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Time */}
          {mounted && currentTime && (
            <div className="hidden lg:flex flex-col items-end text-xs">
              <span className="font-mono font-medium">
                {currentTime.toLocaleTimeString('ar-JO', { hour: '2-digit', minute: '2-digit' })}
              </span>
              <span className="text-muted-foreground">
                {currentTime.toLocaleDateString('ar-JO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            </div>
          )}

          {/* Dark Mode Toggle */}
          <Button variant="ghost" size="icon" onClick={() => setDarkMode(!darkMode)}>
            {mounted && darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative" onClick={() => useAppStore.getState().setActiveSection('notifications')}>
            <Bell className="h-4 w-4" />
            <Badge className="absolute -top-1 -left-1 h-4 min-w-4 text-[10px] bg-red-500 text-white p-0 flex items-center justify-center">
              3
            </Badge>
          </Button>

          {/* Messages */}
          <Button variant="ghost" size="icon" className="relative" onClick={() => useAppStore.getState().setActiveSection('messages')}>
            <MessageSquare className="h-4 w-4" />
            <Badge className="absolute -top-1 -left-1 h-4 min-w-4 text-[10px] bg-emerald-500 text-white p-0 flex items-center justify-center">
              2
            </Badge>
          </Button>
        </div>
      </div>
    </header>
  );
}
