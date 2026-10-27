import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { calculateGoalReserve, calculateMonthlySafeToSpend, calculateRemainingBudget, calculateTransactionBalance } from '@/lib/safeToSpendSummary';
import { listSharedBills } from '@/lib/shared-bills/shared-bill-service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const walletId = request.nextUrl.searchParams.get('walletId');

  const user = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  // Mode "Semua Dompet": walletId kosong = agregasi seluruh wallet user.
  let wallet: { id: string | null; name: string; balance: number };
  let walletFilter: { walletId?: string | { in: string[] } };

  if (walletId) {
    const found = await prisma.wallet.findFirst({
      where: { id: walletId, userId: user.id },
      select: { id: true, name: true, balance: true },
    });
    if (!found) return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    wallet = found;
    walletFilter = { walletId };
  } else {
    const wallets = await prisma.wallet.findMany({
      where: { userId: user.id },
      select: { id: true, balance: true },
    });
    if (wallets.length === 0) {
      return NextResponse.json({ error: 'No wallets found' }, { status: 404 });
    }
    wallet = {
      id: null,
      name: 'Semua Dompet',
      balance: wallets.reduce((sum, w) => sum + w.balance, 0),
    };
    walletFilter = { walletId: { in: wallets.map((w) => w.id) } };
  }

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [transactions, budgets, goals, sharedBills, incomeSum, expenseSum] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId: user.id, ...walletFilter, date: { gte: start, lt: end } },
      include: { category: { select: { name: true } } },
      orderBy: { date: 'desc' },
    }),
    prisma.budget.findMany({
      where: {
        userId: user.id,
        ...walletFilter,
        startDate: { lte: end },
        endDate: { gte: start },
      },
      select: { amount: true, spent: true },
    }),
    prisma.goal.findMany({
      where: { userId: user.id, isArchived: false, status: { not: 'COMPLETED' } },
      select: { target: true, current: true },
    }),
    listSharedBills(user.id, walletId ? { walletId } : {}),
    prisma.transaction.aggregate({
      where: { userId: user.id, ...walletFilter, type: { in: ['income', 'INCOME'] } },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { userId: user.id, ...walletFilter, type: { in: ['expense', 'EXPENSE'] } },
      _sum: { amount: true },
    }),
  ]);

  const calculatedBalance = calculateTransactionBalance({
    totalIncome: incomeSum._sum?.amount || 0,
    totalExpense: expenseSum._sum?.amount || 0,
  });
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
  const remainingGoalAmount = goals.reduce((sum, goal) => sum + Math.max((goal.target || 0) - (goal.current || 0), 0), 0);
  const goalReserve = calculateGoalReserve({ balance: calculatedBalance, remainingGoalAmount });
  const outstandingBills = sharedBills.reduce((sum, bill) => {
    const paidAmount = bill.participants.reduce((paid, participant) => paid + participant.paidAmount, 0);
    return sum + Math.max(0, bill.totalAmount - paidAmount);
  }, 0);
  // calculatedBalance is already net of this month's expenses; only reserve
  // what is still budgeted-but-unspent.
  const safeToSpend = calculateMonthlySafeToSpend({
    balance: calculatedBalance,
    remainingBudget: calculateRemainingBudget(budgets),
    outstandingBills,
    goalReserve,
  });

  return NextResponse.json({
    walletId: wallet.id,
    walletName: wallet.name,
    monthLabel: new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(now),
    dataFreshness: new Date().toISOString(),
    totalIncome,
    totalExpense,
    balance: calculatedBalance,
    transactionCount: transactions.length,
    topCategory,
    safeToSpend,
    debtRisk,
    budgetStatus,
  });
}
