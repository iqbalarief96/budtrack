import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { goalId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { goalId } = params;

    // Verify goal belongs to user
    const goal = await prisma.goal.findFirst({
      where: {
        id: goalId,
        userId: session.user.id
      }
    });

    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    // Fetch tracked categories for this goal
    const trackedCategories = await prisma.goalCategory.findMany({
      where: {
        goalId: goalId
      },
      include: {
        category: true
      }
    });

    return NextResponse.json(trackedCategories);
  } catch (error) {
    console.error('Error fetching tracked categories:', error);
    return NextResponse.json({ error: 'Failed to fetch tracked categories' }, { status: 500 });
  }
}

export async function POST() {
  return NextResponse.json({ success: true });
}

export async function DELETE() {
  return NextResponse.json({ success: true });
}