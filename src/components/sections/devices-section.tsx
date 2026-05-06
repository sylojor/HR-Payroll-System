'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Fingerprint,
  Wifi,
  WifiOff,
  RefreshCw,
  Settings,
  Plus,
  Pencil,
  Trash2,
  Monitor,
  Camera,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Device {
  id: string;
  name: string;
  deviceType: string;
  model: string | null;
  ipAddress: string;
  port: number;
  location: string | null;
  status: string;
  lastSync: string | null;
  username: string | null;
  password: string | null;
  apiKey: string | null;
  isDefault: boolean;
  syncInterval: number;
  createdAt: string;
  updatedAt: string;
}

function formatLastSync(dateStr: string | null): string {
  if (!dateStr) return 'لم تتم المزامنة';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'منذ لحظات';
  if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `منذ ${diffHours} ساعة`;
  const diffDays = Math.floor(diffHours / 24);
  return `منذ ${diffDays} يوم`;
}

export function DevicesSection() {
  const { toast } = useToast();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [syncingDevices, setSyncingDevices] = useState<Set<string>>(new Set());
  const [testingDevices, setTestingDevices] = useState<Set<string>>(new Set());

  // Form state
  const [formName, setFormName] = useState('');
  const [formDeviceType, setFormDeviceType] = useState('zk');
  const [formModel, setFormModel] = useState('');
  const [formIpAddress, setFormIpAddress] = useState('');
  const [formPort, setFormPort] = useState(4370);
  const [formLocation, setFormLocation] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formApiKey, setFormApiKey] = useState('');
  const [formSyncInterval, setFormSyncInterval] = useState(30);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const fetchDevices = useCallback(async () => {
    try {
      const res = await fetch('/api/devices');
      if (res.ok) {
        const data = await res.json();
        setDevices(data);
      }
    } catch (error) {
      console.error('Error fetching devices:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  function resetForm() {
    setFormName('');
    setFormDeviceType('zk');
    setFormModel('');
    setFormIpAddress('');
    setFormPort(4370);
    setFormLocation('');
    setFormUsername('');
    setFormPassword('');
    setFormApiKey('');
    setFormSyncInterval(30);
  }

  function openEditDialog(device: Device) {
    setEditingDevice(device);
    setFormName(device.name);
    setFormDeviceType(device.deviceType);
    setFormModel(device.model || '');
    setFormIpAddress(device.ipAddress);
    setFormPort(device.port);
    setFormLocation(device.location || '');
    setFormUsername(device.username || '');
    setFormPassword(device.password || '');
    setFormApiKey(device.apiKey || '');
    setFormSyncInterval(device.syncInterval);
    setShowEditDialog(true);
  }

  async function handleAddDevice() {
    if (!formName || !formIpAddress) {
      toast({ title: 'خطأ', description: 'يرجى ملء الحقول المطلوبة', variant: 'destructive' });
      return;
    }
    setFormSubmitting(true);
    try {
      const res = await fetch('/api/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          deviceType: formDeviceType,
          model: formModel || null,
          ipAddress: formIpAddress,
          port: formPort,
          location: formLocation || null,
          username: formUsername || null,
          password: formPassword || null,
          apiKey: formApiKey || null,
          syncInterval: formSyncInterval,
        }),
      });

      if (res.ok) {
        toast({ title: 'تمت الإضافة', description: 'تم إضافة الجهاز بنجاح' });
        setShowAddDialog(false);
        resetForm();
        fetchDevices();
      } else {
        const data = await res.json();
        toast({ title: 'خطأ', description: data.error || 'فشل في إضافة الجهاز', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل في إضافة الجهاز', variant: 'destructive' });
    } finally {
      setFormSubmitting(false);
    }
  }

  async function handleEditDevice() {
    if (!editingDevice) return;
    setFormSubmitting(true);
    try {
      const res = await fetch(`/api/devices/${editingDevice.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          deviceType: formDeviceType,
          model: formModel || null,
          ipAddress: formIpAddress,
          port: formPort,
          location: formLocation || null,
          username: formUsername || null,
          password: formPassword || null,
          apiKey: formApiKey || null,
          syncInterval: formSyncInterval,
        }),
      });

      if (res.ok) {
        toast({ title: 'تم التحديث', description: 'تم تحديث بيانات الجهاز بنجاح' });
        setShowEditDialog(false);
        setEditingDevice(null);
        resetForm();
        fetchDevices();
      } else {
        const data = await res.json();
        toast({ title: 'خطأ', description: data.error || 'فشل في تحديث الجهاز', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل في تحديث الجهاز', variant: 'destructive' });
    } finally {
      setFormSubmitting(false);
    }
  }

  async function handleDeleteDevice(deviceId: string) {
    if (!confirm('هل أنت متأكد من حذف هذا الجهاز؟')) return;
    try {
      const res = await fetch(`/api/devices/${deviceId}`, { method: 'DELETE' });
      if (res.ok) {
        toast({ title: 'تم الحذف', description: 'تم حذف الجهاز بنجاح' });
        fetchDevices();
      } else {
        toast({ title: 'خطأ', description: 'فشل في حذف الجهاز', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل في حذف الجهاز', variant: 'destructive' });
    }
  }

  async function handleSync(deviceId: string) {
    setSyncingDevices((prev) => new Set(prev).add(deviceId));
    toast({ title: 'جاري المزامنة...', description: 'يرجى الانتظار' });
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const res = await fetch(`/api/devices/${deviceId}/sync`, { method: 'POST' });
      if (res.ok) {
        toast({ title: 'تمت المزامنة', description: 'تم مزامنة الجهاز بنجاح' });
        fetchDevices();
      } else {
        toast({ title: 'خطأ', description: 'فشل في مزامنة الجهاز', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل في مزامنة الجهاز', variant: 'destructive' });
    } finally {
      setSyncingDevices((prev) => {
        const next = new Set(prev);
        next.delete(deviceId);
        return next;
      });
    }
  }

  async function handleTestConnection(deviceId: string) {
    setTestingDevices((prev) => new Set(prev).add(deviceId));
    try {
      const res = await fetch(`/api/devices/${deviceId}/test`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'الاتصال ناجح', description: data.message });
      } else {
        toast({ title: 'فشل الاتصال', description: data.message, variant: 'destructive' });
      }
      fetchDevices();
    } catch {
      toast({ title: 'خطأ', description: 'فشل في اختبار الاتصال', variant: 'destructive' });
    } finally {
      setTestingDevices((prev) => {
        const next = new Set(prev);
        next.delete(deviceId);
        return next;
      });
    }
  }

  function getDeviceIcon(type: string) {
    if (type === 'hikvision') {
      return <Camera className="h-6 w-6" />;
    }
    return <Fingerprint className="h-6 w-6" />;
  }

  const onlineCount = devices.filter((d) => d.status === 'online').length;
  const offlineCount = devices.filter((d) => d.status === 'offline').length;

  // Shared form JSX
  const formContent = (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2 col-span-2">
          <Label>اسم الجهاز *</Label>
          <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="اسم الجهاز" />
        </div>
        <div className="space-y-2">
          <Label>نوع الجهاز</Label>
          <Select
            value={formDeviceType}
            onValueChange={(val) => {
              setFormDeviceType(val);
              setFormPort(val === 'hikvision' ? 80 : 4370);
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="zk">ZK (بصمة)</SelectItem>
              <SelectItem value="hikvision">Hikvision (كاميرا)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>الموديل</Label>
          <Input value={formModel} onChange={(e) => setFormModel(e.target.value)} placeholder="مثال: ZK-TF1700" />
        </div>
        <div className="space-y-2">
          <Label>عنوان IP *</Label>
          <Input value={formIpAddress} onChange={(e) => setFormIpAddress(e.target.value)} placeholder="192.168.1.100" dir="ltr" />
        </div>
        <div className="space-y-2">
          <Label>المنفذ</Label>
          <Input
            type="number"
            value={formPort}
            onChange={(e) => setFormPort(parseInt(e.target.value) || 0)}
            dir="ltr"
          />
        </div>
        <div className="space-y-2 col-span-2">
          <Label>الموقع</Label>
          <Input value={formLocation} onChange={(e) => setFormLocation(e.target.value)} placeholder="مثال: المدخل الرئيسي" />
        </div>
        <div className="space-y-2">
          <Label>اسم المستخدم</Label>
          <Input value={formUsername} onChange={(e) => setFormUsername(e.target.value)} placeholder="admin" dir="ltr" />
        </div>
        <div className="space-y-2">
          <Label>كلمة المرور</Label>
          <Input
            type="password"
            value={formPassword}
            onChange={(e) => setFormPassword(e.target.value)}
            placeholder="••••••"
            dir="ltr"
          />
        </div>
        {formDeviceType === 'hikvision' && (
          <div className="space-y-2 col-span-2">
            <Label>API Key (هيكفيجن)</Label>
            <Input
              value={formApiKey}
              onChange={(e) => setFormApiKey(e.target.value)}
              placeholder="مفتاح API"
              dir="ltr"
            />
          </div>
        )}
        <div className="space-y-2">
          <Label>فاصل المزامنة (دقيقة)</Label>
          <Input
            type="number"
            value={formSyncInterval}
            onChange={(e) => setFormSyncInterval(parseInt(e.target.value) || 30)}
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">أجهزة البصمة</h1>
          <p className="text-sm text-muted-foreground mt-1">إدارة أجهزة البصمة والتحقق من الاتصال</p>
        </div>
        <Button
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700"
          onClick={() => {
            resetForm();
            setShowAddDialog(true);
          }}
        >
          <Plus className="h-4 w-4 ml-2" />
          إضافة جهاز
        </Button>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <Monitor className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">إجمالي الأجهزة</p>
              <p className="text-xl font-bold">{devices.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Wifi className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">متصل</p>
              <p className="text-xl font-bold text-emerald-600">{onlineCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
              <WifiOff className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">غير متصل</p>
              <p className="text-xl font-bold text-red-600">{offlineCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Device Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-3/4 mb-4" />
                <div className="h-3 bg-muted rounded w-1/2 mb-2" />
                <div className="h-3 bg-muted rounded w-2/3 mb-2" />
                <div className="h-3 bg-muted rounded w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : devices.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Fingerprint className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground">لا توجد أجهزة بصمة مسجلة</p>
            <p className="text-sm text-muted-foreground mt-1">أضف جهاز جديد للبدء</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {devices.map((device) => (
            <Card
              key={device.id}
              className="hover:shadow-md transition-shadow border-border"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-11 w-11 rounded-lg flex items-center justify-center ${
                        device.deviceType === 'hikvision'
                          ? 'bg-orange-50 text-orange-600'
                          : 'bg-emerald-50 text-emerald-600'
                      }`}
                    >
                      {getDeviceIcon(device.deviceType)}
                    </div>
                    <div>
                      <CardTitle className="text-base">{device.name}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {device.deviceType === 'zk' ? 'ZK Teco' : 'Hikvision'} {device.model ? `• ${device.model}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        device.status === 'online' ? 'bg-emerald-500' : 'bg-red-500'
                      }`}
                    />
                    <span className="text-xs text-muted-foreground">
                      {device.status === 'online' ? 'متصل' : 'غير متصل'}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">عنوان IP</span>
                    <span className="font-mono" dir="ltr">{device.ipAddress}:{device.port}</span>
                  </div>
                  {device.location && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">الموقع</span>
                      <span>{device.location}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">آخر مزامنة</span>
                    <span className="text-xs">{formatLastSync(device.lastSync)}</span>
                  </div>
                  {device.isDefault && (
                    <div className="pt-1">
                      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200 text-xs">
                        الجهاز الرئيسي
                      </Badge>
                    </div>
                  )}
                </div>

                <div className="border-t pt-3 flex items-center gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => handleSync(device.id)}
                    disabled={syncingDevices.has(device.id)}
                  >
                    <RefreshCw
                      className={`h-3.5 w-3.5 ml-1 ${
                        syncingDevices.has(device.id) ? 'animate-spin' : ''
                      }`}
                    />
                    {syncingDevices.has(device.id) ? 'جاري المزامنة...' : 'مزامنة'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => handleTestConnection(device.id)}
                    disabled={testingDevices.has(device.id)}
                  >
                    <Settings
                      className={`h-3.5 w-3.5 ml-1 ${
                        testingDevices.has(device.id) ? 'animate-spin' : ''
                      }`}
                    />
                    {testingDevices.has(device.id) ? 'جاري الاختبار...' : 'اختبار الاتصال'}
                  </Button>
                  <div className="flex-1" />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => openEditDialog(device)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleDeleteDevice(device.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Device Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle>إضافة جهاز بصمة جديد</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {formContent}
            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleAddDevice}
                disabled={formSubmitting}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                {formSubmitting ? 'جاري الحفظ...' : 'إضافة الجهاز'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowAddDialog(false)}
                className="flex-1"
              >
                إلغاء
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Device Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle>تعديل بيانات الجهاز</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {formContent}
            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleEditDevice}
                disabled={formSubmitting}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                {formSubmitting ? 'جاري الحفظ...' : 'حفظ التعديلات'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowEditDialog(false);
                  setEditingDevice(null);
                }}
                className="flex-1"
              >
                إلغاء
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
