// Server-only license utilities - DO NOT import from client components
// This file uses Node.js crypto module

import crypto from 'crypto';

const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/**
 * Generate a license key in format: HRMS-XXXX-XXXX-XXXX-XXXX
 */
export function generateLicenseKey(): string {
  const segments: string[] = [];
  for (let s = 0; s < 4; s++) {
    let segment = '';
    for (let i = 0; i < 4; i++) {
      const randomIndex = crypto.randomInt(0, CHARSET.length);
      segment += CHARSET[randomIndex];
    }
    segments.push(segment);
  }
  return `HRMS-${segments.join('-')}`;
}

/**
 * Validate license key format (HRMS-XXXX-XXXX-XXXX-XXXX)
 */
export function validateLicenseKeyFormat(key: string): boolean {
  const pattern = /^HRMS-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
  return pattern.test(key);
}

/**
 * Generate a machine fingerprint
 */
export function generateMachineId(seed?: string): string {
  const components = [
    process.env.HOSTNAME || 'unknown',
    process.platform || 'unknown',
    process.arch || 'unknown',
    seed || crypto.randomBytes(8).toString('hex'),
  ];
  return crypto
    .createHash('sha256')
    .update(components.join('|'))
    .digest('hex')
    .substring(0, 32);
}

/**
 * Calculate license expiry date based on subscription duration
 */
export function calculateExpiry(months: number): Date {
  const now = new Date();
  const expiry = new Date(now);
  expiry.setMonth(expiry.getMonth() + months);
  return expiry;
}

/**
 * Check if a license is valid and not expired
 */
export function isLicenseValid(license: {
  isActive: boolean;
  expiresAt: Date;
}): boolean {
  if (!license.isActive) return false;
  const now = new Date();
  return new Date(license.expiresAt) > now;
}

/**
 * Get detailed license status
 */
export function getLicenseStatus(license: {
  isActive: boolean;
  expiresAt: Date;
  maxEmployees: number;
  maxDevices: number;
  modules: string;
  companyName: string;
} | null): {
  isLicensed: boolean;
  isExpired: boolean;
  daysRemaining: number;
  maxEmployees: number;
  maxDevices: number;
  modules: string[];
  companyName: string;
} {
  if (!license) {
    return {
      isLicensed: false,
      isExpired: true,
      daysRemaining: 0,
      maxEmployees: 0,
      maxDevices: 0,
      modules: [],
      companyName: '',
    };
  }

  const now = new Date();
  const expiryDate = new Date(license.expiresAt);
  const diffMs = expiryDate.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  const isExpired = expiryDate <= now;

  let parsedModules: string[] = [];
  try {
    if (license.modules === 'all') {
      parsedModules = [
        'dashboard',
        'employees',
        'attendance',
        'devices',
        'leaves',
        'payroll',
        'accounting',
        'messages',
        'notifications',
        'settings',
      ];
    } else {
      parsedModules = JSON.parse(license.modules);
    }
  } catch {
    parsedModules = [];
  }

  return {
    isLicensed: license.isActive && !isExpired,
    isExpired,
    daysRemaining,
    maxEmployees: license.maxEmployees,
    maxDevices: license.maxDevices,
    modules: parsedModules,
    companyName: license.companyName,
  };
}
