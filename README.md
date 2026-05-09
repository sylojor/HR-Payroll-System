# Attindo - HR & Payroll System 🏢

<p align="center">
  <img src="build/icon.png" alt="Attindo Logo" width="120" height="120" />
  <br>
  <strong>نظام الموارد البشرية والرواتب</strong><br>
  Professional HR & Payroll Management System with ZK Fingerprint Device Integration
</p>

---

## 📥 Download & Install

### Windows Desktop App
Go to the [Releases page](https://github.com/sylojor/HR-Payroll-System/releases) and download the latest `Attindo-Setup-X.X.X.exe`.

1. Run the installer
2. Follow the setup wizard
3. Launch **Attindo** from your desktop or Start Menu

### System Requirements
- Windows 10 or later (64-bit)
- 4 GB RAM minimum
- 500 MB disk space
- ZK Fingerprint Device (optional)

---

## 🔑 Default Login
```
Username: admin
Password: admin123
```

## 📜 Test License Keys
| Key | Module | Description |
|-----|--------|-------------|
| `ATT-HR-2025-PRO-001` | HR | Activate HR Module |
| `ATT-PAY-2025-PRO-001` | Payroll | Activate Payroll Module |
| `ATT-FP-2025-PRO-010` | Fingerprint | Upgrade to 10 devices |

---

## ✨ Features

### 🏢 HR Module (Licensed)
- **Employee Management** - Full CRUD with Arabic/English names, departments, positions
- **Department Management** - Organizational structure with employee counts
- **Position Management** - Job positions with salary ranges per department

### ⏰ Attendance & Time Tracking
- **Daily Attendance** - Track check-in/check-out, late arrivals, early departures
- **Overtime Tracking** - Automatic overtime calculation
- **Status Filters** - Present, Absent, Late, Half Day, Leave, Holiday

### 👆 ZK Fingerprint Device Integration (3 Free, Licensed for More)
- **Device Management** - Add, sync, activate/deactivate ZK fingerprint devices
- **Free Tier** - 3 fingerprint devices included
- **Pro License** - 10+ devices with `ATT-FP-2025-PRO-010` license key

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

## 🖥️ Tech Stack

| Technology | Purpose |
|-----------|---------|
| **Next.js 16** | Framework (App Router) |
| **Electron** | Desktop App Wrapper |
| **TypeScript 5** | Language |
| **SQLite** | Embedded Database (via Prisma ORM) |
| **Tailwind CSS 4** | Styling |
| **shadcn/ui** | UI Components |
| **Recharts** | Charts & Visualization |
| **Zustand** | State Management |
| **Lucide React** | Icons |

---

## 📊 License Tiers

| Feature | Free | Licensed |
|---------|------|----------|
| Fingerprint Devices | 3 | 10+ |
| HR Module | ❌ | ✅ |
| Payroll Module | ❌ | ✅ |
| Attendance Tracking | ✅ | ✅ |
| Leave Management | ✅ | ✅ |
| Settings | ✅ | ✅ |

---

## 🛠️ Development

### Prerequisites
- Node.js 20+
- Bun

### Setup
```bash
# Install dependencies
bun install

# Generate Prisma client
bun run db:generate

# Push database schema
bun run db:push

# Run development server
bun run dev
```

### Build Windows Desktop App
```bash
# Build Next.js + Electron for Windows
bun run dist
```

### Create a Release
Push a tag to trigger the GitHub Actions build:
```bash
git tag v1.0.0
git push origin v1.0.0
```

Or use the GitHub Actions workflow dispatch with a version number.

---

## 📁 Project Structure

```
├── electron/              # Electron main & preload scripts
│   ├── main.js           # Main process (window, server management)
│   └── preload.js        # Security preload script
├── src/
│   ├── app/
│   │   ├── api/          # API routes
│   │   ├── layout.tsx    # Root layout
│   │   └── page.tsx      # Main entry
│   ├── components/
│   │   ├── attindo/      # App components
│   │   └── ui/           # shadcn/ui components
│   ├── lib/
│   │   ├── db.ts         # Prisma client
│   │   ├── store.ts      # Zustand store
│   │   └── utils.ts      # Utilities
│   └── hooks/            # Custom hooks
├── prisma/
│   └── schema.prisma     # Database schema
├── build/                # Electron build resources (icons, installer)
├── scripts/              # Utility scripts
└── .github/workflows/    # CI/CD for Windows builds
```

---

<p align="center">
  Built with ❤️ by Attindo Team<br>
  © 2025 Attindo HR & Payroll System
</p>
