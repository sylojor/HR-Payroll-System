# Task: Payroll and Accounting Section Implementation

## Work Summary

### API Routes Created

#### Payroll API Routes
1. **`/api/payroll/route.ts`** - GET (fetch payroll by month/year) + POST (process payroll)
   - POST processes payroll for all active employees
   - Calculates basic salary, earnings, deductions (7% social security, 5% tax on taxable income over 1000 JOD)
   - Creates Payroll and PayrollItems with detailed salary breakdown as JSON

2. **`/api/payroll/[id]/route.ts`** - GET (payroll details with items)
3. **`/api/payroll/[id]/pay/route.ts`** - POST (mark items as paid, all or specific)
4. **`/api/salary-components/route.ts`** - GET (list all) + POST (create)
5. **`/api/salary-components/[id]/route.ts`** - PUT (update) + DELETE (with usage check)

#### Accounting API Routes
1. **`/api/accounts/route.ts`** - GET (list with type filter) + POST (create with code uniqueness check)
2. **`/api/accounts/[id]/route.ts`** - PUT (update) + DELETE (with transaction check)
3. **`/api/accounts/trial-balance/route.ts`** - GET (all accounts with debit/credit totals, balanced check)
4. **`/api/transactions/route.ts`** - GET (list with date/status filters) + POST (create journal entry with balance updates)
5. **`/api/transactions/[id]/route.ts`** - PUT (update with balance reversal/reapply) + DELETE (with balance reversal)

### Frontend Components Created

1. **`payroll-section.tsx`** - Full payroll management with:
   - Month/Year selector
   - Summary cards (total earnings, deductions, net, employee count)
   - Process Payroll button
   - Payroll table with expandable rows showing salary breakdown
   - Pay All and Export Payslips buttons
   - Salary Components tab with CRUD operations
   - Add/Edit component dialog

2. **`accounting-section.tsx`** - Full accounting module with:
   - Chart of Accounts tab with CRUD, type badges (color-coded)
   - Journal Entries tab with add transaction dialog
   - Trial Balance tab with debit/credit totals and balance check

3. **Placeholder sections** for: dashboard, employees, attendance, devices, leaves, messages, notifications, settings

### Key Design Decisions
- All text in Arabic
- Currency formatted as `amount.toLocaleString('ar-JO') + ' د.أ'`
- Emerald-600 accent color throughout
- RTL layout (dir="rtl")
- Used shadcn/ui Tabs, Table, Dialog, Select, Card components
- All components are 'use client'
