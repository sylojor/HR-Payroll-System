'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Settings, Save, Building2, Clock, Palette } from 'lucide-react';
import { toast } from 'sonner';

interface CompanyData {
  id: string; name: string; nameEn: string; logo: string | null; address: string | null;
  phone: string | null; email: string | null; currency: string; fiscalYearStart: string;
  workingHours: number; overtimeRate: number;
}

export function SettingsSection() {
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/company')
      .then(res => res.json())
      .then(data => setCompany(data.company || data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSaveCompany = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!company) return;
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const body = {
      name: fd.get('name'),
      nameEn: fd.get('nameEn'),
      address: fd.get('address'),
      phone: fd.get('phone'),
      email: fd.get('email'),
      currency: fd.get('currency'),
    };
    await fetch('/api/company', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    toast.success('تم حفظ الإعدادات بنجاح');
    setSaving(false);
  };

  const handleSaveWork = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!company) return;
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const body = {
      workingHours: Number(fd.get('workingHours')),
      overtimeRate: Number(fd.get('overtimeRate')),
      fiscalYearStart: fd.get('fiscalYearStart'),
    };
    await fetch('/api/company', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    setCompany(prev => prev ? { ...prev, ...body } : null);
    toast.success('تم حفظ إعدادات العمل بنجاح');
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>;
  if (!company) return null;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-7 w-7 text-emerald-600" />
        <h2 className="text-2xl font-bold">الإعدادات</h2>
      </div>

      <Tabs defaultValue="company">
        <TabsList>
          <TabsTrigger value="company">معلومات الشركة</TabsTrigger>
          <TabsTrigger value="work">إعدادات العمل</TabsTrigger>
          <TabsTrigger value="display">المظهر</TabsTrigger>
        </TabsList>

        <TabsContent value="company" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Building2 className="h-5 w-5 text-emerald-600" /> معلومات الشركة</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveCompany} className="space-y-4 max-w-xl">
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>الاسم بالعربي</Label><Input name="name" defaultValue={company.name} required /></div>
                  <div><Label>الاسم بالإنجليزي</Label><Input name="nameEn" defaultValue={company.nameEn} /></div>
                </div>
                <div><Label>العنوان</Label><Input name="address" defaultValue={company.address || ''} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>الهاتف</Label><Input name="phone" defaultValue={company.phone || ''} /></div>
                  <div><Label>البريد الإلكتروني</Label><Input name="email" type="email" defaultValue={company.email || ''} /></div>
                </div>
                <div><Label>العملة</Label>
                  <Select name="currency" defaultValue={company.currency}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="JOD">دينار أردني (JOD)</SelectItem>
                      <SelectItem value="SAR">ريال سعودي (SAR)</SelectItem>
                      <SelectItem value="AED">درهم إماراتي (AED)</SelectItem>
                      <SelectItem value="EGP">جنيه مصري (EGP)</SelectItem>
                      <SelectItem value="USD">دولار أمريكي (USD)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <Save className="h-4 w-4 ml-2" />}
                  حفظ التغييرات
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="work" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Clock className="h-5 w-5 text-emerald-600" /> إعدادات العمل</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveWork} className="space-y-4 max-w-xl">
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>ساعات العمل اليومية</Label><Input type="number" name="workingHours" defaultValue={company.workingHours} step="0.5" min="1" max="12" required /></div>
                  <div><Label>معدل العمل الإضافي</Label><Input type="number" name="overtimeRate" defaultValue={company.overtimeRate} step="0.1" min="1" max="3" required /></div>
                </div>
                <div><Label>بداية السنة المالية</Label><Input name="fiscalYearStart" defaultValue={company.fiscalYearStart} placeholder="01-01" /></div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="text-sm font-medium mb-2">ملاحظات</h4>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• معدل العمل الإضافي: 1.5 يعني 150% من الراتب العادي</li>
                    <li>• ساعات العمل تُستخدم لحساب التأخير والمغادرة المبكرة</li>
                    <li>• بداية السنة المالية تحدد دورة الميزانية</li>
                  </ul>
                </div>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <Save className="h-4 w-4 ml-2" />}
                  حفظ التغييرات
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="display" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Palette className="h-5 w-5 text-emerald-600" /> إعدادات المظهر</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-w-xl">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    يمكنك تغيير المظهر بين الفاتح والداكن من زر القمر/الشمس في الشريط العلوي
                  </p>
                </div>
                <div>
                  <Label>لون النظام الأساسي</Label>
                  <div className="flex gap-3 mt-2">
                    {['emerald', 'teal', 'green', 'cyan'].map(color => (
                      <button key={color} className={`h-10 w-10 rounded-lg border-2 ${color === 'emerald' ? 'border-foreground' : 'border-transparent'}`} style={{ backgroundColor: color === 'emerald' ? '#10b981' : color === 'teal' ? '#14b8a6' : color === 'green' ? '#22c55e' : '#06b6d4' }} />
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
