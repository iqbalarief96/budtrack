import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { goalId: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { goalId } = params;

    // Verify the goal belongs to the user
    const goal = await prisma.goal.findFirst({
      where: {
        id: goalId,
        userId: session.user.id,
      },
    });

    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    // Get tracked categories using raw query (for compatibility with older Prisma)
    const trackedCategories = await prisma.$queryRaw`
      SELECT c.*
      FROM "Category" c
      JOIN "GoalCategory" gc ON c.id = gc."categoryId"
      WHERE gc."goalId" = ${goalId}
      ORDER BY c.name ASC
    `;
    
    return NextResponse.json(trackedCategories);
  } catch (error) {
    console.error('Error fetching tracked categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tracked categories' },
      { status: 500 }
    );
  }
} 