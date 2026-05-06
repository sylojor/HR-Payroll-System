'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  Key,
  Lock,
  Unlock,
  Copy,
  Check,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Building2,
  Calendar,
  Users,
  Monitor,
  Package,
  RefreshCw,
  Trash2,
  Plus,
  Eye,
  EyeOff,
  Clock,
  Mail,
  Phone,
  FileText,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { AVAILABLE_MODULES } from '@/lib/license';

interface LicenseData {
  isLicensed: boolean;
  isExpired: boolean;
  daysRemaining: number;
  maxEmployees: number;
  maxDevices: number;
  modules: string[];
  companyName: string;
  licenseKey: string | null;
  expiresAt: string | null;
  activatedAt: string | null;
  machineId: string | null;
}

interface GeneratedLicense {
  licenseKey: string;
  companyName: string;
  companyEmail: string | null;
  phone: string | null;
  maxEmployees: number;
  maxDevices: number;
  modules: string;
  issuedAt: string;
  expiresAt: string;
  notes: string | null;
}

export function LicenseSection() {
  const [licenseData, setLicenseData] = useState<LicenseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activationKey, setActivationKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [activating, setActivating] = useState(false);
  const [activationMessage, setActivationMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Generate license form state
  const [genCompanyName, setGenCompanyName] = useState('');
  const [genCompanyEmail, setGenCompanyEmail] = useState('');
  const [genPhone, setGenPhone] = useState('');
  const [genMaxEmployees, setGenMaxEmployees] = useState(50);
  const [genMaxDevices, setGenMaxDevices] = useState(5);
  const [genDuration, setGenDuration] = useState(12);
  const [genNotes, setGenNotes] = useState('');
  const [genSelectedModules, setGenSelectedModules] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [generatedLicense, setGeneratedLicense] = useState<GeneratedLicense | null>(null);
  const [genMessage, setGenMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Validate key state
  const [validateKey, setValidateKey] = useState('');
  const [validating, setValidating] = useState(false);
  const [validateResult, setValidateResult] = useState<{
    valid: boolean;
    error: string | null;
    checks: { format: boolean; exists: boolean; active: boolean; notExpired: boolean };
    details?: {
      companyName: string;
      maxEmployees: number;
      maxDevices: number;
      expiresAt: string;
      isAlreadyActivated: boolean;
      machineId: string | null;
    };
  } | null>(null);

  const fetchLicense = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/license');
      const data = await res.json();
      setLicenseData(data);
    } catch (error) {
      console.error('Error fetching license:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLicense();
  }, [fetchLicense]);

  const handleActivate = async () => {
    if (!activationKey.trim()) return;
    setActivating(true);
    setActivationMessage(null);
    try {
      // Generate a simple machine ID on client side
      const machineId = `${navigator.userAgent.length}-${screen.width}x${screen.height}-${navigator.language}`;
      const res = await fetch('/api/license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseKey: activationKey.trim().toUpperCase(), machineId }),
      });
      const data = await res.json();
      if (res.ok) {
        setActivationMessage({ type: 'success', text: data.message || 'تم تفعيل الترخيص بنجاح' });
        setActivationKey('');
        fetchLicense();
      } else {
        setActivationMessage({ type: 'error', text: data.error || 'فشل في تفعيل الترخيص' });
      }
    } catch {
      setActivationMessage({ type: 'error', text: 'حدث خطأ في الاتصال' });
    } finally {
      setActivating(false);
    }
  };

  const handleDeactivate = async () => {
    try {
      const res = await fetch('/api/license/deactivate', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        fetchLicense();
      } else {
        console.error('Deactivation error:', data.error);
      }
    } catch (error) {
      console.error('Error deactivating:', error);
    }
  };

  const handleValidate = async () => {
    if (!validateKey.trim()) return;
    setValidating(true);
    try {
      const res = await fetch('/api/license/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseKey: validateKey.trim().toUpperCase() }),
      });
      const data = await res.json();
      setValidateResult(data);
    } catch {
      setValidateResult({
        valid: false,
        error: 'حدث خطأ في الاتصال',
        checks: { format: false, exists: false, active: false, notExpired: false },
      });
    } finally {
      setValidating(false);
    }
  };

  const handleGenerate = async () => {
    if (!genCompanyName.trim()) return;
    setGenerating(true);
    setGenMessage(null);
    try {
      const modules = genSelectedModules.length === 0 ? 'all' : genSelectedModules;
      const res = await fetch('/api/license/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: genCompanyName,
          companyEmail: genCompanyEmail || undefined,
          phone: genPhone || undefined,
          maxEmployees: genMaxEmployees,
          maxDevices: genMaxDevices,
          modules,
          durationMonths: genDuration,
          notes: genNotes || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setGenMessage({ type: 'success', text: data.message || 'تم إنشاء مفتاح الترخيص بنجاح' });
        setGeneratedLicense(data.license);
      } else {
        setGenMessage({ type: 'error', text: data.error || 'فشل في إنشاء مفتاح الترخيص' });
      }
    } catch {
      setGenMessage({ type: 'error', text: 'حدث خطأ في الاتصال' });
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const toggleModule = (moduleId: string) => {
    setGenSelectedModules(prev =>
      prev.includes(moduleId)
        ? prev.filter(m => m !== moduleId)
        : [...prev, moduleId]
    );
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('ar-JO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getExpiryColor = (days: number) => {
    if (days <= 0) return 'text-red-500';
    if (days <= 30) return 'text-amber-500';
    return 'text-emerald-600';
  };

  const getExpiryBadge = (days: number) => {
    if (days <= 0) return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">منتهي</Badge>;
    if (days <= 30) return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">ينتهي قريباً</Badge>;
    return <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">فعّال</Badge>;
  };

  // ==================== RENDERING ====================

  if (loading) {
    return (
      <div className="p-6 space-y-6" dir="rtl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Unlicensed view
  if (!licenseData?.isLicensed) {
    return (
      <div className="p-6 space-y-6" dir="rtl">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
            <Lock className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold">تفعيل الترخيص</h2>
            <p className="text-sm text-muted-foreground">النظام غير مفعّل. يرجى إدخال مفتاح الترخيص للاستخدام الكامل</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Activation Form */}
          <Card className="border-2 border-dashed border-amber-300 dark:border-amber-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5 text-emerald-600" />
                إدخال مفتاح الترخيص
              </CardTitle>
              <CardDescription>أدخل مفتاح الترخيص الذي حصلت عليه لتفعيل النظام</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="license-key">مفتاح الترخيص</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="license-key"
                      placeholder="HRMS-XXXX-XXXX-XXXX-XXXX"
                      value={activationKey}
                      onChange={(e) => setActivationKey(e.target.value.toUpperCase())}
                      className="font-mono text-lg tracking-wider text-center pl-10"
                      dir="ltr"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute left-1 top-1/2 -translate-y-1/2 h-7 w-7"
                      onClick={() => setShowKey(!showKey)}
                    >
                      {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>
              </div>

              {activationMessage && (
                <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
                  activationMessage.type === 'success'
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                    : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                }`}>
                  {activationMessage.type === 'success'
                    ? <CheckCircle2 className="h-4 w-4 shrink-0" />
                    : <XCircle className="h-4 w-4 shrink-0" />
                  }
                  {activationMessage.text}
                </div>
              )}

              <Button
                onClick={handleActivate}
                disabled={!activationKey.trim() || activating}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {activating ? (
                  <RefreshCw className="h-4 w-4 animate-spin ml-2" />
                ) : (
                  <Unlock className="h-4 w-4 ml-2" />
                )}
                {activating ? 'جارٍ التفعيل...' : 'تفعيل الترخيص'}
              </Button>

              <Separator />

              {/* Quick validate */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">التحقق من مفتاح قبل التفعيل</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="HRMS-XXXX-XXXX-XXXX-XXXX"
                    value={validateKey}
                    onChange={(e) => setValidateKey(e.target.value.toUpperCase())}
                    className="font-mono text-sm"
                    dir="ltr"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleValidate}
                    disabled={!validateKey.trim() || validating}
                  >
                    {validating ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : 'تحقق'}
                  </Button>
                </div>
                {validateResult && (
                  <div className={`p-3 rounded-lg text-xs space-y-1 ${
                    validateResult.valid
                      ? 'bg-emerald-50 dark:bg-emerald-900/20'
                      : 'bg-red-50 dark:bg-red-900/20'
                  }`}>
                    <div className="flex items-center gap-1.5">
                      {validateResult.valid
                        ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        : <XCircle className="h-3.5 w-3.5 text-red-500" />
                      }
                      <span className="font-medium">
                        {validateResult.valid ? 'المفتاح صالح للتفعيل' : validateResult.error}
                      </span>
                    </div>
                    {validateResult.checks && (
                      <div className="flex gap-3 mt-1">
                        <span className={validateResult.checks.format ? 'text-emerald-600' : 'text-red-500'}>
                          الصيغة {validateResult.checks.format ? '✓' : '✗'}
                        </span>
                        <span className={validateResult.checks.exists ? 'text-emerald-600' : 'text-red-500'}>
                          موجود {validateResult.checks.exists ? '✓' : '✗'}
                        </span>
                        <span className={validateResult.checks.active ? 'text-emerald-600' : 'text-red-500'}>
                          فعّال {validateResult.checks.active ? '✓' : '✗'}
                        </span>
                        <span className={validateResult.checks.notExpired ? 'text-emerald-600' : 'text-red-500'}>
                          غير منتهي {validateResult.checks.notExpired ? '✓' : '✗'}
                        </span>
                      </div>
                    )}
                    {validateResult.details && (
                      <div className="mt-2 text-muted-foreground">
                        <p>الشركة: {validateResult.details.companyName}</p>
                        <p>الحد الأقصى للموظفين: {validateResult.details.maxEmployees}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Information Card */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Shield className="h-5 w-5 text-emerald-600" />
                  حول نظام الترخيص
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>ترخيص لكل شركة مع ربط بجهاز محدد</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>تحديد الحد الأقصى لعدد الموظفين والأجهزة</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>تفعيل وحدات محددة حسب نوع الاشتراك</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>دعم فني وتحديثات خلال فترة الاشتراك</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>إمكانية تجديد الاشتراك في أي وقت</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800">
              <CardContent className="p-4">
                <h4 className="font-semibold text-emerald-700 dark:text-emerald-400 mb-2">للحصول على مفتاح ترخيص</h4>
                <div className="space-y-1.5 text-sm text-muted-foreground">
                  <p className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5" />
                    sales@hrms-system.com
                  </p>
                  <p className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5" />
                    +962 7X XXX XXXX
                  </p>
                  <p className="flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5" />
                    شركة نظام الموارد البشرية
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-amber-200 dark:border-amber-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span className="font-semibold text-amber-700 dark:text-amber-400">بدون ترخيص</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  بعض الميزات قد تكون محدودة بدون تفعيل الترخيص. يرجى التواصل معنا للحصول على مفتاح ترخيص مناسب لاحتياجات شركتكم.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Generate License (Admin) - Always visible at bottom */}
        <Separator />
        {renderGenerateLicense()}
      </div>
    );
  }

  // Licensed view
  return (
    <div className="p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold">الترخيص والتفعيل</h2>
              {getExpiryBadge(licenseData.daysRemaining)}
            </div>
            <p className="text-sm text-muted-foreground">
              {licenseData.isExpired ? 'الترخيص منتهي الصلاحية' : `مرخص لصالح ${licenseData.companyName}`}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">الأيام المتبقية</p>
                <p className={`text-2xl font-bold ${getExpiryColor(licenseData.daysRemaining)}`}>
                  {licenseData.daysRemaining}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">الحد الأقصى للموظفين</p>
                <p className="text-2xl font-bold">{licenseData.maxEmployees}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <Monitor className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">الحد الأقصى للأجهزة</p>
                <p className="text-2xl font-bold">{licenseData.maxDevices}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">الوحدات المفعّلة</p>
                <p className="text-2xl font-bold">{licenseData.modules.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* License Details Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Key className="h-5 w-5 text-emerald-600" />
              تفاصيل الترخيص
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Company */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Building2 className="h-4 w-4" />
                الشركة
              </div>
              <span className="font-medium">{licenseData.companyName}</span>
            </div>

            {/* License Key */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Key className="h-4 w-4" />
                مفتاح الترخيص
              </div>
              <div className="flex items-center gap-1.5">
                <code className="font-mono text-xs bg-muted px-2 py-1 rounded" dir="ltr">
                  {showKey
                    ? licenseData.licenseKey
                    : licenseData.licenseKey?.replace(/HRMS-.*/, 'HRMS-****-****-****-****')
                  }
                </code>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowKey(!showKey)}>
                  {showKey ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                </Button>
                {licenseData.licenseKey && (
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(licenseData.licenseKey!)}>
                    {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                  </Button>
                )}
              </div>
            </div>

            {/* Expiry Date */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                تاريخ الانتهاء
              </div>
              <span className={`font-medium ${getExpiryColor(licenseData.daysRemaining)}`}>
                {formatDate(licenseData.expiresAt)}
              </span>
            </div>

            {/* Activation Date */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                تاريخ التفعيل
              </div>
              <span className="font-medium">{formatDate(licenseData.activatedAt)}</span>
            </div>

            {/* Machine ID */}
            {licenseData.machineId && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Monitor className="h-4 w-4" />
                  معرّف الجهاز
                </div>
                <code className="font-mono text-xs bg-muted px-2 py-1 rounded" dir="ltr">
                  {licenseData.machineId.substring(0, 16)}...
                </code>
              </div>
            )}

            <Separator />

            {/* Expiry Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>صلاحية الترخيص</span>
                <span>{licenseData.daysRemaining} يوم متبقي</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    licenseData.daysRemaining <= 30
                      ? 'bg-amber-500'
                      : 'bg-emerald-600'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(2, (licenseData.daysRemaining / 365) * 100))}%` }}
                />
              </div>
            </div>

            <Separator />

            {/* Actions */}
            <div className="flex gap-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="flex-1">
                    <RefreshCw className="h-4 w-4 ml-1.5" />
                    تجديد الترخيص
                  </Button>
                </DialogTrigger>
                <DialogContent dir="rtl">
                  <DialogHeader>
                    <DialogTitle>تجديد الترخيص</DialogTitle>
                    <DialogDescription>
                      أدخل مفتاح الترخيص الجديد لتجديد اشتراكك
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <Input
                      placeholder="HRMS-XXXX-XXXX-XXXX-XXXX"
                      value={activationKey}
                      onChange={(e) => setActivationKey(e.target.value.toUpperCase())}
                      className="font-mono text-center"
                      dir="ltr"
                    />
                  </div>
                  <DialogFooter>
                    <Button onClick={handleActivate} disabled={!activationKey.trim()} className="bg-emerald-600 hover:bg-emerald-700">
                      تجديد
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20">
                    <Trash2 className="h-4 w-4 ml-1.5" />
                    إلغاء التفعيل
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent dir="rtl">
                  <AlertDialogHeader>
                    <AlertDialogTitle>تأكيد إلغاء التفعيل</AlertDialogTitle>
                    <AlertDialogDescription>
                      هل أنت متأكد من إلغاء تفعيل الترخيص؟ سيتم تعطيل الوصول للميزات المرخصة. يمكن إعادة التفعيل لاحقاً باستخدام نفس المفتاح أو مفتاح جديد.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>إلغاء</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeactivate} className="bg-red-600 hover:bg-red-700">
                      نعم، إلغاء التفعيل
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>

        {/* Modules Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="h-5 w-5 text-emerald-600" />
              الوحدات المفعّلة
            </CardTitle>
            <CardDescription>الوحدات المتاحة ضمن الترخيص الحالي</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {AVAILABLE_MODULES.map((mod) => {
                const isEnabled = licenseData.modules.includes(mod.id);
                return (
                  <div
                    key={mod.id}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border text-sm ${
                      isEnabled
                        ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800'
                        : 'bg-muted/50 border-muted opacity-50'
                    }`}
                  >
                    {isEnabled ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <span className={isEnabled ? 'font-medium' : 'text-muted-foreground line-through'}>
                      {mod.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Generate License (Admin) */}
      <Separator />
      {renderGenerateLicense()}
    </div>
  );

  // ==================== GENERATE LICENSE (Admin) ====================
  function renderGenerateLicense() {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="h-5 w-5 text-emerald-600" />
            إنشاء مفتاح ترخيص جديد
          </CardTitle>
          <CardDescription>للمسؤولين: إنشاء مفاتيح ترخيص جديدة للعملاء</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="form" dir="rtl">
            <TabsList className="mb-4">
              <TabsTrigger value="form">نموذج الإنشاء</TabsTrigger>
              <TabsTrigger value="result" disabled={!generatedLicense}>النتيجة</TabsTrigger>
            </TabsList>

            <TabsContent value="form" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Company Name */}
                <div className="space-y-2">
                  <Label htmlFor="gen-company">
                    <Building2 className="h-3.5 w-3.5 inline ml-1" />
                    اسم الشركة *
                  </Label>
                  <Input
                    id="gen-company"
                    placeholder="اسم الشركة"
                    value={genCompanyName}
                    onChange={(e) => setGenCompanyName(e.target.value)}
                  />
                </div>

                {/* Company Email */}
                <div className="space-y-2">
                  <Label htmlFor="gen-email">
                    <Mail className="h-3.5 w-3.5 inline ml-1" />
                    البريد الإلكتروني
                  </Label>
                  <Input
                    id="gen-email"
                    type="email"
                    placeholder="email@company.com"
                    value={genCompanyEmail}
                    onChange={(e) => setGenCompanyEmail(e.target.value)}
                    dir="ltr"
                  />
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <Label htmlFor="gen-phone">
                    <Phone className="h-3.5 w-3.5 inline ml-1" />
                    رقم الهاتف
                  </Label>
                  <Input
                    id="gen-phone"
                    placeholder="+962 7X XXX XXXX"
                    value={genPhone}
                    onChange={(e) => setGenPhone(e.target.value)}
                    dir="ltr"
                  />
                </div>

                {/* Duration */}
                <div className="space-y-2">
                  <Label htmlFor="gen-duration">
                    <Calendar className="h-3.5 w-3.5 inline ml-1" />
                    مدة الاشتراك (أشهر)
                  </Label>
                  <Input
                    id="gen-duration"
                    type="number"
                    min={1}
                    max={120}
                    value={genDuration}
                    onChange={(e) => setGenDuration(parseInt(e.target.value) || 12)}
                  />
                </div>

                {/* Max Employees */}
                <div className="space-y-2">
                  <Label htmlFor="gen-max-employees">
                    <Users className="h-3.5 w-3.5 inline ml-1" />
                    الحد الأقصى للموظفين
                  </Label>
                  <Input
                    id="gen-max-employees"
                    type="number"
                    min={1}
                    max={10000}
                    value={genMaxEmployees}
                    onChange={(e) => setGenMaxEmployees(parseInt(e.target.value) || 50)}
                  />
                </div>

                {/* Max Devices */}
                <div className="space-y-2">
                  <Label htmlFor="gen-max-devices">
                    <Monitor className="h-3.5 w-3.5 inline ml-1" />
                    الحد الأقصى للأجهزة
                  </Label>
                  <Input
                    id="gen-max-devices"
                    type="number"
                    min={1}
                    max={100}
                    value={genMaxDevices}
                    onChange={(e) => setGenMaxDevices(parseInt(e.target.value) || 5)}
                  />
                </div>
              </div>

              {/* Modules Selection */}
              <div className="space-y-2">
                <Label>
                  <Package className="h-3.5 w-3.5 inline ml-1" />
                  الوحدات المفعّلة (اتركها فارغة لتفعيل الكل)
                </Label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_MODULES.map((mod) => {
                    const isSelected = genSelectedModules.includes(mod.id);
                    return (
                      <button
                        key={mod.id}
                        onClick={() => toggleModule(mod.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                          isSelected
                            ? 'bg-emerald-100 border-emerald-300 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-400'
                            : 'bg-muted/50 border-muted text-muted-foreground hover:border-emerald-300'
                        }`}
                      >
                        {isSelected ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                        {mod.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="gen-notes">
                  <FileText className="h-3.5 w-3.5 inline ml-1" />
                  ملاحظات
                </Label>
                <Textarea
                  id="gen-notes"
                  placeholder="ملاحظات إضافية..."
                  value={genNotes}
                  onChange={(e) => setGenNotes(e.target.value)}
                  rows={2}
                />
              </div>

              {genMessage && (
                <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
                  genMessage.type === 'success'
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                    : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                }`}>
                  {genMessage.type === 'success'
                    ? <CheckCircle2 className="h-4 w-4 shrink-0" />
                    : <XCircle className="h-4 w-4 shrink-0" />
                  }
                  {genMessage.text}
                </div>
              )}

              <Button
                onClick={handleGenerate}
                disabled={!genCompanyName.trim() || generating}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {generating ? (
                  <RefreshCw className="h-4 w-4 animate-spin ml-2" />
                ) : (
                  <Key className="h-4 w-4 ml-2" />
                )}
                {generating ? 'جارٍ الإنشاء...' : 'إنشاء مفتاح ترخيص'}
              </Button>
            </TabsContent>

            <TabsContent value="result">
              {generatedLicense && (
                <div className="space-y-4">
                  <Card className="bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800">
                    <CardContent className="p-4 space-y-3">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground mb-1">مفتاح الترخيص الجديد</p>
                        <div className="flex items-center justify-center gap-2">
                          <code className="font-mono text-xl font-bold tracking-wider text-emerald-700 dark:text-emerald-400" dir="ltr">
                            {generatedLicense.licenseKey}
                          </code>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => copyToClipboard(generatedLicense.licenseKey)}
                          >
                            {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex justify-between p-2 bg-muted/50 rounded">
                      <span className="text-muted-foreground">الشركة</span>
                      <span className="font-medium">{generatedLicense.companyName}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted/50 rounded">
                      <span className="text-muted-foreground">البريد</span>
                      <span className="font-medium" dir="ltr">{generatedLicense.companyEmail || '—'}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted/50 rounded">
                      <span className="text-muted-foreground">الحد الأقصى للموظفين</span>
                      <span className="font-medium">{generatedLicense.maxEmployees}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted/50 rounded">
                      <span className="text-muted-foreground">الحد الأقصى للأجهزة</span>
                      <span className="font-medium">{generatedLicense.maxDevices}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted/50 rounded">
                      <span className="text-muted-foreground">تاريخ الإصدار</span>
                      <span className="font-medium">{formatDate(generatedLicense.issuedAt)}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted/50 rounded">
                      <span className="text-muted-foreground">تاريخ الانتهاء</span>
                      <span className="font-medium">{formatDate(generatedLicense.expiresAt)}</span>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    );
  }
}
