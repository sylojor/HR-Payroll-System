import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status');

    const where: Record<string, unknown> = {};
    if (startDate || endDate) {
      where.date = {};
      if (startDate) (where.date as Record<string, unknown>).gte = new Date(startDate);
      if (endDate) (where.date as Record<string, unknown>).lte = new Date(endDate);
    }
    if (status && status !== 'all') {
      where.status = status;
    }

    const transactions = await db.transaction.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        debitAccount: { select: { id: true, code: true, name: true } },
        creditAccount: { select: { id: true, code: true, name: true } },
      },
    });

    return NextResponse.json({ transactions });
  } catch (error) {
    console.error('Transactions GET error:', error);
    return NextResponse.json({ error: 'فشل في جلب القيود المحاسبية' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { date, description, reference, debitAccountId, creditAccountId, amount, type, status } = body;

    if (!debitAccountId || !creditAccountId || !amount || amount <= 0) {
      return NextResponse.json({ error: 'الحساب المدين والحساب الدائن والمبلغ مطلوبون' }, { status: 400 });
    }

    if (debitAccountId === creditAccountId) {
      return NextResponse.json({ error: 'لا يمكن أن يكون الحساب المدين والدائن نفس الحساب' }, { status: 400 });
    }

    const transaction = await db.transaction.create({
      data: {
        date: date ? new Date(date) : new Date(),
        description: description || null,
        reference: reference || null,
        debitAccountId,
        creditAccountId,
        amount: parseFloat(amount),
        type: type || 'general',
        status: status || 'posted',
      },
      include: {
        debitAccount: { select: { code: true, name: true } },
        creditAccount: { select: { code: true, name: true } },
      },
    });

    // Update account balances
    // Debit account: increase for assets/expenses, decrease for liabilities/equity/revenue
    const debitAccount = await db.account.findUnique({ where: { id: debitAccountId } });
    const creditAccount = await db.account.findUnique({ where: { id: creditAccountId } });

    if (debitAccount && creditAccount) {
      const amt = parseFloat(amount);

      // For debit account: add to balance
      await db.account.update({
        where: { id: debitAccountId },
        data: { balance: debitAccount.balance + amt },
      });

      // For credit account: subtract from balance
      await db.account.update({
        where: { id: creditAccountId },
        data: { balance: creditAccount.balance - amt },
      });
    }

    return NextResponse.json({ transaction });
  } catch (error) {
    console.error('Transaction POST error:', error);
    return NextResponse.json({ error: 'فشل في إنشاء القيد المحاسبي' }, { status: 500 });
  }
}
