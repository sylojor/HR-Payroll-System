'use client';

import { useAppStore } from '@/store/app-store';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { AppHeader } from '@/components/layout/app-header';
import { DashboardSection } from '@/components/sections/dashboard-section';
import { EmployeesSection } from '@/components/sections/employees-section';
import { AttendanceSection } from '@/components/sections/attendance-section';
import { DevicesSection } from '@/components/sections/devices-section';
import { LeavesSection } from '@/components/sections/leaves-section';
import { PayrollSection } from '@/components/sections/payroll-section';
import { AccountingSection } from '@/components/sections/accounting-section';
import { MessagesSection } from '@/components/sections/messages-section';
import { NotificationsSection } from '@/components/sections/notifications-section';
import { SettingsSection } from '@/components/sections/settings-section';

const sections = {
  dashboard: DashboardSection,
  employees: EmployeesSection,
  attendance: AttendanceSection,
  devices: DevicesSection,
  leaves: LeavesSection,
  payroll: PayrollSection,
  accounting: AccountingSection,
  messages: MessagesSection,
  notifications: NotificationsSection,
  settings: SettingsSection,
};

export default function HomePage() {
  const { activeSection } = useAppStore();
  const ActiveSection = sections[activeSection];

  return (
    <div className="min-h-screen flex bg-background" dir="rtl">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader />
        <main className="flex-1 overflow-auto">
          <ActiveSection />
        </main>
      </div>
    </div>
  );
}
