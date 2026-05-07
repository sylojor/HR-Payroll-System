/**
 * ZK Fingerprint Device Integration Service
 * Supports ZK-Teco devices via TCP/UDP protocol on port 4370
 * Also supports Hikvision devices via ISAPI HTTP
 * 
 * IMPORTANT: ZKLib uses raw TCP/UDP sockets which can hang when 
 * the device is unreachable. We use aggressive timeouts and 
 * child process isolation to prevent Next.js crashes.
 */

import { db } from '@/lib/db';
import { exec } from 'child_process';
import { writeFileSync, unlinkSync, mkdtempSync, rmdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

interface ZKDeviceConfig {
  id: string;
  ipAddress: string;
  port: number;
  deviceType: string;
  username?: string;
  password?: string;
  apiKey?: string;
  model?: string;
}

/**
 * Run ZK operations in an isolated child process to prevent Next.js crashes
 * Uses temp file approach to avoid Turbopack module resolution issues
 */
function runZKScript(script: string, timeout: number = 15000): Promise<string> {
  return new Promise((resolve, reject) => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'zk-'));
    const tmpFile = join(tmpDir, 'zk-script.js');
    writeFileSync(tmpFile, script);

    const child = exec(
      `node "${tmpFile}"`,
      { 
        timeout,
        maxBuffer: 1024 * 1024,
      },
      (error, stdout, stderr) => {
        // Clean up temp file
        try { unlinkSync(tmpFile); } catch {}
        try { rmdirSync(tmpDir); } catch {}
        
        if (error) {
          try { child.kill(); } catch {}
          reject(new Error(stderr || error.message || 'فشل الاتصال بجهاز البصمة'));
        } else {
          resolve(stdout.trim());
        }
      }
    );
  });
}

/**
 * Test connection to a ZK device
 * Runs in a child process to prevent hangs
 */
export async function testZKConnection(config: ZKDeviceConfig): Promise<{
  success: boolean;
  info?: any;
  error?: string;
}> {
  const script = `
const ZKLib = require('node-zklib');
const zk = new ZKLib('${config.ipAddress}', ${config.port}, 5000, 5000);

const timeout = setTimeout(() => {
  console.log(JSON.stringify({success: false, error: 'انتهت مهلة الاتصال'}));
  try { zk.disconnect(); } catch {}
  process.exit(0);
}, 12000);

zk.createSocket().then(() => {
  return zk.getInfo();
}).then((info) => {
  clearTimeout(timeout);
  const result = {
    success: true,
    info: {
      firmwareVersion: info.fwVersion || info.firmwareVersion || '',
      serialNumber: info.serialNumber || '',
      model: info.model || '${config.model || 'ZK-Teco'}',
      userCount: info.userCounts || 0,
      fpCount: info.fpCount || 0,
      logCount: info.logCount || 0,
      ipAddress: '${config.ipAddress}',
    }
  };
  console.log(JSON.stringify(result));
  return zk.disconnect();
}).then(() => process.exit(0)).catch((err) => {
  clearTimeout(timeout);
  console.log(JSON.stringify({success: false, error: err.message || 'فشل الاتصال'}));
  try { zk.disconnect(); } catch {}
  process.exit(0);
});
`;

  try {
    const output = await runZKScript(script, 15000);
    const result = JSON.parse(output);
    return result;
  } catch (error: any) {
    return {
      success: false,
      error: 'فشل الاتصال بالجهاز - تأكد من أن الجهاز متصل بالشبكة وأن IP والمنفذ صحيحان'
    };
  }
}

/**
 * Get users from ZK device
 */
export async function getZKUsers(config: ZKDeviceConfig): Promise<any[]> {
  const script = `
const ZKLib = require('node-zklib');
const zk = new ZKLib('${config.ipAddress}', ${config.port}, 5000, 5000);

const timeout = setTimeout(() => {
  console.log(JSON.stringify({error: 'انتهت مهلة الاتصال'}));
  try { zk.disconnect(); } catch {}
  process.exit(1);
}, 15000);

zk.createSocket().then(() => {
  return zk.getUsers();
}).then((result) => {
  clearTimeout(timeout);
  console.log(JSON.stringify(result.data || []));
  return zk.disconnect();
}).then(() => process.exit(0)).catch((err) => {
  clearTimeout(timeout);
  console.log(JSON.stringify({error: err.message}));
  try { zk.disconnect(); } catch {}
  process.exit(1);
});
`;

  try {
    const output = await runZKScript(script, 20000);
    return JSON.parse(output);
  } catch (error: any) {
    throw new Error(`فشل جلب المستخدمين: ${error.message}`);
  }
}

/**
 * Sync attendance records from ZK device
 * Fetches data from device and processes it in the main process
 */
export async function syncZKAttendance(config: ZKDeviceConfig): Promise<{
  success: boolean;
  synced: number;
  skipped: number;
  errors: string[];
  totalLogs?: number;
}> {
  const errors: string[] = [];
  let synced = 0;
  let skipped = 0;

  // Step 1: Fetch attendance logs from device (in child process)
  const script = `
const ZKLib = require('node-zklib');
const zk = new ZKLib('${config.ipAddress}', ${config.port}, 5000, 5000);

const timeout = setTimeout(() => {
  console.log(JSON.stringify({error: 'انتهت مهلة الاتصال'}));
  try { zk.disconnect(); } catch {}
  process.exit(1);
}, 20000);

zk.createSocket().then(() => {
  return zk.getAttendances();
}).then((attendanceLogs) => {
  // Also get device info
  return zk.getInfo().then((info) => {
    clearTimeout(timeout);
    const result = {
      logs: (attendanceLogs.data || []).map(log => ({
        deviceUserId: log.deviceUserId,
        recordTime: log.recordTime,
        ip: log.ip
      })),
      info: {
        serialNumber: info.serialNumber || '',
        userCounts: info.userCounts || 0,
        logCount: info.logCount || 0,
      }
    };
    console.log(JSON.stringify(result));
    return zk.disconnect();
  });
}).then(() => process.exit(0)).catch((err) => {
  clearTimeout(timeout);
  console.log(JSON.stringify({error: err.message || 'فشل الاتصال'}));
  try { zk.disconnect(); } catch {}
  process.exit(1);
});
`;

  try {
    const output = await runZKScript(script, 25000);
    const data = JSON.parse(output);
    
    if (data.error) {
      throw new Error(data.error);
    }

    const logs = data.logs || [];
    const deviceInfo = data.info || {};

    // Step 2: Process logs in main process (database operations)
    const employees = await db.employee.findMany({
      select: { id: true, fingerprintId: true, firstName: true, lastName: true }
    });
    
    const employeeMap = new Map<string, typeof employees[0]>();
    for (const emp of employees) {
      if (emp.fingerprintId) {
        employeeMap.set(emp.fingerprintId, emp);
      }
    }

    for (const log of logs) {
      try {
        const deviceUserId = String(log.deviceUserId);
        const employee = employeeMap.get(deviceUserId);
        
        if (!employee) {
          skipped++;
          continue;
        }

        const logTime = new Date(log.recordTime);
        const logDate = new Date(logTime.getFullYear(), logTime.getMonth(), logTime.getDate());
        
        const existingRecord = await db.attendanceRecord.findUnique({
          where: {
            employeeId_date: {
              employeeId: employee.id,
              date: logDate
            }
          }
        });

        if (!existingRecord) {
          await db.attendanceRecord.create({
            data: {
              employeeId: employee.id,
              deviceId: config.id,
              date: logDate,
              checkIn: logTime,
              status: 'present',
              isManual: false,
            }
          });
          synced++;
        } else if (!existingRecord.checkOut) {
          const checkInTime = existingRecord.checkIn ? new Date(existingRecord.checkIn) : null;
          let workHours: number | null = existingRecord.workHours;
          
          if (checkInTime) {
            workHours = (logTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
          }

          const checkInHour = checkInTime ? checkInTime.getHours() + checkInTime.getMinutes() / 60 : 8;
          const checkOutHour = logTime.getHours() + logTime.getMinutes() / 60;
          
          const lateMinutes = checkInHour > 8.25 ? Math.round((checkInHour - 8) * 60) : existingRecord.lateMinutes;
          const earlyLeaveMinutes = checkOutHour < 16.75 ? Math.round((17 - checkOutHour) * 60) : existingRecord.earlyLeaveMinutes;

          let status = existingRecord.status;
          if (lateMinutes > 0) status = 'late';

          await db.attendanceRecord.update({
            where: { id: existingRecord.id },
            data: {
              checkOut: logTime,
              workHours: workHours ? Math.round(workHours * 100) / 100 : null,
              lateMinutes,
              earlyLeaveMinutes,
              status,
              deviceId: config.id,
            }
          });
          synced++;
        } else {
          skipped++;
        }
      } catch (err: any) {
        errors.push(`سجل ${log.deviceUserId}: ${err.message}`);
      }
    }

    // Update device status
    await db.fingerprintDevice.update({
      where: { id: config.id },
      data: {
        status: 'online',
        lastSync: new Date(),
        serialNumber: deviceInfo.serialNumber || undefined,
      }
    });

    return { success: true, synced, skipped, errors, totalLogs: logs.length };

  } catch (error: any) {
    await db.fingerprintDevice.update({
      where: { id: config.id },
      data: { status: 'offline' }
    }).catch(() => {});

    return {
      success: false,
      synced,
      skipped,
      errors: [error.message || 'فشل المزامنة مع جهاز البصمة']
    };
  }
}

/**
 * Test Hikvision connection via ISAPI
 */
export async function testHikvisionConnection(config: ZKDeviceConfig): Promise<{
  success: boolean;
  info?: any;
  error?: string;
}> {
  try {
    const baseUrl = `http://${config.ipAddress}:${config.port}`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    
    if (config.username && config.password) {
      headers['Authorization'] = 'Basic ' + Buffer.from(`${config.username}:${config.password}`).toString('base64');
    }
    if (config.apiKey) headers['X-API-Key'] = config.apiKey;

    const res = await fetch(`${baseUrl}/ISAPI/System/deviceInfo`, {
      headers,
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return { success: false, error: `HTTP ${res.status}` };
    }

    const text = await res.text();
    const nameMatch = text.match(/<deviceName>([^<]+)<\/deviceName>/);
    const modelMatch = text.match(/<model>([^<]+)<\/model>/);
    const serialMatch = text.match(/<serialNumber>([^<]+)<\/serialNumber>/);
    const fwMatch = text.match(/<firmwareVersion>([^<]+)<\/firmwareVersion>/);

    return {
      success: true,
      info: {
        deviceName: nameMatch?.[1] || 'Unknown',
        model: modelMatch?.[1] || config.model || 'Unknown',
        serialNumber: serialMatch?.[1],
        firmwareVersion: fwMatch?.[1],
        ipAddress: config.ipAddress,
      }
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'فشل الاتصال' };
  }
}

/**
 * Sync attendance from Hikvision device via ISAPI
 */
export async function syncHikvisionAttendance(config: ZKDeviceConfig): Promise<{
  success: boolean;
  synced: number;
  skipped: number;
  errors: string[];
  totalLogs?: number;
}> {
  const errors: string[] = [];
  let synced = 0;
  let skipped = 0;

  try {
    const baseUrl = `http://${config.ipAddress}:${config.port}`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    
    if (config.username && config.password) {
      headers['Authorization'] = 'Basic ' + Buffer.from(`${config.username}:${config.password}`).toString('base64');
    }
    if (config.apiKey) headers['X-API-Key'] = config.apiKey;

    const deviceRes = await fetch(`${baseUrl}/ISAPI/System/deviceInfo`, {
      headers,
      signal: AbortSignal.timeout(10000),
    });

    if (!deviceRes.ok) {
      throw new Error(`فشل الاتصال - HTTP ${deviceRes.status}`);
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    const attendRes = await fetch(
      `${baseUrl}/ISAPI/AccessControl/AttendanceRecordSearch?format=json`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          AttendanceRecordSearchCondition: {
            searchResultPosition: 0,
            maxResults: 1000,
            EmployeeNoList: [],
            timePeriod: {
              startTime: startDate.toISOString(),
              endTime: endDate.toISOString(),
            }
          }
        }),
        signal: AbortSignal.timeout(30000),
      }
    );

    if (!attendRes.ok) {
      throw new Error(`فشل جلب السجلات - HTTP ${attendRes.status}`);
    }

    const attendData = await attendRes.json();
    const records = attendData?.AttendanceRecordList || [];

    const employees = await db.employee.findMany({
      select: { id: true, fingerprintId: true, firstName: true, lastName: true }
    });
    
    const employeeMap = new Map<string, typeof employees[0]>();
    for (const emp of employees) {
      if (emp.fingerprintId) {
        employeeMap.set(emp.fingerprintId, emp);
      }
    }

    for (const record of records) {
      try {
        const employeeNo = String(record.employeeNo);
        const employee = employeeMap.get(employeeNo);
        
        if (!employee) {
          skipped++;
          continue;
        }

        const logTime = new Date(record.time);
        const logDate = new Date(logTime.getFullYear(), logTime.getMonth(), logTime.getDate());

        const existingRecord = await db.attendanceRecord.findUnique({
          where: { employeeId_date: { employeeId: employee.id, date: logDate } }
        });

        if (!existingRecord) {
          await db.attendanceRecord.create({
            data: {
              employeeId: employee.id,
              deviceId: config.id,
              date: logDate,
              checkIn: logTime,
              status: 'present',
              isManual: false,
            }
          });
          synced++;
        } else if (!existingRecord.checkOut) {
          const checkInTime = existingRecord.checkIn ? new Date(existingRecord.checkIn) : null;
          let workHours: number | null = existingRecord.workHours;
          
          if (checkInTime) {
            workHours = (logTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
          }

          const checkInHour = checkInTime ? checkInTime.getHours() + checkInTime.getMinutes() / 60 : 8;
          const checkOutHour = logTime.getHours() + logTime.getMinutes() / 60;
          
          const lateMinutes = checkInHour > 8.25 ? Math.round((checkInHour - 8) * 60) : existingRecord.lateMinutes;
          const earlyLeaveMinutes = checkOutHour < 16.75 ? Math.round((17 - checkOutHour) * 60) : existingRecord.earlyLeaveMinutes;

          await db.attendanceRecord.update({
            where: { id: existingRecord.id },
            data: {
              checkOut: logTime,
              workHours: workHours ? Math.round(workHours * 100) / 100 : null,
              lateMinutes,
              earlyLeaveMinutes,
              deviceId: config.id,
            }
          });
          synced++;
        } else {
          skipped++;
        }
      } catch (err: any) {
        errors.push(err.message);
      }
    }

    await db.fingerprintDevice.update({
      where: { id: config.id },
      data: { status: 'online', lastSync: new Date() }
    });

    return { success: true, synced, skipped, errors, totalLogs: records.length };

  } catch (error: any) {
    await db.fingerprintDevice.update({
      where: { id: config.id },
      data: { status: 'offline' }
    }).catch(() => {});

    return { success: false, synced, skipped, errors: [error.message || 'فشل المزامنة'] };
  }
}
