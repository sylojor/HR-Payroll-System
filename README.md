# Attindo - HR & Payroll System

<p align="center">
  <strong>نظام الموارد البشرية والرواتب</strong><br>
  Comprehensive HR & Payroll Management System with Fingerprint Device Integration
</p>

---

## Features

### 🏢 HR Module (Licensed)
- **Employee Management** - Full CRUD with Arabic/English names, departments, positions
- **Department Management** - Organizational structure with employee counts
- **Position Management** - Job positions with salary ranges per department

### ⏰ Attendance & Time Tracking
- **Daily Attendance** - Track check-in/check-out, late arrivals, early departures
- **Overtime Tracking** - Automatic overtime calculation
- **Status Filters** - Present, Absent, Late, Half Day, Leave, Holiday

### 🔍 ZK Fingerprint Device Integration (3 Free, Licensed for More)
- **Device Management** - Add, sync, activate/deactivate ZK fingerprint devices
- **Free Tier** - 3 fingerprint devices included
- **Pro License** - Unlimited devices with ATT-FP-2025-PRO-010 license key

### 💰 Payroll Module (Licensed)
- **Payroll Generation** - Auto-calculate based on attendance, salary components
- **Salary Components** - Customizable allowances and deductions (fixed or percentage)
- **Detailed Breakdown** - Basic salary, housing, transport, social security, tax
- **Payroll Periods** - Monthly payroll with draft/processing/completed/paid statuses

### 📋 Leave Management
- **Leave Types** - Annual, Sick, Maternity, Unpaid (customizable)
- **Request & Approval** - Submit requests, approve/reject workflow
- **Status Tracking** - Pending, Approved, Rejected

### 🔑 License Management
- **Module Licensing** - HR, Payroll, and Fingerprint modules individually licensed
- **Activation Keys** - Enter license keys to unlock premium features
- **Free Tier** - 3 fingerprint devices, basic attendance tracking

### ⚙️ Settings
- **Company Info** - Name, address, currency, tax rate
- **Attendance Settings** - Working days, start/end time, grace period
- **Payroll Settings** - Tax, social security rates
- **Fingerprint Settings** - Auto sync, sync interval

### 🌍 Bilingual Support
- **English / العربية** - Full RTL Arabic support
- **Language Toggle** - Switch between English and Arabic

---

## Quick Start

### Login
```
Username: admin
Password: admin123
```

### Test License Keys
| Key | Module | Description |
|-----|--------|-------------|
| `ATT-HR-2025-PRO-001` | HR | Activate HR Module |
| `ATT-PAY-2025-PRO-001` | Payroll | Activate Payroll Module |
| `ATT-FP-2025-PRO-010` | Fingerprint | Upgrade to 10 devices |

---

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5
- **Database**: SQLite (via Prisma ORM)
- **UI**: Tailwind CSS 4 + shadcn/ui
- **Charts**: Recharts
- **State**: Zustand
- **Icons**: Lucide React

---

## License Tiers

| Feature | Free | Licensed |
|---------|------|----------|
| Fingerprint Devices | 3 | 10+ |
| HR Module | ❌ | ✅ |
| Payroll Module | ❌ | ✅ |
| Attendance Tracking | ✅ | ✅ |
| Leave Management | ✅ | ✅ |
| Settings | ✅ | ✅ |

---

## Project Structure

```
src/
├── app/
│   ├── api/           # API routes (auth, employees, attendance, etc.)
│   ├── layout.tsx     # Root layout
│   └── page.tsx       # Main entry point
├── components/
│   ├── attindo/       # Application components
│   │   ├── app-shell.tsx
│   │   ├── login.tsx
│   │   ├── dashboard-page.tsx
│   │   ├── employees-page.tsx
│   │   ├── attendance-page.tsx
│   │   ├── fingerprint-page.tsx
│   │   ├── leave-page.tsx
│   │   ├── payroll-page.tsx
│   │   ├── license-page.tsx
│   │   ├── settings-page.tsx
│   │   └── ...
│   └── ui/            # shadcn/ui components
├── lib/
│   ├── db.ts          # Prisma client
│   ├── store.ts       # Zustand store
│   └── utils.ts       # Utilities
└── prisma/
    └── schema.prisma  # Database schema
```

---

<p align="center">
  © 2025 Attindo HR & Payroll System
</p>
