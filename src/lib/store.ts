import { create } from 'zustand'

export type PageId =
  | 'dashboard'
  | 'employees'
  | 'attendance'
  | 'fingerprint'
  | 'leave'
  | 'payroll'
  | 'license'
  | 'settings'
  | 'departments'
  | 'positions'
  | 'holidays'

interface User {
  id: string
  username: string
  name: string
  email: string
  role: string
}

interface LicenseStatus {
  hr: boolean
  payroll: boolean
  fingerprint: boolean
}

interface AppState {
  currentPage: PageId
  sidebarOpen: boolean
  language: 'en' | 'ar'
  isAuthenticated: boolean
  user: User | null
  licenseStatus: LicenseStatus

  setCurrentPage: (page: PageId) => void
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
  setLanguage: (lang: 'en' | 'ar') => void
  setAuthenticated: (auth: boolean) => void
  setUser: (user: User | null) => void
  setLicenseStatus: (status: LicenseStatus) => void
  logout: () => void
}

export const useAppStore = create<AppState>((set) => ({
  currentPage: 'dashboard',
  sidebarOpen: true,
  language: 'en',
  isAuthenticated: false,
  user: null,
  licenseStatus: { hr: false, payroll: false, fingerprint: false },

  setCurrentPage: (page) => set({ currentPage: page }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setLanguage: (lang) => set({ language: lang }),
  setAuthenticated: (auth) => set({ isAuthenticated: auth }),
  setUser: (user) => set({ user }),
  setLicenseStatus: (status) => set({ licenseStatus: status }),
  logout: () =>
    set({
      isAuthenticated: false,
      user: null,
      currentPage: 'dashboard',
    }),
}))
