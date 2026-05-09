import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

const EMPLOYEES_DATA = [
  { firstName: 'Ahmad', lastName: 'Al-Rashid', firstNameAr: 'أحمد', lastNameAr: 'الرشيد', gender: 'MALE', salary: 850, deptIdx: 0, posIdx: 0, email: 'ahmad.rashid@attindo.com', phone: '+962791001001', nationality: 'Jordanian' },
  { firstName: 'Fatima', lastName: 'Al-Hussein', firstNameAr: 'فاطمة', lastNameAr: 'الحسين', gender: 'FEMALE', salary: 920, deptIdx: 0, posIdx: 1, email: 'fatima.hussein@attindo.com', phone: '+962791002002', nationality: 'Jordanian' },
  { firstName: 'Omar', lastName: 'Al-Masri', firstNameAr: 'عمر', lastNameAr: 'المصري', gender: 'MALE', salary: 780, deptIdx: 0, posIdx: 2, email: 'omar.masri@attindo.com', phone: '+962791003003', nationality: 'Jordanian' },
  { firstName: 'Layla', lastName: 'Al-Qassem', firstNameAr: 'ليلى', lastNameAr: 'القاسم', gender: 'FEMALE', salary: 950, deptIdx: 1, posIdx: 0, email: 'layla.qassem@attindo.com', phone: '+962791004004', nationality: 'Jordanian' },
  { firstName: 'Mohammed', lastName: 'Al-Tamimi', firstNameAr: 'محمد', lastNameAr: 'التميمي', gender: 'MALE', salary: 700, deptIdx: 1, posIdx: 1, email: 'mohammed.tamimi@attindo.com', phone: '+962791005005', nationality: 'Jordanian' },
  { firstName: 'Sara', lastName: 'Al-Nouri', firstNameAr: 'سارة', lastNameAr: 'النوري', gender: 'FEMALE', salary: 1100, deptIdx: 2, posIdx: 0, email: 'sara.nouri@attindo.com', phone: '+962791006006', nationality: 'Jordanian' },
  { firstName: 'Khaled', lastName: 'Al-Zoubi', firstNameAr: 'خالد', lastNameAr: 'الزعبي', gender: 'MALE', salary: 1050, deptIdx: 2, posIdx: 1, email: 'khaled.zoubi@attindo.com', phone: '+962791007007', nationality: 'Jordanian' },
  { firstName: 'Rania', lastName: 'Al-Khatib', firstNameAr: 'رانيا', lastNameAr: 'الخطيب', gender: 'FEMALE', salary: 880, deptIdx: 2, posIdx: 2, email: 'rania.khatib@attindo.com', phone: '+962791008008', nationality: 'Jordanian' },
  { firstName: 'Youssef', lastName: 'Al-Damour', firstNameAr: 'يوسف', lastNameAr: 'الدامور', gender: 'MALE', salary: 750, deptIdx: 3, posIdx: 0, email: 'youssef.damour@attindo.com', phone: '+962791009009', nationality: 'Jordanian' },
  { firstName: 'Nour', lastName: 'Al-Salem', firstNameAr: 'نور', lastNameAr: 'السالم', gender: 'FEMALE', salary: 820, deptIdx: 3, posIdx: 1, email: 'nour.salem@attindo.com', phone: '+962791010010', nationality: 'Jordanian' },
  { firstName: 'Hassan', lastName: 'Al-Fayez', firstNameAr: 'حسن', lastNameAr: 'الفايز', gender: 'MALE', salary: 680, deptIdx: 4, posIdx: 0, email: 'hassan.fayez@attindo.com', phone: '+962791011011', nationality: 'Jordanian' },
  { firstName: 'Aisha', lastName: 'Al-Bawaleez', firstNameAr: 'عائشة', lastNameAr: 'البواليز', gender: 'FEMALE', salary: 720, deptIdx: 4, posIdx: 1, email: 'aisha.bawaleez@attindo.com', phone: '+962791012012', nationality: 'Jordanian' },
  { firstName: 'Tariq', lastName: 'Al-Shammari', firstNameAr: 'طارق', lastNameAr: 'الشمري', gender: 'MALE', salary: 900, deptIdx: 0, posIdx: 0, email: 'tariq.shammari@attindo.com', phone: '+962791013013', nationality: 'Jordanian' },
  { firstName: 'Dina', lastName: 'Al-Azzam', firstNameAr: 'دينا', lastNameAr: 'العزام', gender: 'FEMALE', salary: 660, deptIdx: 1, posIdx: 1, email: 'dina.azzam@attindo.com', phone: '+962791014014', nationality: 'Jordanian' },
  { firstName: 'Sami', lastName: 'Al-Hourani', firstNameAr: 'سامي', lastNameAr: 'الحوراني', gender: 'MALE', salary: 790, deptIdx: 4, posIdx: 0, email: 'sami.hourani@attindo.com', phone: '+962791015015', nationality: 'Jordanian' },
  { firstName: 'Huda', lastName: 'Al-Makhzoumi', firstNameAr: 'هدى', lastNameAr: 'المخزومي', gender: 'FEMALE', salary: 830, deptIdx: 3, posIdx: 1, email: 'huda.makhzoumi@attindo.com', phone: '+962791016016', nationality: 'Jordanian' },
  { firstName: 'Zaid', lastName: 'Al-Kilani', firstNameAr: 'زيد', lastNameAr: 'الكلاني', gender: 'MALE', salary: 970, deptIdx: 2, posIdx: 1, email: 'zaid.kilani@attindo.com', phone: '+962791017017', nationality: 'Jordanian' },
  { firstName: 'Muna', lastName: 'Al-Rifai', firstNameAr: 'منى', lastNameAr: 'الرفاعي', gender: 'FEMALE', salary: 710, deptIdx: 0, posIdx: 2, email: 'muna.rifai@attindo.com', phone: '+962791018018', nationality: 'Jordanian' },
]

const DEPARTMENTS_DATA = [
  { name: 'Engineering', nameAr: 'الهندسة', description: 'Software development and technical operations' },
  { name: 'HR', nameAr: 'الموارد البشرية', description: 'Human resources management' },
  { name: 'Finance', nameAr: 'المالية', description: 'Financial operations and accounting' },
  { name: 'Marketing', nameAr: 'التسويق', description: 'Marketing and brand management' },
  { name: 'Operations', nameAr: 'العمليات', description: 'General operations and logistics' },
]

const POSITIONS_DATA = [
  { title: 'Senior Developer', titleAr: 'مطور أول', deptIdx: 0, minSalary: 800, maxSalary: 1200 },
  { title: 'Tech Lead', titleAr: 'قائد تقني', deptIdx: 0, minSalary: 1000, maxSalary: 1500 },
  { title: 'Junior Developer', titleAr: 'مطور مبتدئ', deptIdx: 0, minSalary: 500, maxSalary: 800 },
  { title: 'HR Manager', titleAr: 'مدير الموارد البشرية', deptIdx: 1, minSalary: 900, maxSalary: 1300 },
  { title: 'HR Specialist', titleAr: 'أخصائي موارد بشرية', deptIdx: 1, minSalary: 600, maxSalary: 900 },
  { title: 'Finance Manager', titleAr: 'مدير المالية', deptIdx: 2, minSalary: 1000, maxSalary: 1400 },
  { title: 'Accountant', titleAr: 'محاسب', deptIdx: 2, minSalary: 700, maxSalary: 1000 },
  { title: 'Auditor', titleAr: 'مدقق', deptIdx: 2, minSalary: 750, maxSalary: 1050 },
  { title: 'Marketing Manager', titleAr: 'مدير التسويق', deptIdx: 3, minSalary: 800, maxSalary: 1200 },
  { title: 'Marketing Specialist', titleAr: 'أخصائي تسويق', deptIdx: 3, minSalary: 600, maxSalary: 900 },
  { title: 'Operations Manager', titleAr: 'مدير العمليات', deptIdx: 4, minSalary: 800, maxSalary: 1100 },
  { title: 'Operations Coordinator', titleAr: 'منسق عمليات', deptIdx: 4, minSalary: 550, maxSalary: 800 },
]

const HOLIDAYS_2025 = [
  { name: 'New Year\'s Day', nameAr: 'رأس السنة الميلادية', date: '2025-01-01', type: 'PUBLIC' },
  { name: 'Labor Day', nameAr: 'عيد العمال', date: '2025-05-01', type: 'PUBLIC' },
  { name: 'Independence Day', nameAr: 'عيد الاستقلال', date: '2025-05-25', type: 'PUBLIC' },
  { name: 'Army Day', nameAr: 'عيد الجيش', date: '2025-06-10', type: 'PUBLIC' },
  { name: 'King\'s Birthday', nameAr: 'عيد ميلاد الملك', date: '2025-01-30', type: 'PUBLIC' },
  { name: 'Eid Al-Fitr', nameAr: 'عيد الفطر', date: '2025-03-30', type: 'PUBLIC' },
  { name: 'Eid Al-Adha', nameAr: 'عيد الأضحى', date: '2025-06-06', type: 'PUBLIC' },
  { name: 'Islamic New Year', nameAr: 'رأس السنة الهجرية', date: '2025-06-27', type: 'PUBLIC' },
  { name: 'Prophet\'s Birthday', nameAr: 'عيد المولد النبوي', date: '2025-09-05', type: 'PUBLIC' },
  { name: 'Christmas Day', nameAr: 'عيد الميلاد المجيد', date: '2025-12-25', type: 'PUBLIC' },
  { name: 'Company Foundation Day', nameAr: 'يوم تأسيس الشركة', date: '2025-04-15', type: 'COMPANY' },
]

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const force = searchParams.get('force') === 'true'

    if (force) {
      // Clear all data before reseeding
      await db.payrollItem.deleteMany()
      await db.payroll.deleteMany()
      await db.attendance.deleteMany()
      await db.leave.deleteMany()
      await db.leaveType.deleteMany()
      await db.salaryComponent.deleteMany()
      await db.employee.deleteMany()
      await db.position.deleteMany()
      await db.department.deleteMany()
      await db.fingerprintDevice.deleteMany()
      await db.license.deleteMany()
      await db.settings.deleteMany()
      await db.auditLog.deleteMany()
      await db.holiday.deleteMany()
      await db.user.deleteMany()
      await db.company.deleteMany()
    }

    const existingCompany = await db.company.findFirst()
    if (existingCompany && !force) {
      return NextResponse.json({ message: 'Database already seeded', skipped: true })
    }

    // 1. Create company
    const company = await db.company.create({
      data: {
        name: 'Attindo Corp',
        nameAr: 'شركة أتيندو',
        address: 'Amman, Jordan - Shmeisani',
        phone: '+96265100100',
        email: 'info@attindo.com',
        currency: 'JOD',
        currencySymbol: 'د.ا',
        taxRate: 5.0,
        workingHoursPerDay: 8.0,
        overtimeRate: 1.5,
      },
    })

    // 2. Create departments
    const departments = []
    for (const deptData of DEPARTMENTS_DATA) {
      const dept = await db.department.create({
        data: {
          name: deptData.name,
          nameAr: deptData.nameAr,
          description: deptData.description,
        },
      })
      departments.push(dept)
    }

    // 4. Create positions
    const positions = []
    for (const posData of POSITIONS_DATA) {
      const pos = await db.position.create({
        data: {
          title: posData.title,
          titleAr: posData.titleAr,
          departmentId: departments[posData.deptIdx].id,
          minSalary: posData.minSalary,
          maxSalary: posData.maxSalary,
        },
      })
      positions.push(pos)
    }

    // 5. Create employees
    const employees = []
    for (let i = 0; i < EMPLOYEES_DATA.length; i++) {
      const emp = EMPLOYEES_DATA[i]
      const employeeId = `EMP-${String(i + 1).padStart(3, '0')}`
      const hireYear = 2020 + Math.floor(Math.random() * 5)
      const hireMonth = 1 + Math.floor(Math.random() * 12)
      const hireDay = 1 + Math.floor(Math.random() * 28)

      const status = i < 16 ? 'ACTIVE' : (i < 17 ? 'ON_LEAVE' : 'INACTIVE')

      const created = await db.employee.create({
        data: {
          employeeId,
          firstName: emp.firstName,
          lastName: emp.lastName,
          firstNameAr: emp.firstNameAr,
          lastNameAr: emp.lastNameAr,
          email: emp.email,
          phone: emp.phone,
          gender: emp.gender,
          dateOfBirth: new Date(1985 + Math.floor(Math.random() * 15), Math.floor(Math.random() * 12), 1 + Math.floor(Math.random() * 28)),
          nationality: emp.nationality,
          address: 'Amman, Jordan',
          departmentId: departments[emp.deptIdx].id,
          positionId: positions[emp.posIdx].id,
          hireDate: new Date(hireYear, hireMonth - 1, hireDay),
          salary: emp.salary,
          status,
          fingerprintEnrolled: i < 12,
          bankName: 'Arab Bank',
          bankAccount: `JO39ABNA${String(10000000 + i).padStart(8, '0')}`,
        },
      })
      employees.push(created)
    }

    // 6. Create fingerprint devices
    const devices = []
    const deviceData = [
      { name: 'Main Entrance', ip: '192.168.1.100', location: 'Building A - Main Entrance', sn: 'ZK20250001' },
      { name: 'Office Floor 1', ip: '192.168.1.101', location: 'Building A - Floor 1', sn: 'ZK20250002' },
      { name: 'Office Floor 2', ip: '192.168.1.102', location: 'Building A - Floor 2', sn: 'ZK20250003' },
    ]
    for (const dd of deviceData) {
      const device = await db.fingerprintDevice.create({
        data: {
          name: dd.name,
          ip: dd.ip,
          port: 4370,
          deviceType: 'ZK',
          status: 'ACTIVE',
          location: dd.location,
          lastSync: new Date(),
          sn: dd.sn,
          firmware: 'Ver 6.60',
        },
      })
      devices.push(device)
    }

    // 7. Create attendance records for the last 30 days
    const today = new Date()
    for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
      const date = new Date(today)
      date.setDate(date.getDate() - dayOffset)
      const dayOfWeek = date.getDay()
      if (dayOfWeek === 5 || dayOfWeek === 6) continue

      for (let empIdx = 0; empIdx < employees.length; empIdx++) {
        const emp = employees[empIdx]
        if (emp.status === 'INACTIVE' || emp.status === 'TERMINATED') continue

        const rand = Math.random()
        let status: string
        let checkIn: Date | null = null
        let checkOut: Date | null = null
        let lateMinutes = 0
        let earlyLeaveMinutes = 0
        let overtimeHours = 0

        if (rand < 0.75) {
          status = 'PRESENT'
          const lateMin = Math.random() < 0.2 ? Math.floor(Math.random() * 30) : 0
          lateMinutes = lateMin
          const checkInHour = 8 + Math.floor(lateMin / 60)
          const checkInMinute = lateMin % 60
          checkIn = new Date(date.getFullYear(), date.getMonth(), date.getDate(), checkInHour, checkInMinute + Math.floor(Math.random() * 10))

          if (Math.random() < 0.3) {
            overtimeHours = Math.round((0.5 + Math.random() * 2) * 10) / 10
          }
          const checkOutHour = 17 + Math.floor(overtimeHours)
          const earlyLeave = Math.random() < 0.1 ? Math.floor(Math.random() * 30) : 0
          earlyLeaveMinutes = earlyLeave
          checkOut = new Date(date.getFullYear(), date.getMonth(), date.getDate(), checkOutHour, 0 - earlyLeave + Math.floor(Math.random() * 15))
        } else if (rand < 0.85) {
          status = 'LATE'
          lateMinutes = 30 + Math.floor(Math.random() * 60)
          checkIn = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 9, Math.floor(Math.random() * 60))
          checkOut = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 17, Math.floor(Math.random() * 30))
        } else if (rand < 0.92) {
          status = 'ABSENT'
        } else if (rand < 0.96) {
          status = 'LEAVE'
        } else {
          status = 'HALF_DAY'
          checkIn = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 8, Math.floor(Math.random() * 15))
          checkOut = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, Math.floor(Math.random() * 30))
        }

        await db.attendance.create({
          data: {
            employeeId: emp.id,
            date: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
            checkIn,
            checkOut,
            status,
            overtimeHours,
            lateMinutes,
            earlyLeaveMinutes,
            deviceId: devices[Math.floor(Math.random() * devices.length)].id,
            fingerprintMatch: status !== 'ABSENT' && status !== 'LEAVE',
          },
        })
      }
    }

    // 8. Create leave types
    const leaveTypes = []
    const leaveTypesData = [
      { name: 'Annual Leave', nameAr: 'إجازة سنوية', defaultDays: 14, isPaid: true, carryForward: true, maxCarryDays: 5 },
      { name: 'Sick Leave', nameAr: 'إجازة مرضية', defaultDays: 10, isPaid: true, carryForward: false, maxCarryDays: 0 },
      { name: 'Maternity Leave', nameAr: 'إجازة أمومة', defaultDays: 70, isPaid: true, carryForward: false, maxCarryDays: 0 },
      { name: 'Unpaid Leave', nameAr: 'إجازة بدون راتب', defaultDays: 30, isPaid: false, carryForward: false, maxCarryDays: 0 },
    ]
    for (const lt of leaveTypesData) {
      const leaveType = await db.leaveType.create({ data: lt })
      leaveTypes.push(leaveType)
    }

    // Create sample leave requests
    const activeEmployees = employees.filter(e => e.status === 'ACTIVE')
    if (activeEmployees.length >= 3) {
      await db.leave.create({
        data: {
          employeeId: activeEmployees[0].id,
          typeId: leaveTypes[0].id,
          startDate: new Date(today.getFullYear(), today.getMonth(), 10),
          endDate: new Date(today.getFullYear(), today.getMonth(), 12),
          days: 3,
          status: 'APPROVED',
          reason: 'Family vacation',
          approvedBy: 'Administrator',
        },
      })
      await db.leave.create({
        data: {
          employeeId: activeEmployees[1].id,
          typeId: leaveTypes[1].id,
          startDate: new Date(today.getFullYear(), today.getMonth(), 15),
          endDate: new Date(today.getFullYear(), today.getMonth(), 16),
          days: 2,
          status: 'PENDING',
          reason: 'Medical appointment',
        },
      })
      await db.leave.create({
        data: {
          employeeId: activeEmployees[2].id,
          typeId: leaveTypes[0].id,
          startDate: new Date(today.getFullYear(), today.getMonth(), 20),
          endDate: new Date(today.getFullYear(), today.getMonth(), 22),
          days: 3,
          status: 'PENDING',
          reason: 'Personal matters',
        },
      })
    }

    // 9. Create salary components
    const salaryComponentsData = [
      { name: 'Housing Allowance', nameAr: 'بدل سكن', type: 'ALLOWANCE', percentage: 25, isFixed: false, isTaxable: false, isRecurring: true },
      { name: 'Transport Allowance', nameAr: 'بدل نقل', type: 'ALLOWANCE', amount: 50, isFixed: true, isTaxable: false, isRecurring: true },
      { name: 'Social Security', nameAr: 'الضمان الاجتماعي', type: 'DEDUCTION', percentage: 5, isFixed: false, isTaxable: false, isRecurring: true },
      { name: 'Tax', nameAr: 'ضريبة الدخل', type: 'DEDUCTION', percentage: 5, isFixed: false, isTaxable: true, isRecurring: true },
    ]
    for (const sc of salaryComponentsData) {
      await db.salaryComponent.create({ data: sc })
    }

    // 10. Create payroll for current month
    const currentMonth = today.getMonth() + 1
    const currentYear = today.getFullYear()

    const salaryComponents = await db.salaryComponent.findMany()
    const payrollActiveEmployees = employees.filter(e => e.status === 'ACTIVE')

    let totalGross = 0
    let totalDeductions = 0
    let totalNet = 0

    const payrollItemsData = []
    for (const emp of payrollActiveEmployees) {
      const basicSalary = emp.salary
      let empTotalAllowances = 0
      let empTotalDeductions = 0

      const breakdownItems: { name: string; nameAr: string; type: string; amount: number }[] = []

      for (const comp of salaryComponents) {
        if (!comp.isActive) continue
        let amount = 0
        if (comp.isFixed) {
          amount = comp.amount
        } else if (comp.percentage > 0) {
          amount = Math.round(basicSalary * comp.percentage / 100 * 100) / 100
        }

        if (comp.type === 'ALLOWANCE') {
          empTotalAllowances += amount
          breakdownItems.push({ name: comp.name, nameAr: comp.nameAr, type: 'ALLOWANCE', amount })
        } else {
          empTotalDeductions += amount
          breakdownItems.push({ name: comp.name, nameAr: comp.nameAr, type: 'DEDUCTION', amount })
        }
      }

      const grossSalary = basicSalary + empTotalAllowances
      const taxAmount = Math.round(basicSalary * 0.05 * 100) / 100
      const netSalary = Math.round((grossSalary - empTotalDeductions) * 100) / 100

      totalGross += grossSalary
      totalDeductions += empTotalDeductions
      totalNet += netSalary

      const monthStart = new Date(currentYear, currentMonth - 1, 1)
      const monthEnd = new Date(currentYear, currentMonth, 0)
      const attendanceRecords = await db.attendance.findMany({
        where: {
          employeeId: emp.id,
          date: { gte: monthStart, lte: monthEnd },
          status: { in: ['PRESENT', 'LATE', 'HALF_DAY'] },
        },
      })
      const daysWorked = attendanceRecords.length
      const overtimeHrs = attendanceRecords.reduce((sum, a) => sum + a.overtimeHours, 0)
      const overtimeAmt = Math.round(overtimeHrs * (basicSalary / 30 / 8) * 1.5 * 100) / 100

      payrollItemsData.push({
        employeeId: emp.id,
        basicSalary,
        totalAllowances: empTotalAllowances,
        totalDeductions: empTotalDeductions,
        grossSalary,
        taxAmount,
        netSalary,
        daysWorked,
        overtimeHours: overtimeHrs,
        overtimeAmount: overtimeAmt,
        details: JSON.stringify(breakdownItems),
      })
    }

    const payroll = await db.payroll.create({
      data: {
        month: currentMonth,
        year: currentYear,
        status: 'DRAFT',
        totalGross: Math.round(totalGross * 100) / 100,
        totalDeductions: Math.round(totalDeductions * 100) / 100,
        totalNet: Math.round(totalNet * 100) / 100,
        notes: 'Auto-generated payroll for current month',
      },
    })

    for (const item of payrollItemsData) {
      await db.payrollItem.create({
        data: {
          payrollId: payroll.id,
          ...item,
        },
      })
    }

    // 11. Create default license + test license keys
    await db.license.create({
      data: {
        key: 'FREE-FINGERPRINT-3',
        module: 'FINGERPRINT',
        maxDevices: 3,
        activatedDevices: 3,
        activatedAt: new Date(),
        isActive: true,
        companyName: company.name,
        contactEmail: company.email,
      },
    })

    // Test license keys (inactive - for users to activate)
    await db.license.create({
      data: {
        key: 'ATT-HR-2025-PRO-001',
        module: 'HR',
        maxDevices: 1,
        activatedDevices: 0,
        expiresAt: new Date('2026-12-31'),
        isActive: false,
        companyName: '',
        contactEmail: '',
      },
    })
    await db.license.create({
      data: {
        key: 'ATT-PAY-2025-PRO-001',
        module: 'PAYROLL',
        maxDevices: 1,
        activatedDevices: 0,
        expiresAt: new Date('2026-12-31'),
        isActive: false,
        companyName: '',
        contactEmail: '',
      },
    })
    await db.license.create({
      data: {
        key: 'ATT-FP-2025-PRO-010',
        module: 'FINGERPRINT',
        maxDevices: 10,
        activatedDevices: 0,
        expiresAt: new Date('2026-12-31'),
        isActive: false,
        companyName: '',
        contactEmail: '',
      },
    })

    // 12. Create holidays for 2025
    for (const holiday of HOLIDAYS_2025) {
      const [year, month, day] = holiday.date.split('-').map(Number)
      await db.holiday.create({
        data: {
          name: holiday.name,
          nameAr: holiday.nameAr,
          date: new Date(year, month - 1, day),
          type: holiday.type,
          recurring: true,
        },
      })
    }

    // 13. Create default settings
    const settingsData = [
      { key: 'working_days', value: 'SUNDAY,MONDAY,TUESDAY,WEDNESDAY,THURSDAY', category: 'attendance' },
      { key: 'work_start_time', value: '08:00', category: 'attendance' },
      { key: 'work_end_time', value: '17:00', category: 'attendance' },
      { key: 'grace_period_minutes', value: '15', category: 'attendance' },
      { key: 'overtime_threshold_hours', value: '8', category: 'attendance' },
      { key: 'currency', value: 'JOD', category: 'general' },
      { key: 'date_format', value: 'YYYY-MM-DD', category: 'general' },
      { key: 'language', value: 'en', category: 'general' },
      { key: 'company_name', value: 'Attindo Corp', category: 'general' },
      { key: 'tax_enabled', value: 'true', category: 'payroll' },
      { key: 'social_security_enabled', value: 'true', category: 'payroll' },
      { key: 'social_security_rate', value: '5', category: 'payroll' },
      { key: 'tax_rate', value: '5', category: 'payroll' },
      { key: 'payroll_cutoff_day', value: '25', category: 'payroll' },
      { key: 'auto_attendance_sync', value: 'true', category: 'fingerprint' },
      { key: 'sync_interval_minutes', value: '30', category: 'fingerprint' },
    ]
    for (const setting of settingsData) {
      await db.settings.create({ data: setting })
    }

    return NextResponse.json({
      message: 'Database seeded successfully',
      data: {
        company: company.name,
        departments: departments.length,
        positions: positions.length,
        employees: employees.length,
        devices: devices.length,
        leaveTypes: leaveTypes.length,
        holidays: HOLIDAYS_2025.length,
        settings: settingsData.length,
      },
    })
  } catch (error) {
    console.error('Seed error:', error)
    const message = error instanceof Error ? error.message : 'Failed to seed database'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
