'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Bell, Info, AlertTriangle, AlertCircle, CheckCircle, Trash2, CheckCheck } from 'lucide-react';
import { toast } from 'sonner';

interface Notification {
  id: string; title: string; message: string; type: string; category: string;
  isRead: boolean; createdAt: string;
}

const typeIcons: Record<string, React.ReactNode> = {
  info: <Info className="h-5 w-5 text-blue-500" />,
  warning: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
  error: <AlertCircle className="h-5 w-5 text-red-500" />,
  success: <CheckCircle className="h-5 w-5 text-emerald-500" />,
};

const typeBg: Record<string, string> = {
  info: 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900',
  warning: 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900',
  error: 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900',
  success: 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900',
};

const categoryMap: Record<string, string> = {
  system: 'النظام',
  payroll: 'الرواتب',
  attendance: 'الحضور',
  leave: 'الإجازات',
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'الآن';
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `منذ ${days} يوم`;
  return new Date(dateStr).toLocaleDateString('ar-JO');
}

export function NotificationsSection() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const fetchNotifications = async () => {
    const params = new URLSearchParams();
    if (filter !== 'all' && filter !== 'unread') params.set('category', filter);
    if (filter === 'unread') params.set('isRead', 'false');
    const res = await fetch(`/api/notifications?${params}`);
    const data = await res.json();
    setNotifications(data.notifications || data);
  };

  useEffect(() => {
    const params = new URLSearchParams();
    if (filter !== 'all' && filter !== 'unread') params.set('category', filter);
    if (filter === 'unread') params.set('isRead', 'false');
    fetch(`/api/notifications?${params}`)
      .then(r => r.json())
      .then(data => {
        setNotifications(data.notifications || data);
        setLoading(false);
      });
  }, [filter]);

  const markAsRead = async (id: string) => {
    await fetch(`/api/notifications/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isRead: true }) });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const markAllRead = async () => {
    await fetch('/api/notifications/mark-all-read', { method: 'POST' });
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    toast.success('تم تحديد الكل كمقروء');
  };

  const deleteNotification = async (id: string) => {
    await fetch(`/api/notifications/${id}`, { method: 'DELETE' });
    setNotifications(prev => prev.filter(n => n.id !== id));
    toast.success('تم حذف التنبيه');
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (loading) return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>;

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="h-7 w-7 text-emerald-600" />
          <div>
            <h2 className="text-2xl font-bold">التنبيهات</h2>
            {unreadCount > 0 && <p className="text-sm text-muted-foreground">{unreadCount} تنبيه غير مقروء</p>}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={markAllRead}><CheckCheck className="h-4 w-4 ml-1" /> تحديد الكل كمقروء</Button>
        </div>
      </div>

      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList>
          <TabsTrigger value="all">الكل</TabsTrigger>
          <TabsTrigger value="unread">غير مقروء</TabsTrigger>
          <TabsTrigger value="system">النظام</TabsTrigger>
          <TabsTrigger value="payroll">الرواتب</TabsTrigger>
          <TabsTrigger value="attendance">الحضور</TabsTrigger>
          <TabsTrigger value="leave">الإجازات</TabsTrigger>
        </TabsList>
      </Tabs>

      <ScrollArea className="h-[calc(100vh-280px)]">
        {notifications.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Bell className="h-16 w-16 mx-auto mb-4 opacity-20" />
            <p className="text-lg">لا توجد تنبيهات</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map(n => (
              <Card key={n.id} className={`border transition-all ${n.isRead ? 'opacity-60' : ''} ${typeBg[n.type] || 'bg-card'}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 mt-0.5">{typeIcons[n.type] || <Bell className="h-5 w-5" />}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{n.title}</p>
                        {!n.isRead && <div className="h-2 w-2 rounded-full bg-blue-500" />}
                        <Badge variant="outline" className="text-[10px] mr-auto">{categoryMap[n.category] || n.category}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{n.message}</p>
                      <p className="text-xs text-muted-foreground mt-2">{timeAgo(n.createdAt)}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {!n.isRead && (
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => markAsRead(n.id)}>
                          <CheckCheck className="h-4 w-4" />
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500" onClick={() => deleteNotification(n.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
