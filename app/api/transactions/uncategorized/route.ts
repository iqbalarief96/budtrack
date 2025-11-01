import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET /api/transactions/uncategorized - Get uncategorized transactions (optionally filtered by wallet)
export async function GET(request: Request) {
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

    const url = new URL(request.url);
    const walletId = url.searchParams.get('walletId') || undefined;

    const baseWhere: Record<string, unknown> = {
      userId: user.id,
      categoryId: null,
    };

    if (walletId) {
      baseWhere.walletId = walletId;
    }

    const count = await prisma.transaction.count({
      where: baseWhere,
    });

    const transactions = await prisma.transaction.findMany({
      where: baseWhere,
      orderBy: { date: 'desc' },
      take: 50,
    });

    return NextResponse.json({ count, transactions });
  } catch (error) {
    console.error('Error fetching uncategorized transactions:', error);
    return NextResponse.json({ error: 'Failed to fetch uncategorized transactions' }, { status: 500 });
  }
} 
