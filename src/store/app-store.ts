import { create } from 'zustand';

export type Section = 
  | 'dashboard'
  | 'employees'
  | 'attendance'
  | 'devices'
  | 'leaves'
  | 'payroll'
  | 'accounting'
  | 'messages'
  | 'notifications'
  | 'license'
  | 'settings';

interface AppState {
  activeSection: Section;
  setActiveSection: (section: Section) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeSection: 'dashboard',
  setActiveSection: (section) => set({ activeSection: section }),
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
}));
