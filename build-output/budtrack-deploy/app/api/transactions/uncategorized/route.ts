import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET /api/transactions/uncategorized - Get all uncategorized transactions
export async function GET() {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get count of uncategorized transactions
    const count = await prisma.transaction.count({
      where: {
        userId: user.id,
        categoryId: null,
      },
    });

    // Get uncategorized transactions
    const transactions = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        categoryId: null,
      },
      orderBy: {
        date: 'desc',
      },
      take: 50, // Limit to 50 most recent
    });

    return NextResponse.json({ count, transactions });
  } catch (error) {
    console.error('Error fetching uncategorized transactions:', error);
    return NextResponse.json({ error: 'Failed to fetch uncategorized transactions' }, { status: 500 });
  }
} 