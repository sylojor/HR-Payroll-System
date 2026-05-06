import { db } from '@/lib/db';
import { getLicenseStatus } from '@/lib/license';

export interface LicenseStatus {
  isLicensed: boolean;
  isExpired: boolean;
  daysRemaining: number;
  maxEmployees: number;
  maxDevices: number;
  modules: string[];
  companyName: string;
  licenseKey?: string;
  expiresAt?: Date;
  activatedAt?: Date | null;
  machineId?: string | null;
}

/**
 * Get the current active license info from the database
 */
export async function getLicenseInfo(): Promise<LicenseStatus | null> {
  const license = await db.license.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  });

  if (!license) return null;

  const status = getLicenseStatus(license);

  return {
    ...status,
    licenseKey: license.licenseKey,
    expiresAt: license.expiresAt,
    activatedAt: license.activatedAt,
    machineId: license.machineId,
  };
}

/**
 * Check if the current license allows adding more employees
 */
export async function checkEmployeeLimit(currentCount: number): Promise<boolean> {
  const info = await getLicenseInfo();
  if (!info) return false;
  return currentCount < info.maxEmployees;
}

/**
 * Check if the current license allows adding more devices
 */
export async function checkDeviceLimit(currentCount: number): Promise<boolean> {
  const info = await getLicenseInfo();
  if (!info) return false;
  return currentCount < info.maxDevices;
}

/**
 * Check if the current license grants access to a specific module
 */
export async function checkModuleAccess(moduleId: string): Promise<boolean> {
  const info = await getLicenseInfo();
  if (!info) return false;
  if (!info.isLicensed) return false;
  return info.modules.includes(moduleId);
}
