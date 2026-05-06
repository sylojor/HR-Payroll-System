import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const accounts = await db.account.findMany({
      where: { isActive: true },
      orderBy: { code: 'asc' },
      include: {
        debitTransactions: { select: { amount: true } },
        creditTransactions: { select: { amount: true } },
      },
    });

    const trialBalance = accounts.map(account => {
      const totalDebit = account.debitTransactions.reduce((sum, t) => sum + t.amount, 0);
      const totalCredit = account.creditTransactions.reduce((sum, t) => sum + t.amount, 0);
      const netBalance = totalDebit - totalCredit;

      return {
        id: account.id,
        code: account.code,
        name: account.name,
        nameEn: account.nameEn,
        type: account.type,
        totalDebit: Math.round(totalDebit * 100) / 100,
        totalCredit: Math.round(totalCredit * 100) / 100,
        netBalance: Math.round(netBalance * 100) / 100,
        // For trial balance: asset/expense have debit nature, liability/equity/revenue have credit nature
        debitBalance: netBalance > 0 ? Math.round(netBalance * 100) / 100 : 0,
        creditBalance: netBalance < 0 ? Math.round(Math.abs(netBalance) * 100) / 100 : 0,
      };
    });

    const totalDebit = trialBalance.reduce((sum, a) => sum + a.debitBalance, 0);
    const totalCredit = trialBalance.reduce((sum, a) => sum + a.creditBalance, 0);

    return NextResponse.json({
      accounts: trialBalance,
      totals: {
        debit: Math.round(totalDebit * 100) / 100,
        credit: Math.round(totalCredit * 100) / 100,
        isBalanced: Math.abs(totalDebit - totalCredit) < 0.01,
      },
    });
  } catch (error) {
    console.error('Trial balance GET error:', error);
    return NextResponse.json({ error: 'فشل في جلب ميزان المراجعة' }, { status: 500 });
  }
}
