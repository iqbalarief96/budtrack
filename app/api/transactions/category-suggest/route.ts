import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import {
  suggestCategoryForTransaction,
  fetchUserSettings,
  fetchUserCategories,
} from '@/lib/categoryInference';

type SuggestRequest = {
  description?: string;
  type?: 'INCOME' | 'EXPENSE';
  walletId?: string | null;
};

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: SuggestRequest = await request.json().catch(() => ({}));

    if (!body.description || !body.type) {
      return NextResponse.json(
        { error: 'description and type are required' },
        { status: 400 }
      );
    }

    if (!['INCOME', 'EXPENSE'].includes(body.type)) {
      return NextResponse.json({ error: 'Invalid transaction type' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const [categories, userSettings] = await Promise.all([
      fetchUserCategories(user.id),
      fetchUserSettings(user.id),
    ]);

    const { category, source } = await suggestCategoryForTransaction({
      userId: user.id,
      description: body.description,
      type: body.type,
      categories,
      userSettings,
    });

    if (!category) {
      return NextResponse.json({ suggestion: null, source });
    }

    return NextResponse.json({
      suggestion: {
        id: category.id,
        name: category.name,
        type: category.type,
        color: category.color,
      },
      source,
    });
  } catch (error) {
    console.error('Error suggesting category:', error);
    return NextResponse.json(
      { error: 'Failed to suggest category', suggestion: null, source: 'none' },
      { status: 500 }
    );
  }
}
