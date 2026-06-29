import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const walletId = request.nextUrl.searchParams.get('walletId');
  if (!walletId) {
    return NextResponse.json({ error: 'walletId is required' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const wallet = await prisma.wallet.findFirst({
    where: { id: walletId, userId: user.id },
    select: { id: true, name: true, balance: true },
  });
  if (!wallet) return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [transactions, budgets] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId: user.id, walletId, date: { gte: start, lt: end } },
      include: { category: { select: { name: true } } },
      orderBy: { date: 'desc' },
    }),
    prisma.budget.findMany({
      where: {
        userId: user.id,
        walletId,
        startDate: { lte: end },
        endDate: { gte: start },
      },
      select: { amount: true, spent: true },
    }),
  ]);

  const expenses = transactions.filter((tx) => tx.type === 'EXPENSE');
  const income = transactions.filter((tx) => tx.type === 'INCOME');
  const totalExpense = expenses.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
  const totalIncome = income.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

  const categoryTotals = new Map<string, number>();
  for (const tx of expenses) {
    const name = tx.category?.name ?? 'Uncategorized';
    categoryTotals.set(name, (categoryTotals.get(name) ?? 0) + Math.abs(tx.amount));
  }

  const top = [...categoryTotals.entries()].sort((a, b) => b[1] - a[1])[0];
  const topCategory = top ? {
    name: top[0],
    amount: top[1],
    percent: totalExpense > 0 ? (top[1] / totalExpense) * 100 : 0,
  } : undefined;

  const budgetAmount = budgets.reduce((sum, budget) => sum + budget.amount, 0);
  const budgetSpent = budgets.reduce((sum, budget) => sum + budget.spent, 0);
  const budgetRatio = budgetAmount > 0 ? (budgetSpent / budgetAmount) * 100 : 0;
  const budgetStatus = budgetAmount <= 0 ? 'unknown' : budgetRatio >= 100 ? 'over' : budgetRatio >= 80 ? 'near' : 'under';

  const debtExpense = [...categoryTotals.entries()]
    .filter(([name]) => /debt|utang|loan|cicilan|pinjaman/i.test(name))
    .reduce((sum, [, amount]) => sum + amount, 0);
  const debtRatio = totalExpense > 0 ? (debtExpense / totalExpense) * 100 : 0;
  const debtRisk = debtRatio >= 50 ? 'critical' : debtRatio >= 25 ? 'warning' : 'none';

  return NextResponse.json({
    walletId: wallet.id,
    walletName: wallet.name,
    monthLabel: new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(now),
    dataFreshness: new Date().toISOString(),
    totalIncome,
    totalExpense,
    balance: wallet.balance,
    transactionCount: transactions.length,
    topCategory,
    safeToSpend: wallet.balance,
    debtRisk,
    budgetStatus,
  });
}
