import { db } from '../src/lib/db';

async function seed() {
  console.log('🌱 Seeding database...');

  // Create Company
  const company = await db.company.create({
    data: {
      name: 'شركة النجاح للأعمال',
      nameEn: 'Al-Najah Business Corp',
      address: 'عمان، الأردن',
      phone: '+962 6 555 0000',
      email: 'info@alnajah.com',
      currency: 'JOD',
    },
  });

  // Create Work Schedules
  const standardSchedule = await db.workSchedule.create({
    data: {
      name: 'دوام عادي',
      sunday: true, monday: true, tuesday: true, wednesday: true, thursday: true,
      friday: false, saturday: false,
      startTime: '08:00', endTime: '17:00',
      breakStart: '12:00', breakEnd: '13:00',
    },
  });

  const fridaySchedule = await db.workSchedule.create({
    data: {
      name: 'دوام إداري',
      sunday: true, monday: true, tuesday: true, wednesday: true, thursday: true,
      friday: true, saturday: false,
      startTime: '09:00', endTime: '16:00',
      breakStart: '12:00', breakEnd: '12:30',
    },
  });

  // Create Departments
  const deptIT = await db.department.create({ data: { name: 'تقنية المعلومات', nameEn: 'IT Department' } });
  const deptHR = await db.department.create({ data: { name: 'الموارد البشرية', nameEn: 'HR Department' } });
  const deptFinance = await db.department.create({ data: { name: 'المالية والمحاسبة', nameEn: 'Finance & Accounting' } });
  const deptSales = await db.department.create({ data: { name: 'المبيعات والتسويق', nameEn: 'Sales & Marketing' } });
  const deptOps = await db.department.create({ data: { name: 'العمليات', nameEn: 'Operations' } });

  // Create Positions
  const positions = await Promise.all([
    db.position.create({ data: { title: 'مدير تقنية المعلومات', titleEn: 'IT Manager', departmentId: deptIT.id, minSalary: 1500, maxSalary: 2500 } }),
    db.position.create({ data: { title: 'مطور برمجيات', titleEn: 'Software Developer', departmentId: deptIT.id, minSalary: 800, maxSalary: 1800 } }),
    db.position.create({ data: { title: 'مدير الموارد البشرية', titleEn: 'HR Manager', departmentId: deptHR.id, minSalary: 1200, maxSalary: 2000 } }),
    db.position.create({ data: { title: 'موظف موارد بشرية', titleEn: 'HR Specialist', departmentId: deptHR.id, minSalary: 600, maxSalary: 1000 } }),
    db.position.create({ data: { title: 'المدير المالي', titleEn: 'CFO', departmentId: deptFinance.id, minSalary: 2000, maxSalary: 3500 } }),
    db.position.create({ data: { title: 'محاسب', titleEn: 'Accountant', departmentId: deptFinance.id, minSalary: 700, maxSalary: 1200 } }),
    db.position.create({ data: { title: 'مدير مبيعات', titleEn: 'Sales Manager', departmentId: deptSales.id, minSalary: 1000, maxSalary: 2000 } }),
    db.position.create({ data: { title: 'مندوب مبيعات', titleEn: 'Sales Representative', departmentId: deptSales.id, minSalary: 500, maxSalary: 900 } }),
    db.position.create({ data: { title: 'مدير عمليات', titleEn: 'Operations Manager', departmentId: deptOps.id, minSalary: 1200, maxSalary: 2200 } }),
    db.position.create({ data: { title: 'موظف عمليات', titleEn: 'Operations Staff', departmentId: deptOps.id, minSalary: 500, maxSalary: 800 } }),
  ]);

  // Create Employees
  const employees = await Promise.all([
    db.employee.create({ data: { employeeId: 'EMP001', firstName: 'أحمد', lastName: 'الخالدي', firstNameEn: 'Ahmad', lastNameEn: 'Al-Khalidi', email: 'ahmad@alnajah.com', phone: '+962799000001', departmentId: deptIT.id, positionId: positions[0].id, workScheduleId: standardSchedule.id, fingerprintId: '1', status: 'active', hireDate: new Date('2020-01-15'), gender: 'male', bankName: 'الأردن', bankAccount: 'JO1234567890' } }),
    db.employee.create({ data: { employeeId: 'EMP002', firstName: 'سارة', lastName: 'العمري', firstNameEn: 'Sara', lastNameEn: 'Al-Omari', email: 'sara@alnajah.com', phone: '+962799000002', departmentId: deptIT.id, positionId: positions[1].id, workScheduleId: standardSchedule.id, fingerprintId: '2', status: 'active', hireDate: new Date('2021-03-01'), gender: 'female', bankName: 'الاهلي', bankAccount: 'JO2345678901' } }),
    db.employee.create({ data: { employeeId: 'EMP003', firstName: 'محمد', lastName: 'الحسن', firstNameEn: 'Mohammad', lastNameEn: 'Al-Hassan', email: 'mohammad@alnajah.com', phone: '+962799000003', departmentId: deptHR.id, positionId: positions[2].id, workScheduleId: standardSchedule.id, fingerprintId: '3', status: 'active', hireDate: new Date('2019-06-15'), gender: 'male', bankName: 'الإسلامي', bankAccount: 'JO3456789012' } }),
    db.employee.create({ data: { employeeId: 'EMP004', firstName: 'نور', lastName: 'القاسم', firstNameEn: 'Nour', lastNameEn: 'Al-Qasem', email: 'nour@alnajah.com', phone: '+962799000004', departmentId: deptHR.id, positionId: positions[3].id, workScheduleId: standardSchedule.id, fingerprintId: '4', status: 'active', hireDate: new Date('2022-09-01'), gender: 'female', bankName: 'الأردن', bankAccount: 'JO4567890123' } }),
    db.employee.create({ data: { employeeId: 'EMP005', firstName: 'خالد', lastName: 'الراشد', firstNameEn: 'Khaled', lastNameEn: 'Al-Rashed', email: 'khaled@alnajah.com', phone: '+962799000005', departmentId: deptFinance.id, positionId: positions[4].id, workScheduleId: standardSchedule.id, fingerprintId: '5', status: 'active', hireDate: new Date('2018-01-01'), gender: 'male', bankName: 'الاهلي', bankAccount: 'JO5678901234' } }),
    db.employee.create({ data: { employeeId: 'EMP006', firstName: 'ليلى', lastName: 'المصري', firstNameEn: 'Layla', lastNameEn: 'Al-Masri', email: 'layla@alnajah.com', phone: '+962799000006', departmentId: deptFinance.id, positionId: positions[5].id, workScheduleId: standardSchedule.id, fingerprintId: '6', status: 'active', hireDate: new Date('2021-07-01'), gender: 'female', bankName: 'الإسلامي', bankAccount: 'JO6789012345' } }),
    db.employee.create({ data: { employeeId: 'EMP007', firstName: 'عمر', lastName: 'الزعبي', firstNameEn: 'Omar', lastNameEn: 'Al-Zoubi', email: 'omar@alnajah.com', phone: '+962799000007', departmentId: deptSales.id, positionId: positions[6].id, workScheduleId: standardSchedule.id, fingerprintId: '7', status: 'active', hireDate: new Date('2020-05-01'), gender: 'male', bankName: 'الأردن', bankAccount: 'JO7890123456' } }),
    db.employee.create({ data: { employeeId: 'EMP008', firstName: 'هند', lastName: 'الطاهر', firstNameEn: 'Hind', lastNameEn: 'Al-Taher', email: 'hind@alnajah.com', phone: '+962799000008', departmentId: deptSales.id, positionId: positions[7].id, workScheduleId: standardSchedule.id, fingerprintId: '8', status: 'active', hireDate: new Date('2023-01-15'), gender: 'female', bankName: 'الاهلي', bankAccount: 'JO8901234567' } }),
    db.employee.create({ data: { employeeId: 'EMP009', firstName: 'يوسف', lastName: 'الناصر', firstNameEn: 'Yousef', lastNameEn: 'Al-Nasser', email: 'yousef@alnajah.com', phone: '+962799000009', departmentId: deptOps.id, positionId: positions[8].id, workScheduleId: standardSchedule.id, fingerprintId: '9', status: 'active', hireDate: new Date('2019-11-01'), gender: 'male', bankName: 'الإسلامي', bankAccount: 'JO9012345678' } }),
    db.employee.create({ data: { employeeId: 'EMP010', firstName: 'رنا', lastName: 'العلي', firstNameEn: 'Rana', lastNameEn: 'Al-Ali', email: 'rana@alnajah.com', phone: '+962799000010', departmentId: deptOps.id, positionId: positions[9].id, workScheduleId: fridaySchedule.id, fingerprintId: '10', status: 'active', hireDate: new Date('2022-04-01'), gender: 'female', bankName: 'الأردن', bankAccount: 'JO0123456789' } }),
    db.employee.create({ data: { employeeId: 'EMP011', firstName: 'طارق', lastName: 'الشريف', firstNameEn: 'Tariq', lastNameEn: 'Al-Sharif', email: 'tariq@alnajah.com', phone: '+962799000011', departmentId: deptIT.id, positionId: positions[1].id, workScheduleId: standardSchedule.id, fingerprintId: '11', status: 'active', hireDate: new Date('2023-06-01'), gender: 'male' } }),
    db.employee.create({ data: { employeeId: 'EMP012', firstName: 'ديما', lastName: 'الفارس', firstNameEn: 'Dima', lastNameEn: 'Al-Fares', email: 'dima@alnajah.com', phone: '+962799000012', departmentId: deptFinance.id, positionId: positions[5].id, workScheduleId: standardSchedule.id, fingerprintId: '12', status: 'on_leave', hireDate: new Date('2021-02-01'), gender: 'female' } }),
  ]);

  // Create Fingerprint Devices
  await Promise.all([
    db.fingerprintDevice.create({
      data: { name: 'جهاز البصمة الرئيسي', deviceType: 'zk', model: 'ZK-TF1700', ipAddress: '192.168.1.100', port: 4370, location: 'المدخل الرئيسي', status: 'online', isDefault: true, lastSync: new Date() }
    }),
    db.fingerprintDevice.create({
      data: { name: 'جهاز بصمة المبنى B', deviceType: 'zk', model: 'ZK-F22', ipAddress: '192.168.1.101', port: 4370, location: 'مبنى B - الطابق الأرضي', status: 'online', lastSync: new Date() }
    }),
    db.fingerprintDevice.create({
      data: { name: 'جهاز هيكفيجن المدخل', deviceType: 'hikvision', model: 'DS-K1T671M', ipAddress: '192.168.1.200', port: 80, location: 'المدخل الخلفي', status: 'offline', apiKey: 'hk-api-key-001' }
    }),
  ]);

  // Create Salary Components
  const basicComp = await db.salaryComponent.create({ data: { name: 'الراتب الأساسي', nameEn: 'Basic Salary', type: 'earning', category: 'basic', isFixed: true, isTaxable: true } });
  const housingComp = await db.salaryComponent.create({ data: { name: 'بدل سكن', nameEn: 'Housing Allowance', type: 'earning', category: 'allowance', isFixed: true, isTaxable: false } });
  const transportComp = await db.salaryComponent.create({ data: { name: 'بدل مواصلات', nameEn: 'Transport Allowance', type: 'earning', category: 'allowance', isFixed: true, isTaxable: false } });
  const foodComp = await db.salaryComponent.create({ data: { name: 'بدل طعام', nameEn: 'Food Allowance', type: 'earning', category: 'allowance', isFixed: true, isTaxable: false } });
  const overtimeComp = await db.salaryComponent.create({ data: { name: 'بدل إضافي', nameEn: 'Overtime', type: 'earning', category: 'overtime', isFixed: false, isTaxable: true } });
  await db.salaryComponent.create({ data: { name: 'خصم تأخير', nameEn: 'Late Deduction', type: 'deduction', category: 'attendance', isFixed: false, isTaxable: false } });
  await db.salaryComponent.create({ data: { name: 'خصم غياب', nameEn: 'Absence Deduction', type: 'deduction', category: 'attendance', isFixed: false, isTaxable: false } });
  await db.salaryComponent.create({ data: { name: 'ضريبة الدخل', nameEn: 'Income Tax', type: 'deduction', category: 'tax', isFixed: false, isTaxable: false } });
  await db.salaryComponent.create({ data: { name: 'الضمان الاجتماعي', nameEn: 'Social Security', type: 'deduction', category: 'insurance', isFixed: false, isTaxable: false, defaultValue: 0.07 } });
  await db.salaryComponent.create({ data: { name: 'سلفة', nameEn: 'Loan', type: 'deduction', category: 'loan', isFixed: false, isTaxable: false } });

  // Assign salary components to employees
  const salaryData = [
    { empIdx: 0, basic: 2000, housing: 400, transport: 150, food: 100 },
    { empIdx: 1, basic: 1200, housing: 300, transport: 100, food: 100 },
    { empIdx: 2, basic: 1800, housing: 400, transport: 150, food: 100 },
    { empIdx: 3, basic: 800, housing: 200, transport: 80, food: 80 },
    { empIdx: 4, basic: 2500, housing: 500, transport: 200, food: 120 },
    { empIdx: 5, basic: 900, housing: 250, transport: 80, food: 80 },
    { empIdx: 6, basic: 1500, housing: 350, transport: 120, food: 100 },
    { empIdx: 7, basic: 650, housing: 150, transport: 60, food: 70 },
    { empIdx: 8, basic: 1600, housing: 350, transport: 120, food: 100 },
    { empIdx: 9, basic: 600, housing: 150, transport: 60, food: 70 },
    { empIdx: 10, basic: 1100, housing: 250, transport: 80, food: 80 },
    { empIdx: 11, basic: 850, housing: 200, transport: 80, food: 80 },
  ];

  for (const s of salaryData) {
    const emp = employees[s.empIdx];
    await db.employeeSalaryComponent.createMany({
      data: [
        { employeeId: emp.id, componentId: basicComp.id, amount: s.basic },
        { employeeId: emp.id, componentId: housingComp.id, amount: s.housing },
        { employeeId: emp.id, componentId: transportComp.id, amount: s.transport },
        { employeeId: emp.id, componentId: foodComp.id, amount: s.food },
      ],
    });
  }

  // Create Leave Types
  await Promise.all([
    db.leaveType.create({ data: { name: 'إجازة سنوية', nameEn: 'Annual Leave', defaultDays: 14, isPaid: true, carryForward: true } }),
    db.leaveType.create({ data: { name: 'إجازة مرضية', nameEn: 'Sick Leave', defaultDays: 10, isPaid: true } }),
    db.leaveType.create({ data: { name: 'إجازة بدون راتب', nameEn: 'Unpaid Leave', defaultDays: 30, isPaid: false } }),
    db.leaveType.create({ data: { name: 'إجازة أمومة', nameEn: 'Maternity Leave', defaultDays: 70, isPaid: true } }),
    db.leaveType.create({ data: { name: 'إجازة حج', nameEn: 'Hajj Leave', defaultDays: 14, isPaid: true } }),
  ]);

  // Create Chart of Accounts
  const accounts = await Promise.all([
    db.account.create({ data: { code: '1000', name: 'الأصول', nameEn: 'Assets', type: 'asset' } }),
    db.account.create({ data: { code: '1100', name: 'الأصول المتداولة', nameEn: 'Current Assets', type: 'asset', parentId: undefined } }),
    db.account.create({ data: { code: '1110', name: 'البنك', nameEn: 'Bank', type: 'asset' } }),
    db.account.create({ data: { code: '1120', name: 'الصندوق', nameEn: 'Cash', type: 'asset' } }),
    db.account.create({ data: { code: '1130', name: 'المدينون', nameEn: 'Accounts Receivable', type: 'asset' } }),
    db.account.create({ data: { code: '2000', name: 'الالتزامات', nameEn: 'Liabilities', type: 'liability' } }),
    db.account.create({ data: { code: '2100', name: 'الدائنون', nameEn: 'Accounts Payable', type: 'liability' } }),
    db.account.create({ data: { code: '2110', name: 'الضمان الاجتماعي المستحق', nameEn: 'Social Security Payable', type: 'liability' } }),
    db.account.create({ data: { code: '2120', name: 'الضرائب المستحقة', nameEn: 'Tax Payable', type: 'liability' } }),
    db.account.create({ data: { code: '3000', name: 'حقوق الملكية', nameEn: 'Equity', type: 'equity' } }),
    db.account.create({ data: { code: '4000', name: 'الإيرادات', nameEn: 'Revenue', type: 'revenue' } }),
    db.account.create({ data: { code: '4100', name: 'إيرادات المبيعات', nameEn: 'Sales Revenue', type: 'revenue' } }),
    db.account.create({ data: { code: '5000', name: 'المصروفات', nameEn: 'Expenses', type: 'expense' } }),
    db.account.create({ data: { code: '5100', name: 'رواتب الموظفين', nameEn: 'Salaries Expense', type: 'expense' } }),
    db.account.create({ data: { code: '5110', name: 'بدلات الموظفين', nameEn: 'Allowances Expense', type: 'expense' } }),
    db.account.create({ data: { code: '5200', name: 'مصاريف إدارية', nameEn: 'Administrative Expenses', type: 'expense' } }),
    db.account.create({ data: { code: '5300', name: 'مصاريف تشغيلية', nameEn: 'Operating Expenses', type: 'expense' } }),
  ]);

  // Create sample attendance records for current month
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  for (const emp of employees.slice(0, 10)) {
    for (let d = 1; d <= Math.min(now.getDate(), 28); d++) {
      const date = new Date(currentYear, currentMonth, d);
      const dayOfWeek = date.getDay();
      // Skip Friday (5) and Saturday (6)
      if (dayOfWeek === 5 || dayOfWeek === 6) continue;

      const isLate = Math.random() < 0.15;
      const isAbsent = Math.random() < 0.05;
      const isEarlyLeave = Math.random() < 0.1;

      if (isAbsent) {
        await db.attendanceRecord.create({
          data: {
            employeeId: emp.id,
            date,
            status: 'absent',
            workHours: 0,
          }
        });
      } else {
        const checkInHour = 8 + (isLate ? Math.floor(Math.random() * 2) + 1 : 0);
        const checkInMin = isLate ? Math.floor(Math.random() * 30) : Math.floor(Math.random() * 10);
        const checkOutHour = isEarlyLeave ? 15 + Math.floor(Math.random() * 2) : 17;
        const checkOutMin = isEarlyLeave ? Math.floor(Math.random() * 30) : Math.floor(Math.random() * 10);

        const checkIn = new Date(currentYear, currentMonth, d, checkInHour, checkInMin);
        const checkOut = new Date(currentYear, currentMonth, d, checkOutHour, checkOutMin);
        const workMs = checkOut.getTime() - checkIn.getTime();
        const workHours = Math.round((workMs / (1000 * 60 * 60)) * 100) / 100;

        await db.attendanceRecord.create({
          data: {
            employeeId: emp.id,
            date,
            checkIn,
            checkOut,
            workHours: workHours > 0 ? workHours : 8,
            lateMinutes: isLate ? (checkInHour - 8) * 60 + checkInMin - 15 : 0,
            earlyLeaveMinutes: isEarlyLeave ? (17 - checkOutHour) * 60 + (0 - checkOutMin) : 0,
            status: isLate ? 'late' : 'present',
          }
        });
      }
    }
  }

  // Create sample notifications
  await Promise.all([
    db.notification.create({ data: { title: 'مرحباً بك', message: 'تم تفعيل نظام إدارة الموارد البشرية والمحاسبة بنجاح', type: 'success', category: 'system' } }),
    db.notification.create({ data: { title: 'تنبيه رواتب', message: 'لم يتم معالجة رواتب الشهر الحالي بعد', type: 'warning', category: 'payroll' } }),
    db.notification.create({ data: { title: 'جهاز بصمة غير متصل', message: 'جهاز هيكفيجن في المدخل الخلفي غير متصل بالشبكة', type: 'error', category: 'attendance' } }),
    db.notification.create({ data: { title: 'طلب إجازة جديد', message: 'يوجد طلب إجازة جديد بانتظار الموافقة', type: 'info', category: 'leave' } }),
  ]);

  // Create sample leave requests
  await db.leaveRequest.create({ data: { employeeId: employees[3].id, leaveTypeId: (await db.leaveType.findFirst({ where: { nameEn: 'Annual Leave' } }))!.id, startDate: new Date(currentYear, currentMonth, 20), endDate: new Date(currentYear, currentMonth, 22), totalDays: 3, reason: 'إجازة عائلية', status: 'pending' } });
  await db.leaveRequest.create({ data: { employeeId: employees[7].id, leaveTypeId: (await db.leaveType.findFirst({ where: { nameEn: 'Sick Leave' } }))!.id, startDate: new Date(currentYear, currentMonth, 15), endDate: new Date(currentYear, currentMonth, 16), totalDays: 2, reason: 'مراجعة طبية', status: 'approved', approvedAt: new Date() } });

  console.log('✅ Database seeded successfully!');
  console.log(`- Company: ${company.name}`);
  console.log(`- Employees: ${employees.length}`);
  console.log(`- Departments: 5`);
  console.log(`- Positions: ${positions.length}`);
  console.log(`- Fingerprint Devices: 3`);
}

seed().catch((e) => {
  console.error('Seed error:', e);
  process.exit(1);
});
