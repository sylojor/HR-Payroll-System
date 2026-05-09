import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

const DEPARTMENTS = [
  { name: 'Engineering', nameAr: 'الهندسة', description: 'Software development and technical operations' },
  { name: 'HR', nameAr: 'الموارد البشرية', description: 'Human resources management' },
  { name: 'Finance', nameAr: 'المالية', description: 'Financial operations and accounting' },
  { name: 'Marketing', nameAr: 'التسويق', description: 'Marketing and brand management' },
  { name: 'Operations', nameAr: 'العمليات', description: 'General operations and logistics' },
]

const POSITIONS = [
  { title: 'Senior Developer', titleAr: 'مطور أول', deptIdx: 0, minSalary: 800, maxSalary: 1200 },
  { title: 'Tech Lead', titleAr: 'قائد تقني', deptIdx: 0, minSalary: 1000, maxSalary: 1500 },
  { title: 'Junior Developer', titleAr: 'مطور مبتدئ', deptIdx: 0, minSalary: 500, maxSalary: 800 },
  { title: 'HR Manager', titleAr: 'مدير الموارد البشرية', deptIdx: 1, minSalary: 900, maxSalary: 1300 },
  { title: 'HR Specialist', titleAr: 'أخصائي موارد بشرية', deptIdx: 1, minSalary: 600, maxSalary: 900 },
  { title: 'Finance Manager', titleAr: 'مدير المالية', deptIdx: 2, minSalary: 1000, maxSalary: 1400 },
  { title: 'Accountant', titleAr: 'محاسب', deptIdx: 2, minSalary: 700, maxSalary: 1000 },
  { title: 'Marketing Manager', titleAr: 'مدير التسويق', deptIdx: 3, minSalary: 800, maxSalary: 1200 },
  { title: 'Marketing Specialist', titleAr: 'أخصائي تسويق', deptIdx: 3, minSalary: 600, maxSalary: 900 },
  { title: 'Operations Manager', titleAr: 'مدير العمليات', deptIdx: 4, minSalary: 800, maxSalary: 1100 },
  { title: 'Operations Coordinator', titleAr: 'منسق عمليات', deptIdx: 4, minSalary: 550, maxSalary: 800 },
]

const EMPLOYEES = [
  { firstName: 'Ahmad', lastName: 'Al-Rashid', firstNameAr: 'أحمد', lastNameAr: 'الرشيد', gender: 'MALE', salary: 850, deptIdx: 0, posIdx: 0, email: 'ahmad@attindo.com', phone: '+962791001001' },
  { firstName: 'Fatima', lastName: 'Al-Hussein', firstNameAr: 'فاطمة', lastNameAr: 'الحسين', gender: 'FEMALE', salary: 920, deptIdx: 0, posIdx: 1, email: 'fatima@attindo.com', phone: '+962791002002' },
  { firstName: 'Omar', lastName: 'Al-Masri', firstNameAr: 'عمر', lastNameAr: 'المصري', gender: 'MALE', salary: 780, deptIdx: 0, posIdx: 2, email: 'omar@attindo.com', phone: '+962791003003' },
  { firstName: 'Layla', lastName: 'Al-Qassem', firstNameAr: 'ليلى', lastNameAr: 'القاسم', gender: 'FEMALE', salary: 950, deptIdx: 1, posIdx: 3, email: 'layla@attindo.com', phone: '+962791004004' },
  { firstName: 'Mohammed', lastName: 'Al-Tamimi', firstNameAr: 'محمد', lastNameAr: 'التميمي', gender: 'MALE', salary: 700, deptIdx: 1, posIdx: 4, email: 'mohammed@attindo.com', phone: '+962791005005' },
  { firstName: 'Sara', lastName: 'Al-Nouri', firstNameAr: 'سارة', lastNameAr: 'النوري', gender: 'FEMALE', salary: 1100, deptIdx: 2, posIdx: 5, email: 'sara@attindo.com', phone: '+962791006006' },
  { firstName: 'Khaled', lastName: 'Al-Zoubi', firstNameAr: 'خالد', lastNameAr: 'الزعبي', gender: 'MALE', salary: 1050, deptIdx: 2, posIdx: 6, email: 'khaled@attindo.com', phone: '+962791007007' },
  { firstName: 'Youssef', lastName: 'Al-Damour', firstNameAr: 'يوسف', lastNameAr: 'الدامور', gender: 'MALE', salary: 750, deptIdx: 3, posIdx: 7, email: 'youssef@attindo.com', phone: '+962791009009' },
  { firstName: 'Nour', lastName: 'Al-Salem', firstNameAr: 'نور', lastNameAr: 'السالم', gender: 'FEMALE', salary: 820, deptIdx: 3, posIdx: 8, email: 'nour@attindo.com', phone: '+962791010010' },
  { firstName: 'Hassan', lastName: 'Al-Fayez', firstNameAr: 'حسن', lastNameAr: 'الفايز', gender: 'MALE', salary: 680, deptIdx: 4, posIdx: 9, email: 'hassan@attindo.com', phone: '+962791011011' },
  { firstName: 'Aisha', lastName: 'Al-Bawaleez', firstNameAr: 'عائشة', lastNameAr: 'البواليز', gender: 'FEMALE', salary: 720, deptIdx: 4, posIdx: 10, email: 'aisha@attindo.com', phone: '+962791012012' },
  { firstName: 'Tariq', lastName: 'Al-Shammari', firstNameAr: 'طارق', lastNameAr: 'الشمري', gender: 'MALE', salary: 900, deptIdx: 0, posIdx: 0, email: 'tariq@attindo.com', phone: '+962791013013' },
  { firstName: 'Rania', lastName: 'Al-Khatib', firstNameAr: 'رانيا', lastNameAr: 'الخطيب', gender: 'FEMALE', salary: 880, deptIdx: 2, posIdx: 6, email: 'rania@attindo.com', phone: '+962791008008' },
  { firstName: 'Zaid', lastName: 'Al-Kilani', firstNameAr: 'زيد', lastNameAr: 'الكلاني', gender: 'MALE', salary: 970, deptIdx: 2, posIdx: 5, email: 'zaid@attindo.com', phone: '+962791017017' },
  { firstName: 'Huda', lastName: 'Al-Makhzoumi', firstNameAr: 'هدى', lastNameAr: 'المخزومي', gender: 'FEMALE', salary: 830, deptIdx: 3, posIdx: 8, email: 'huda@attindo.com', phone: '+962791016016' },
]

async function seed() {
  console.log('Seeding database...')

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
  await db.user.deleteMany()
  await db.company.deleteMany()
  console.log('Cleaned existing data')

  const company = await db.company.create({
    data: { name: 'Attindo Corp', nameAr: 'شركة أتيندو', address: 'Amman, Jordan', phone: '+96265100100', email: 'info@attindo.com', currency: 'JOD', currencySymbol: 'د.ا', taxRate: 5.0, workingHoursPerDay: 8.0, overtimeRate: 1.5 },
  })
  await db.user.create({ data: { username: 'admin', password: 'admin123', name: 'Administrator', email: 'admin@attindo.com', role: 'ADMIN', isActive: true } })

  const departments = []
  for (const d of DEPARTMENTS) { departments.push(await db.department.create({ data: d })) }

  const positions = []
  for (const p of POSITIONS) { positions.push(await db.position.create({ data: { title: p.title, titleAr: p.titleAr, departmentId: departments[p.deptIdx].id, minSalary: p.minSalary, maxSalary: p.maxSalary } })) }

  const employees = []
  for (let i = 0; i < EMPLOYEES.length; i++) {
    const e = EMPLOYEES[i]
    employees.push(await db.employee.create({
      data: {
        employeeId: `EMP-${String(i + 1).padStart(3, '0')}`, firstName: e.firstName, lastName: e.lastName, firstNameAr: e.firstNameAr, lastNameAr: e.lastNameAr,
        email: e.email, phone: e.phone, gender: e.gender, dateOfBirth: new Date(1985 + Math.floor(Math.random() * 15), Math.floor(Math.random() * 12), 1),
        nationality: 'Jordanian', address: 'Amman, Jordan', departmentId: departments[e.deptIdx].id, positionId: positions[e.posIdx].id,
        hireDate: new Date(2020 + Math.floor(Math.random() * 5), Math.floor(Math.random() * 12), 1 + Math.floor(Math.random() * 28)),
        salary: e.salary, status: 'ACTIVE', fingerprintEnrolled: i < 10, bankName: 'Arab Bank', bankAccount: `JO39ABNA${String(10000000 + i).padStart(8, '0')}`,
      },
    }))
  }
  console.log(`${employees.length} employees created`)

  const devices = []
  for (const dd of [
    { name: 'Main Entrance', ip: '192.168.1.100', location: 'Building A - Main', sn: 'ZK20250001' },
    { name: 'Floor 1', ip: '192.168.1.101', location: 'Building A - Floor 1', sn: 'ZK20250002' },
    { name: 'Floor 2', ip: '192.168.1.102', location: 'Building A - Floor 2', sn: 'ZK20250003' },
  ]) {
    devices.push(await db.fingerprintDevice.create({ data: { name: dd.name, ip: dd.ip, port: 4370, deviceType: 'ZK', status: 'ACTIVE', location: dd.location, lastSync: new Date(), sn: dd.sn, firmware: 'Ver 6.60' } }))
  }

  const today = new Date()
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const date = new Date(today); date.setDate(date.getDate() - dayOffset)
    if (date.getDay() === 5 || date.getDay() === 6) continue
    for (const emp of employees) {
      const rand = Math.random()
      let status = 'PRESENT', checkIn: Date | null = null, checkOut: Date | null = null, lateMin = 0, otHrs = 0
      if (rand < 0.75) {
        lateMin = Math.random() < 0.2 ? Math.floor(Math.random() * 30) : 0
        checkIn = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 8, lateMin)
        if (Math.random() < 0.3) otHrs = Math.round((0.5 + Math.random() * 2) * 10) / 10
        checkOut = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 17 + Math.floor(otHrs), 0)
      } else if (rand < 0.85) { status = 'LATE'; lateMin = 30 + Math.floor(Math.random() * 60); checkIn = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 9, Math.floor(Math.random() * 60)); checkOut = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 17, 0) }
      else if (rand < 0.92) { status = 'ABSENT' } else { status = 'LEAVE' }
      await db.attendance.create({ data: { employeeId: emp.id, date: new Date(date.getFullYear(), date.getMonth(), date.getDate()), checkIn, checkOut, status, overtimeHours: otHrs, lateMinutes: lateMin, deviceId: devices[Math.floor(Math.random() * devices.length)].id, fingerprintMatch: status !== 'ABSENT' && status !== 'LEAVE' } })
    }
  }
  console.log('Attendance records created')

  const leaveTypes = []
  for (const lt of [
    { name: 'Annual Leave', nameAr: 'إجازة سنوية', defaultDays: 14, isPaid: true, carryForward: true, maxCarryDays: 5 },
    { name: 'Sick Leave', nameAr: 'إجازة مرضية', defaultDays: 10, isPaid: true, carryForward: false, maxCarryDays: 0 },
    { name: 'Maternity Leave', nameAr: 'إجازة أمومة', defaultDays: 70, isPaid: true, carryForward: false, maxCarryDays: 0 },
    { name: 'Unpaid Leave', nameAr: 'إجازة بدون راتب', defaultDays: 30, isPaid: false, carryForward: false, maxCarryDays: 0 },
  ]) { leaveTypes.push(await db.leaveType.create({ data: lt })) }

  if (employees.length >= 3) {
    await db.leave.create({ data: { employeeId: employees[0].id, typeId: leaveTypes[0].id, startDate: new Date(today.getFullYear(), today.getMonth(), 10), endDate: new Date(today.getFullYear(), today.getMonth(), 12), days: 3, status: 'APPROVED', reason: 'Family vacation', approvedBy: 'Administrator' } })
    await db.leave.create({ data: { employeeId: employees[1].id, typeId: leaveTypes[1].id, startDate: new Date(today.getFullYear(), today.getMonth(), 15), endDate: new Date(today.getFullYear(), today.getMonth(), 16), days: 2, status: 'PENDING', reason: 'Medical appointment' } })
    await db.leave.create({ data: { employeeId: employees[2].id, typeId: leaveTypes[0].id, startDate: new Date(today.getFullYear(), today.getMonth(), 20), endDate: new Date(today.getFullYear(), today.getMonth(), 22), days: 3, status: 'PENDING', reason: 'Personal matters' } })
  }

  for (const sc of [
    { name: 'Housing Allowance', nameAr: 'بدل سكن', type: 'ALLOWANCE', percentage: 25, isFixed: false, isTaxable: false, isRecurring: true },
    { name: 'Transport Allowance', nameAr: 'بدل نقل', type: 'ALLOWANCE', amount: 50, isFixed: true, isTaxable: false, isRecurring: true },
    { name: 'Social Security', nameAr: 'الضمان الاجتماعي', type: 'DEDUCTION', percentage: 5, isFixed: false, isTaxable: false, isRecurring: true },
    { name: 'Tax', nameAr: 'ضريبة الدخل', type: 'DEDUCTION', percentage: 5, isFixed: false, isTaxable: true, isRecurring: true },
  ]) { await db.salaryComponent.create({ data: sc }) }

  const salaryComponents = await db.salaryComponent.findMany({ where: { isActive: true } })
  let totalGross = 0, totalDeductions = 0, totalNet = 0
  const items = []
  for (const emp of employees) {
    let empAllow = 0, empDeduct = 0
    const breakdown: { name: string; nameAr: string; type: string; amount: number }[] = []
    for (const comp of salaryComponents) {
      const amount = comp.isFixed ? comp.amount : Math.round(emp.salary * comp.percentage / 100 * 100) / 100
      if (comp.type === 'ALLOWANCE') { empAllow += amount; breakdown.push({ name: comp.name, nameAr: comp.nameAr, type: 'ALLOWANCE', amount }) }
      else { empDeduct += amount; breakdown.push({ name: comp.name, nameAr: comp.nameAr, type: 'DEDUCTION', amount }) }
    }
    const gross = emp.salary + empAllow
    const net = Math.round((gross - empDeduct) * 100) / 100
    totalGross += gross; totalDeductions += empDeduct; totalNet += net
    items.push({ employeeId: emp.id, basicSalary: emp.salary, totalAllowances: empAllow, totalDeductions: empDeduct, grossSalary: gross, taxAmount: Math.round(emp.salary * 0.05 * 100) / 100, netSalary: net, daysWorked: 22, overtimeHours: 0, overtimeAmount: 0, details: JSON.stringify(breakdown) })
  }
  const payroll = await db.payroll.create({ data: { month: today.getMonth() + 1, year: today.getFullYear(), status: 'DRAFT', totalGross: Math.round(totalGross * 100) / 100, totalDeductions: Math.round(totalDeductions * 100) / 100, totalNet: Math.round(totalNet * 100) / 100, notes: 'Auto-generated' } })
  for (const item of items) { await db.payrollItem.create({ data: { payrollId: payroll.id, ...item } }) }
  console.log('Payroll created')

  await db.license.create({ data: { key: 'FREE-FINGERPRINT-3', module: 'FINGERPRINT', maxDevices: 3, activatedDevices: 3, activatedAt: new Date(), isActive: true, companyName: company.name, contactEmail: company.email } })
  await db.license.create({ data: { key: 'ATT-HR-2025-PRO-001', module: 'HR', maxDevices: 1, activatedDevices: 0, expiresAt: new Date('2026-12-31'), isActive: false, companyName: '', contactEmail: '' } })
  await db.license.create({ data: { key: 'ATT-PAY-2025-PRO-001', module: 'PAYROLL', maxDevices: 1, activatedDevices: 0, expiresAt: new Date('2026-12-31'), isActive: false, companyName: '', contactEmail: '' } })
  await db.license.create({ data: { key: 'ATT-FP-2025-PRO-010', module: 'FINGERPRINT', maxDevices: 10, activatedDevices: 0, expiresAt: new Date('2026-12-31'), isActive: false, companyName: '', contactEmail: '' } })

  for (const h of [
    { name: "New Year's Day", nameAr: 'رأس السنة الميلادية', date: '2025-01-01', type: 'PUBLIC' },
    { name: 'Labor Day', nameAr: 'عيد العمال', date: '2025-05-01', type: 'PUBLIC' },
    { name: 'Independence Day', nameAr: 'عيد الاستقلال', date: '2025-05-25', type: 'PUBLIC' },
    { name: 'Eid Al-Fitr', nameAr: 'عيد الفطر', date: '2025-03-30', type: 'PUBLIC' },
    { name: 'Eid Al-Adha', nameAr: 'عيد الأضحى', date: '2025-06-06', type: 'PUBLIC' },
    { name: 'Christmas Day', nameAr: 'عيد الميلاد المجيد', date: '2025-12-25', type: 'PUBLIC' },
  ]) {
    const [y, m, d] = h.date.split('-').map(Number)
    await db.holiday.create({ data: { name: h.name, nameAr: h.nameAr, date: new Date(y, m - 1, d), type: h.type, recurring: true } })
  }

  for (const s of [
    { key: 'working_days', value: 'SUNDAY,MONDAY,TUESDAY,WEDNESDAY,THURSDAY', category: 'attendance' },
    { key: 'work_start_time', value: '08:00', category: 'attendance' },
    { key: 'work_end_time', value: '17:00', category: 'attendance' },
    { key: 'grace_period_minutes', value: '15', category: 'attendance' },
    { key: 'currency', value: 'JOD', category: 'general' },
    { key: 'date_format', value: 'YYYY-MM-DD', category: 'general' },
    { key: 'language', value: 'en', category: 'general' },
    { key: 'tax_enabled', value: 'true', category: 'payroll' },
    { key: 'social_security_enabled', value: 'true', category: 'payroll' },
    { key: 'social_security_rate', value: '5', category: 'payroll' },
    { key: 'tax_rate', value: '5', category: 'payroll' },
    { key: 'auto_attendance_sync', value: 'true', category: 'fingerprint' },
    { key: 'sync_interval_minutes', value: '30', category: 'fingerprint' },
  ]) { await db.settings.create({ data: s }) }

  console.log('Database seeded successfully!')
  console.log('Login: admin / admin123')
}

seed().then(() => process.exit(0)).catch(e => { console.error('Seed error:', e); process.exit(1) })
