import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import {
  suggestCategoryForTransaction,
  fetchUserSettings,
} from '@/lib/categoryInference';

type AutoCategorizeRequestBody = {
  walletId?: string | null;
};

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body: AutoCategorizeRequestBody = await request.json().catch(() => ({}));
    const walletId = body?.walletId || undefined;

    const transactionWhere: Record<string, unknown> = {
      userId: user.id,
      categoryId: null,
    };
    if (walletId) {
      transactionWhere.walletId = walletId;
    }

    const uncategorizedTransactions = await prisma.transaction.findMany({
      where: transactionWhere,
      orderBy: { date: 'desc' },
      take: 100,
    });

    const categories = await prisma.category.findMany({
      where: { userId: user.id },
    });

    const userSettings = await fetchUserSettings(user.id);

    let aiUsed = 0;
    let fallbackUsed = 0;
    let skipped = 0;
    const categorized: any[] = [];

    for (const transaction of uncategorizedTransactions) {
      if (!transaction.description) {
        skipped += 1;
        continue;
      }

      const { category, source } = await suggestCategoryForTransaction({
        userId: user.id,
        description: transaction.description,
        type: transaction.type as 'INCOME' | 'EXPENSE',
        categories,
        userSettings,
      });

      if (!category?.id) {
        skipped += 1;
        continue;
      }

      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { categoryId: category.id },
      });

      if (source === 'ai') {
        aiUsed += 1;
      } else if (source === 'fallback') {
        fallbackUsed += 1;
      }

      categorized.push({
        ...transaction,
        categoryId: category.id,
        category: {
          id: category.id,
          name: category.name,
          color: category.color,
          type: category.type,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Auto-categorized ${categorized.length} out of ${uncategorizedTransactions.length} transactions`,
      categorized,
      stats: {
        totalCandidates: uncategorizedTransactions.length,
        categorizedCount: categorized.length,
        aiUsed,
        fallbackUsed,
        skipped,
        aiEnabled: Boolean(userSettings?.provider && userSettings.apiKey),
      },
    });
  } catch (error) {
    console.error('Error during auto-categorization:', error);
    return NextResponse.json({ error: 'Failed to auto-categorize transactions' }, { status: 500 });
  }
}
