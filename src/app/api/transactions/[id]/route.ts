import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { date, description, reference, debitAccountId, creditAccountId, amount, type, status } = body;

    // Get the old transaction to reverse its effect on balances
    const oldTransaction = await db.transaction.findUnique({ where: { id } });
    if (!oldTransaction) {
      return NextResponse.json({ error: 'القيد المحاسبي غير موجود' }, { status: 404 });
    }

    // Reverse old balances
    const oldDebitAccount = await db.account.findUnique({ where: { id: oldTransaction.debitAccountId } });
    const oldCreditAccount = await db.account.findUnique({ where: { id: oldTransaction.creditAccountId } });

    if (oldDebitAccount) {
      await db.account.update({
        where: { id: oldTransaction.debitAccountId },
        data: { balance: oldDebitAccount.balance - oldTransaction.amount },
      });
    }
    if (oldCreditAccount) {
      await db.account.update({
        where: { id: oldTransaction.creditAccountId },
        data: { balance: oldCreditAccount.balance + oldTransaction.amount },
      });
    }

    // Update transaction
    const transaction = await db.transaction.update({
      where: { id },
      data: {
        ...(date !== undefined && { date: new Date(date) }),
        ...(description !== undefined && { description }),
        ...(reference !== undefined && { reference }),
        ...(debitAccountId !== undefined && { debitAccountId }),
        ...(creditAccountId !== undefined && { creditAccountId }),
        ...(amount !== undefined && { amount: parseFloat(amount) }),
        ...(type !== undefined && { type }),
        ...(status !== undefined && { status }),
      },
    });

    // Apply new balances
    const newDebitAccountId = debitAccountId || oldTransaction.debitAccountId;
    const newCreditAccountId = creditAccountId || oldTransaction.creditAccountId;
    const newAmount = amount ? parseFloat(amount) : oldTransaction.amount;

    const newDebitAccount = await db.account.findUnique({ where: { id: newDebitAccountId } });
    const newCreditAccount = await db.account.findUnique({ where: { id: newCreditAccountId } });

    if (newDebitAccount) {
      await db.account.update({
        where: { id: newDebitAccountId },
        data: { balance: newDebitAccount.balance + newAmount },
      });
    }
    if (newCreditAccount) {
      await db.account.update({
        where: { id: newCreditAccountId },
        data: { balance: newCreditAccount.balance - newAmount },
      });
    }

    return NextResponse.json({ transaction });
  } catch (error) {
    console.error('Transaction PUT error:', error);
    return NextResponse.json({ error: 'فشل في تحديث القيد المحاسبي' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const transaction = await db.transaction.findUnique({ where: { id } });
    if (!transaction) {
      return NextResponse.json({ error: 'القيد المحاسبي غير موجود' }, { status: 404 });
    }

    // Reverse balances
    const debitAccount = await db.account.findUnique({ where: { id: transaction.debitAccountId } });
    const creditAccount = await db.account.findUnique({ where: { id: transaction.creditAccountId } });

    if (debitAccount) {
      await db.account.update({
        where: { id: transaction.debitAccountId },
        data: { balance: debitAccount.balance - transaction.amount },
      });
    }
    if (creditAccount) {
      await db.account.update({
        where: { id: transaction.creditAccountId },
        data: { balance: creditAccount.balance + transaction.amount },
      });
    }

    await db.transaction.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Transaction DELETE error:', error);
    return NextResponse.json({ error: 'فشل في حذف القيد المحاسبي' }, { status: 500 });
  }
}
