'use client';

import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  FileText,
  Scale,
  ArrowUpDown,
} from 'lucide-react';

const formatCurrency = (amount: number) => {
  return amount.toLocaleString('ar-JO') + ' د.أ';
};

interface Account {
  id: string;
  code: string;
  name: string;
  nameEn: string | null;
  type: string;
  category: string | null;
  balance: number;
  isActive: boolean;
}

interface Transaction {
  id: string;
  date: string;
  description: string | null;
  reference: string | null;
  debitAccountId: string;
  creditAccountId: string;
  amount: number;
  type: string;
  status: string;
  debitAccount: { id: string; code: string; name: string };
  creditAccount: { id: string; code: string; name: string };
}

interface TrialBalanceItem {
  id: string;
  code: string;
  name: string;
  nameEn: string | null;
  type: string;
  totalDebit: number;
  totalCredit: number;
  netBalance: number;
  debitBalance: number;
  creditBalance: number;
}

const accountTypeLabels: Record<string, string> = {
  asset: 'أصول',
  liability: 'التزامات',
  equity: 'حقوق ملكية',
  revenue: 'إيرادات',
  expense: 'مصروفات',
};

const accountTypeBadgeClass: Record<string, string> = {
  asset: 'bg-blue-100 text-blue-700',
  liability: 'bg-red-100 text-red-700',
  equity: 'bg-purple-100 text-purple-700',
  revenue: 'bg-emerald-100 text-emerald-700',
  expense: 'bg-orange-100 text-orange-700',
};

export function AccountingSection() {
  // Accounts state
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [accountForm, setAccountForm] = useState({
    code: '',
    name: '',
    nameEn: '',
    type: 'asset',
    category: '',
    balance: 0,
    isActive: true,
  });

  // Transactions state
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [txDialogOpen, setTxDialogOpen] = useState(false);
  const [txForm, setTxForm] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    reference: '',
    debitAccountId: '',
    creditAccountId: '',
    amount: '',
    type: 'general',
    status: 'posted',
  });

  // Trial balance state
  const [trialBalance, setTrialBalance] = useState<TrialBalanceItem[]>([]);
  const [trialTotals, setTrialTotals] = useState({ debit: 0, credit: 0, isBalanced: true });
  const [trialLoading, setTrialLoading] = useState(false);

  const fetchAccounts = useCallback(async () => {
    setAccountsLoading(true);
    try {
      const res = await fetch('/api/accounts');
      const data = await res.json();
      setAccounts(data.accounts);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    } finally {
      setAccountsLoading(false);
    }
  }, []);

  const fetchTransactions = useCallback(async () => {
    setTxLoading(true);
    try {
      const res = await fetch('/api/transactions');
      const data = await res.json();
      setTransactions(data.transactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setTxLoading(false);
    }
  }, []);

  const fetchTrialBalance = useCallback(async () => {
    setTrialLoading(true);
    try {
      const res = await fetch('/api/accounts/trial-balance');
      const data = await res.json();
      setTrialBalance(data.accounts || []);
      setTrialTotals(data.totals || { debit: 0, credit: 0, isBalanced: true });
    } catch (error) {
      console.error('Error fetching trial balance:', error);
    } finally {
      setTrialLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
    fetchTransactions();
    fetchTrialBalance();
  }, [fetchAccounts, fetchTransactions, fetchTrialBalance]);

  // Account CRUD
  const openAccountDialog = (acc?: Account) => {
    if (acc) {
      setEditingAccount(acc);
      setAccountForm({
        code: acc.code,
        name: acc.name,
        nameEn: acc.nameEn || '',
        type: acc.type,
        category: acc.category || '',
        balance: acc.balance,
        isActive: acc.isActive,
      });
    } else {
      setEditingAccount(null);
      setAccountForm({
        code: '',
        name: '',
        nameEn: '',
        type: 'asset',
        category: '',
        balance: 0,
        isActive: true,
      });
    }
    setAccountDialogOpen(true);
  };

  const saveAccount = async () => {
    try {
      if (editingAccount) {
        await fetch(`/api/accounts/${editingAccount.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(accountForm),
        });
      } else {
        await fetch('/api/accounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(accountForm),
        });
      }
      setAccountDialogOpen(false);
      fetchAccounts();
      fetchTrialBalance();
    } catch (error) {
      console.error('Error saving account:', error);
    }
  };

  const deleteAccount = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الحساب؟')) return;
    try {
      const res = await fetch(`/api/accounts/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'فشل في حذف الحساب');
      }
      fetchAccounts();
      fetchTrialBalance();
    } catch (error) {
      console.error('Error deleting account:', error);
    }
  };

  // Transaction CRUD
  const saveTransaction = async () => {
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(txForm),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'فشل في إنشاء القيد');
        return;
      }
      setTxDialogOpen(false);
      fetchTransactions();
      fetchAccounts();
      fetchTrialBalance();
    } catch (error) {
      console.error('Error saving transaction:', error);
    }
  };

  const deleteTransaction = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا القيد؟')) return;
    try {
      await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
      fetchTransactions();
      fetchAccounts();
      fetchTrialBalance();
    } catch (error) {
      console.error('Error deleting transaction:', error);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">المحاسبة</h2>
        <p className="text-muted-foreground text-sm">إدارة الحسابات والقيود المحاسبية</p>
      </div>

      <Tabs defaultValue="accounts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="accounts">دليل الحسابات</TabsTrigger>
          <TabsTrigger value="transactions">القيود المحاسبية</TabsTrigger>
          <TabsTrigger value="trial-balance">ميزان المراجعة</TabsTrigger>
        </TabsList>

        {/* Chart of Accounts Tab */}
        <TabsContent value="accounts">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-base">دليل الحسابات</CardTitle>
              <Button onClick={() => openAccountDialog()} size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="h-4 w-4 ml-1" />
                إضافة حساب
              </Button>
            </CardHeader>
            <CardContent>
              {accountsLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                </div>
              ) : (
                <ScrollArea className="max-h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">الرمز</TableHead>
                        <TableHead className="text-right">اسم الحساب</TableHead>
                        <TableHead className="text-right">النوع</TableHead>
                        <TableHead className="text-right">الفئة</TableHead>
                        <TableHead className="text-right">الرصيد</TableHead>
                        <TableHead className="text-right">نشط</TableHead>
                        <TableHead className="text-right">إجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {accounts.map(acc => (
                        <TableRow key={acc.id}>
                          <TableCell className="font-mono text-sm font-medium">{acc.code}</TableCell>
                          <TableCell className="font-medium">{acc.name}</TableCell>
                          <TableCell>
                            <Badge className={accountTypeBadgeClass[acc.type] || 'bg-gray-100 text-gray-700'}>
                              {accountTypeLabels[acc.type] || acc.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{acc.category || '—'}</TableCell>
                          <TableCell className={acc.balance >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                            {formatCurrency(Math.abs(acc.balance))}
                          </TableCell>
                          <TableCell>
                            <Badge className={acc.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}>
                              {acc.isActive ? 'نشط' : 'غير نشط'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => openAccountDialog(acc)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => deleteAccount(acc.id)} className="text-red-600 hover:text-red-700">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Journal Entries Tab */}
        <TabsContent value="transactions">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-base">القيود المحاسبية</CardTitle>
              <Button onClick={() => {
                setTxForm({
                  date: new Date().toISOString().split('T')[0],
                  description: '',
                  reference: '',
                  debitAccountId: '',
                  creditAccountId: '',
                  amount: '',
                  type: 'general',
                  status: 'posted',
                });
                setTxDialogOpen(true);
              }} size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="h-4 w-4 ml-1" />
                إضافة قيد
              </Button>
            </CardHeader>
            <CardContent>
              {txLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-40" />
                  <p className="text-lg font-medium">لا توجد قيود محاسبية</p>
                  <p className="text-sm">اضغط على &quot;إضافة قيد&quot; لإنشاء قيد محاسبي جديد</p>
                </div>
              ) : (
                <ScrollArea className="max-h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">التاريخ</TableHead>
                        <TableHead className="text-right">المرجع</TableHead>
                        <TableHead className="text-right">الوصف</TableHead>
                        <TableHead className="text-right">الحساب المدين</TableHead>
                        <TableHead className="text-right">الحساب الدائن</TableHead>
                        <TableHead className="text-right">المبلغ</TableHead>
                        <TableHead className="text-right">الحالة</TableHead>
                        <TableHead className="text-right">إجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map(tx => (
                        <TableRow key={tx.id}>
                          <TableCell className="text-sm">
                            {new Date(tx.date).toLocaleDateString('ar-JO')}
                          </TableCell>
                          <TableCell className="font-mono text-xs">{tx.reference || '—'}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{tx.description || '—'}</TableCell>
                          <TableCell>
                            <span className="text-blue-700 text-sm">{tx.debitAccount.name}</span>
                            <span className="text-xs text-muted-foreground block">{tx.debitAccount.code}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-red-700 text-sm">{tx.creditAccount.name}</span>
                            <span className="text-xs text-muted-foreground block">{tx.creditAccount.code}</span>
                          </TableCell>
                          <TableCell className="font-bold">{formatCurrency(tx.amount)}</TableCell>
                          <TableCell>
                            <Badge className={tx.status === 'posted'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-yellow-100 text-yellow-700'
                            }>
                              {tx.status === 'posted' ? 'مرحّل' : 'مسودة'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => deleteTransaction(tx.id)} className="text-red-600 hover:text-red-700">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trial Balance Tab */}
        <TabsContent value="trial-balance">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">ميزان المراجعة</CardTitle>
                <Badge className={trialTotals.isBalanced ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>
                  {trialTotals.isBalanced ? 'متوازن' : 'غير متوازن'}
                </Badge>
              </div>
              <Button onClick={fetchTrialBalance} variant="outline" size="sm">
                <ArrowUpDown className="h-4 w-4 ml-1" />
                تحديث
              </Button>
            </CardHeader>
            <CardContent>
              {trialLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                </div>
              ) : trialBalance.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Scale className="h-12 w-12 mx-auto mb-3 opacity-40" />
                  <p className="text-lg font-medium">لا توجد أرصدة</p>
                  <p className="text-sm">أضف قيوداً محاسبية لعرض ميزان المراجعة</p>
                </div>
              ) : (
                <ScrollArea className="max-h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">الرمز</TableHead>
                        <TableHead className="text-right">اسم الحساب</TableHead>
                        <TableHead className="text-right">النوع</TableHead>
                        <TableHead className="text-right">مدين</TableHead>
                        <TableHead className="text-right">دائن</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {trialBalance.map(item => (
                        <TableRow key={item.id}>
                          <TableCell className="font-mono text-sm">{item.code}</TableCell>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell>
                            <Badge className={accountTypeBadgeClass[item.type] || 'bg-gray-100 text-gray-700'}>
                              {accountTypeLabels[item.type] || item.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-blue-700 font-medium">
                            {item.debitBalance > 0 ? formatCurrency(item.debitBalance) : '—'}
                          </TableCell>
                          <TableCell className="text-red-700 font-medium">
                            {item.creditBalance > 0 ? formatCurrency(item.creditBalance) : '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableFooter>
                      <TableRow className="font-bold">
                        <TableCell colSpan={3} className="text-left text-base">الإجمالي</TableCell>
                        <TableCell className="text-blue-700 text-base">{formatCurrency(trialTotals.debit)}</TableCell>
                        <TableCell className="text-red-700 text-base">{formatCurrency(trialTotals.credit)}</TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Account Dialog */}
      <Dialog open={accountDialogOpen} onOpenChange={setAccountDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingAccount ? 'تعديل الحساب' : 'إضافة حساب جديد'}</DialogTitle>
            <DialogDescription>
              {editingAccount ? 'قم بتعديل بيانات الحساب' : 'أدخل بيانات الحساب الجديد'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>رمز الحساب</Label>
                <Input
                  value={accountForm.code}
                  onChange={e => setAccountForm(prev => ({ ...prev, code: e.target.value }))}
                  placeholder="مثال: 1100"
                />
              </div>
              <div className="space-y-2">
                <Label>نوع الحساب</Label>
                <Select value={accountForm.type} onValueChange={v => setAccountForm(prev => ({ ...prev, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asset">أصول</SelectItem>
                    <SelectItem value="liability">التزامات</SelectItem>
                    <SelectItem value="equity">حقوق ملكية</SelectItem>
                    <SelectItem value="revenue">إيرادات</SelectItem>
                    <SelectItem value="expense">مصروفات</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>اسم الحساب (عربي)</Label>
                <Input
                  value={accountForm.name}
                  onChange={e => setAccountForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="مثال: البنك"
                />
              </div>
              <div className="space-y-2">
                <Label>اسم الحساب (إنجليزي)</Label>
                <Input
                  value={accountForm.nameEn}
                  onChange={e => setAccountForm(prev => ({ ...prev, nameEn: e.target.value }))}
                  placeholder="e.g. Bank"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>الفئة</Label>
                <Input
                  value={accountForm.category}
                  onChange={e => setAccountForm(prev => ({ ...prev, category: e.target.value }))}
                  placeholder="اختياري"
                />
              </div>
              <div className="space-y-2">
                <Label>الرصيد الافتتاحي</Label>
                <Input
                  type="number"
                  value={accountForm.balance}
                  onChange={e => setAccountForm(prev => ({ ...prev, balance: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={accountForm.isActive}
                onChange={e => setAccountForm(prev => ({ ...prev, isActive: e.target.checked }))}
                className="rounded border-gray-300"
              />
              <span className="text-sm">حساب نشط</span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAccountDialogOpen(false)}>إلغاء</Button>
            <Button onClick={saveAccount} className="bg-emerald-600 hover:bg-emerald-700" disabled={!accountForm.code || !accountForm.name}>
              {editingAccount ? 'تحديث' : 'إضافة'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Transaction Dialog */}
      <Dialog open={txDialogOpen} onOpenChange={setTxDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>إضافة قيد محاسبي جديد</DialogTitle>
            <DialogDescription>أدخل بيانات القيد المحاسبي</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>التاريخ</Label>
                <Input
                  type="date"
                  value={txForm.date}
                  onChange={e => setTxForm(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>المرجع</Label>
                <Input
                  value={txForm.reference}
                  onChange={e => setTxForm(prev => ({ ...prev, reference: e.target.value }))}
                  placeholder="رقم المرجع"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>الوصف</Label>
              <Input
                value={txForm.description}
                onChange={e => setTxForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="وصف القيد"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>الحساب المدين</Label>
                <Select value={txForm.debitAccountId} onValueChange={v => setTxForm(prev => ({ ...prev, debitAccountId: v }))}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="اختر الحساب" /></SelectTrigger>
                  <SelectContent>
                    {accounts.filter(a => a.isActive).map(acc => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.code} - {acc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>الحساب الدائن</Label>
                <Select value={txForm.creditAccountId} onValueChange={v => setTxForm(prev => ({ ...prev, creditAccountId: v }))}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="اختر الحساب" /></SelectTrigger>
                  <SelectContent>
                    {accounts.filter(a => a.isActive).map(acc => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.code} - {acc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>المبلغ</Label>
                <Input
                  type="number"
                  value={txForm.amount}
                  onChange={e => setTxForm(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>الحالة</Label>
                <Select value={txForm.status} onValueChange={v => setTxForm(prev => ({ ...prev, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="posted">مرحّل</SelectItem>
                    <SelectItem value="draft">مسودة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTxDialogOpen(false)}>إلغاء</Button>
            <Button
              onClick={saveTransaction}
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={!txForm.debitAccountId || !txForm.creditAccountId || !txForm.amount || parseFloat(txForm.amount) <= 0}
            >
              إضافة القيد
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
