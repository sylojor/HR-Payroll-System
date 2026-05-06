# Task: HR & Accounting System - Section Components & API Routes

## Summary
Created all required section components and API routes for the HR & Accounting system with RTL Arabic layout.

## Files Created

### API Routes
1. `/src/app/api/employees/route.ts` - GET (list with pagination/search/filters) + POST (create)
2. `/src/app/api/employees/[id]/route.ts` - GET (single with full details) + PUT (update) + DELETE
3. `/src/app/api/departments/route.ts` - GET (list with employee count) + POST (create)
4. `/src/app/api/departments/[id]/route.ts` - PUT (update) + DELETE (with employee check)
5. `/src/app/api/positions/route.ts` - GET (list with department filter) + POST (create)
6. `/src/app/api/positions/[id]/route.ts` - PUT (update) + DELETE (with employee check)

### Section Components
1. `/src/components/sections/dashboard-section.tsx` - Full dashboard with stat cards, attendance BarChart, department PieChart, leave requests table, device status, notifications
2. `/src/components/sections/employees-section.tsx` - Employee management with search/filter, paginated table, add/edit dialog with tabs (basic/job/financial)

### Placeholder Sections (for navigation)
- attendance-section.tsx, devices-section.tsx, leaves-section.tsx, payroll-section.tsx
- accounting-section.tsx, messages-section.tsx, notifications-section.tsx, settings-section.tsx

## Files Modified
- `/src/app/layout.tsx` - Changed lang to "ar", added dir="rtl", updated metadata to Arabic

## Technical Details
- All API routes use `import { db } from '@/lib/db'` with Prisma ORM
- All components are 'use client' with Arabic text
- emerald-600 used as primary accent color
- recharts used for BarChart and PieChart in dashboard
- Employee section uses shadcn Dialog, Tabs, Input, Select, Label, Table, Badge
- Numbers formatted with toLocaleString('ar-JO')
- Dates formatted with toLocaleDateString('ar-JO')
- Lint passes clean with no errors
