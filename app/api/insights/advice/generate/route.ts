import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateAIResponse } from '@/lib/ai';

type AdvicePriority = 'high' | 'medium' | 'low';
type AdviceType = 'saving' | 'budgeting' | 'investment' | 'general';

interface AdvicePayload {
  title: string;
  description: string;
  type: AdviceType;
  priority: AdvicePriority;
  estimatedImpact?: number | null;
}

function getTimeframeRange(timeframe: string) {
  const now = new Date();
  switch (timeframe) {
    case 'year':
      return { start: new Date(now.getFullYear(), 0, 1), end: now };
    case 'quarter': {
      const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
      return { start: new Date(now.getFullYear(), quarterStartMonth, 1), end: now };
    }
    case 'month':
    default:
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now };
  }
}

function monthsInTimeframe(timeframe: string) {
  switch (timeframe) {
    case 'year':
      return 12;
    case 'quarter':
      return 3;
    case 'month':
    default:
      return 1;
  }
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(
    Math.round(value)
  );

function buildFallbackAdvices(options: {
  timeframe: string;
  netSavings: number;
  totalIncome: number;
  totalExpense: number;
  averageMonthlyExpense: number;
  totalWalletBalance: number;
  topExpenseCategory?: { name: string; amount: number };
}) {
  const advices: AdvicePayload[] = [];
  const { timeframe, netSavings, totalIncome, totalExpense, averageMonthlyExpense, totalWalletBalance, topExpenseCategory } = options;
  const timeframeLabel = timeframe === 'year' ? 'tahun' : timeframe === 'quarter' ? 'kuartal' : 'bulan';
  
  if (netSavings < 0) {
    advices.push({
      title: 'Stabilize Cashflow ASAP',
      description: `Pengeluaran ${timeframeLabel} ini lebih tinggi dari pemasukan. Trim biaya di kategori ${topExpenseCategory?.name || 'utama'} dan set limit baru supaya cashflow balik positif.`,
      type: 'budgeting',
      priority: 'high',
      estimatedImpact: Math.min(Math.abs(netSavings), totalExpense * 0.25)
    });
  } else {
    advices.push({
      title: 'Lock-in Your Surplus',
      description: `Kamu surplus ${formatCurrency(netSavings)} ${timeframeLabel} ini. Langsung parkirkan ke rekening khusus/tabungan otomatis biar nggak keburu kepakai.`,
      type: 'saving',
      priority: 'medium',
      estimatedImpact: netSavings * 0.5
    });
  }

  const emergencyTarget = averageMonthlyExpense * 3;
  if (totalWalletBalance < emergencyTarget) {
    advices.push({
      title: 'Boost Emergency Cushion',
      description: `Emergency fund baru ${formatCurrency(totalWalletBalance)}. Coba kejar ${formatCurrency(emergencyTarget)} (≈3x pengeluaran bulanan) biar aman kalau ada kejadian mendadak.`,
      type: 'saving',
      priority: netSavings < 0 ? 'medium' : 'high',
      estimatedImpact: emergencyTarget - totalWalletBalance
    });
  }

  advices.push({
    title: 'Automate Your Savings',
    description: `Atur auto-debit ${formatCurrency(Math.max(Math.abs(totalIncome) * 0.1, 500000))} tiap gajian ke rekening berbeda. Biar progress tabungan jalan tanpa perlu mikir.`,
    type: 'saving',
    priority: 'medium',
    estimatedImpact: Math.max(Math.abs(totalIncome) * 0.1, 500000)
  });

  if (advices.length > 3) {
    return advices.slice(0, 3);
  }

  return advices;
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const timeframe = searchParams.get('timeframe') || 'month';
  const walletId = searchParams.get('walletId') || undefined;

  try {
    const timeframeRange = getTimeframeRange(timeframe);

    const transactions = await prisma.transaction.findMany({
      where: {
        userId: session.user.id,
        ...(walletId ? { walletId } : {}),
        date: {
          gte: timeframeRange.start,
          lte: timeframeRange.end,
        },
      },
      include: {
        category: true,
      },
      orderBy: {
        date: 'desc',
      },
    });

    const wallets = await prisma.wallet.findMany({
      where: {
        userId: session.user.id,
        ...(walletId ? { id: walletId } : {}),
      },
    });

    const budgets = await prisma.budget.findMany({
      where: {
        userId: session.user.id,
        ...(walletId ? { walletId } : {}),
      },
    });

    const totalIncome = transactions
      .filter(tx => tx.type === 'INCOME')
      .reduce((sum, tx) => sum + tx.amount, 0);

    const totalExpense = transactions
      .filter(tx => tx.type === 'EXPENSE')
      .reduce((sum, tx) => sum + tx.amount, 0);

    const netSavings = totalIncome - totalExpense;

    const expenseByCategory = transactions
      .filter(tx => tx.type === 'EXPENSE')
      .reduce<Record<string, number>>((acc, tx) => {
        const key = tx.category?.name || 'Other';
        acc[key] = (acc[key] || 0) + tx.amount;
        return acc;
      }, {});

    const topExpenseCategoryEntry = Object.entries(expenseByCategory)
      .sort((a, b) => b[1] - a[1])[0];

    const topExpenseCategory = topExpenseCategoryEntry
      ? { name: topExpenseCategoryEntry[0], amount: topExpenseCategoryEntry[1] }
      : undefined;

    const totalWalletBalance = wallets.reduce((sum, wallet) => sum + wallet.balance, 0);
    const months = monthsInTimeframe(timeframe);
    const averageMonthlyExpense = months > 0 ? totalExpense / months : totalExpense;

    const userSettings = await prisma.userSettings.findUnique({
      where: { userId: session.user.id },
    });

    const deleteFilter: Record<string, unknown> = {
      userId: session.user.id,
      timeframe,
    };

    if (walletId) {
      deleteFilter.walletId = walletId;
    } else {
      deleteFilter.walletId = null;
    }

    await prisma.financialAdvice.deleteMany({ where: deleteFilter });

    const strongStats = {
      timeframe,
      netSavings,
      totalIncome,
      totalExpense,
      averageMonthlyExpense,
      totalWalletBalance,
      topExpenseCategory,
    };

    const baseAdvices = await (async () => {
      if (!userSettings?.provider || !userSettings.apiKey || !userSettings.selectedModel) {
        return { source: 'fallback' as const, advices: buildFallbackAdvices(strongStats) };
      }

      const prompt = `You are a personal finance coach. Generate 3 tailored financial action items for the user based on their recent data.
Each item must be a JSON object with:
{
  "title": string,
  "description": string,
  "type": "saving"|"budgeting"|"investment"|"general",
  "priority": "high"|"medium"|"low",
  "estimatedImpact": number
}

Context:
- Timeframe: ${timeframe}
- Wallet filter: ${walletId || 'All wallets'}
- Total income: ${totalIncome.toFixed(2)}
- Total expense: ${totalExpense.toFixed(2)}
- Net savings: ${netSavings.toFixed(2)}
- Top expense category: ${topExpenseCategory?.name || 'Unknown'} (${topExpenseCategory ? topExpenseCategory.amount.toFixed(2) : 0})
- Active budgets: ${budgets.length}
- Wallet balance total: ${totalWalletBalance.toFixed(2)}

Return ONLY valid JSON array (no commentary).`;

      try {
        const aiResponseText = await generateAIResponse({
          prompt,
          provider: userSettings.provider,
          apiKey: userSettings.apiKey,
          model: userSettings.selectedModel,
        });

        const parsed = JSON.parse(aiResponseText);
        if (Array.isArray(parsed)) {
          const normalized = parsed
            .slice(0, 3)
            .map((item) => ({
              title: typeof item.title === 'string' ? item.title : 'Financial Advice',
              description: typeof item.description === 'string' ? item.description : '',
              type: ['saving', 'budgeting', 'investment', 'general'].includes(
                (item.type || '').toLowerCase()
              )
                ? (item.type || 'general').toLowerCase()
                : 'general',
              priority: ['high', 'medium', 'low'].includes((item.priority || '').toLowerCase())
                ? (item.priority || 'medium').toLowerCase()
                : 'medium',
              estimatedImpact:
                typeof item.estimatedImpact === 'number' ? item.estimatedImpact : null,
            }));

          if (normalized.length > 0) {
            return { source: 'ai' as const, advices: normalized };
          }
        }
      } catch (error) {
        console.warn('AI advice generation failed, falling back to heuristics:', error);
      }

      return { source: 'fallback' as const, advices: buildFallbackAdvices(strongStats) };
    })();

    const created = await Promise.all(
      baseAdvices.advices.map((item) =>
        prisma.financialAdvice.create({
          data: {
            userId: session.user.id,
            title: item.title,
            description: item.description,
            type: item.type,
            priority: item.priority,
            estimatedImpact: item.estimatedImpact ?? null,
            timeframe,
            walletId,
          },
        })
      )
    );

    return NextResponse.json({
      source: baseAdvices.source,
      count: created.length,
    });
  } catch (error) {
    console.error('Error generating advice:', error);
    return NextResponse.json({ error: 'Failed to generate advice' }, { status: 500 });
  }
}
