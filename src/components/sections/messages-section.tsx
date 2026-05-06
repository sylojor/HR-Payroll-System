'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, MessageSquare, Plus, Send, User } from 'lucide-react';
import { toast } from 'sonner';

interface Message {
  id: string; sender: { firstName: string; lastName: string }; subject: string; content: string;
  priority: string; isBroadcast: boolean; createdAt: string;
  recipients: { employee: { firstName: string; lastName: string }; isRead: boolean }[];
}

interface Employee { id: string; firstName: string; lastName: string; employeeId: string }

const priorityMap: Record<string, { label: string; className: string }> = {
  normal: { label: 'عادي', className: 'bg-gray-100 text-gray-700' },
  urgent: { label: 'عاجل', className: 'bg-red-100 text-red-700' },
  important: { label: 'مهم', className: 'bg-amber-100 text-amber-700' },
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'الآن';
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  return `منذ ${days} يوم`;
}

export function MessagesSection() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCompose, setShowCompose] = useState(false);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [isBroadcast, setIsBroadcast] = useState(false);

  const fetchMessages = async () => {
    const res = await fetch('/api/messages');
    const data = await res.json();
    setMessages(data.messages || data);
    if (!selectedId && (data.messages || data).length > 0) {
      setSelectedId((data.messages || data)[0].id);
    }
  };

  const fetchEmployees = async () => {
    const res = await fetch('/api/employees?limit=100');
    const data = await res.json();
    setEmployees(data.employees || []);
  };

  useEffect(() => {
    Promise.all([
      fetch('/api/messages').then(r => r.json()),
      fetch('/api/employees?limit=100').then(r => r.json()),
    ]).then(([messagesData, empData]) => {
      setMessages(messagesData.messages || messagesData);
      if ((messagesData.messages || messagesData).length > 0) {
        setSelectedId((messagesData.messages || messagesData)[0].id);
      }
      setEmployees(empData.employees || []);
      setLoading(false);
    });
  }, []);

  const selectedMessage = messages.find(m => m.id === selectedId);

  const handleSend = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body = {
      senderId: employees[0]?.id, // In real app, current user
      subject: fd.get('subject'),
      content: fd.get('content'),
      recipientIds: isBroadcast ? employees.map(e => e.id) : selectedRecipients,
      priority: fd.get('priority'),
      isBroadcast,
    };
    await fetch('/api/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    toast.success('تم إرسال الرسالة');
    setShowCompose(false);
    setSelectedRecipients([]);
    setIsBroadcast(false);
    fetchMessages();
  };

  const handleSelectMessage = async (id: string) => {
    setSelectedId(id);
    // Mark as read
    await fetch(`/api/messages/${id}/read`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ employeeId: employees[0]?.id }) });
  };

  if (loading) return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>;

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MessageSquare className="h-7 w-7 text-emerald-600" />
          <h2 className="text-2xl font-bold">الرسائل</h2>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setShowCompose(true)}>
          <Plus className="h-4 w-4 ml-2" /> رسالة جديدة
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 h-[calc(100vh-200px)]">
        {/* Message List */}
        <Card className="lg:col-span-2 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="divide-y">
              {messages.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">لا توجد رسائل</div>
              ) : messages.map(m => (
                <button
                  key={m.id}
                  onClick={() => handleSelectMessage(m.id)}
                  className={`w-full text-right p-3 hover:bg-muted/50 transition-colors ${selectedId === m.id ? 'bg-emerald-50 dark:bg-emerald-950/30' : ''}`}
                >
                  <div className="flex items-start gap-2">
                    <div className="h-2.5 w-2.5 rounded-full mt-2 shrink-0">
                      {m.recipients.some(r => !r.isRead) && <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium truncate">{m.sender.firstName} {m.sender.lastName}</p>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">{timeAgo(m.createdAt)}</span>
                      </div>
                      <p className="text-sm truncate">{m.subject}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {m.isBroadcast && <Badge className="bg-violet-100 text-violet-700 text-[10px]">إذاعة</Badge>}
                        <Badge className={priorityMap[m.priority]?.className + ' text-[10px]'}>{priorityMap[m.priority]?.label}</Badge>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </Card>

        {/* Message Detail */}
        <Card className="lg:col-span-3 overflow-hidden">
          {selectedMessage ? (
            <div className="h-full flex flex-col">
              <div className="p-4 border-b">
                <h3 className="font-bold text-lg">{selectedMessage.subject}</h3>
                <div className="flex items-center gap-3 mt-2">
                  <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold">
                    {selectedMessage.sender.firstName[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{selectedMessage.sender.firstName} {selectedMessage.sender.lastName}</p>
                    <p className="text-xs text-muted-foreground">{timeAgo(selectedMessage.createdAt)}</p>
                  </div>
                  <div className="flex-1" />
                  <Badge className={priorityMap[selectedMessage.priority]?.className}>{priorityMap[selectedMessage.priority]?.label}</Badge>
                </div>
              </div>
              <ScrollArea className="flex-1 p-4">
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{selectedMessage.content}</p>
              </ScrollArea>
              <div className="p-3 border-t bg-muted/30">
                <p className="text-xs text-muted-foreground">
                  المستلمون: {selectedMessage.isBroadcast ? 'جميع الموظفين' : selectedMessage.recipients.map(r => `${r.employee.firstName} ${r.employee.lastName}`).join('، ')}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <p>اختر رسالة لعرضها</p>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Compose Dialog */}
      <Dialog open={showCompose} onOpenChange={setShowCompose}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>رسالة جديدة</DialogTitle></DialogHeader>
          <form onSubmit={handleSend} className="space-y-4">
            <div><Label>الموضوع</Label><Input name="subject" required /></div>
            <div><Label>المحتوى</Label><Textarea name="content" rows={5} required /></div>
            <div><Label>الأولوية</Label><Select name="priority" defaultValue="normal"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="normal">عادي</SelectItem><SelectItem value="important">مهم</SelectItem><SelectItem value="urgent">عاجل</SelectItem></SelectContent></Select></div>
            <div className="flex items-center gap-3">
              <Label>إرسال للجميع</Label>
              <input type="checkbox" checked={isBroadcast} onChange={e => setIsBroadcast(e.target.checked)} className="h-4 w-4" />
            </div>
            {!isBroadcast && (
              <div>
                <Label>المستلمون</Label>
                <div className="max-h-40 overflow-y-auto border rounded-lg p-2 space-y-1 mt-1">
                  {employees.map(e => (
                    <label key={e.id} className="flex items-center gap-2 p-1.5 hover:bg-muted/50 rounded cursor-pointer">
                      <input type="checkbox" checked={selectedRecipients.includes(e.id)} onChange={ev => {
                        if (ev.target.checked) setSelectedRecipients(prev => [...prev, e.id]);
                        else setSelectedRecipients(prev => prev.filter(id => id !== e.id));
                      }} className="h-4 w-4" />
                      <span className="text-sm">{e.firstName} {e.lastName}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700"><Send className="h-4 w-4 ml-2" /> إرسال</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
