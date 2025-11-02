import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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

    // Get tracked categories
    const trackedCategories = await prisma.goalCategory.findMany({
      where: { goalId },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            type: true,
            icon: true,
            color: true,
          },
        },
      },
    });

    return NextResponse.json({
      goalId,
      categories: trackedCategories.map((tc) => tc.category),
    });
  } catch (error) {
    console.error('Error fetching tracked categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tracked categories' },
      { status: 500 }
    );
  }
}

export async function POST(
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
    const data = await request.json();
    const { categoryIds } = data;

    if (!Array.isArray(categoryIds)) {
      return NextResponse.json(
        { error: 'categoryIds must be an array' },
        { status: 400 }
      );
    }

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

    // Verify all categories belong to user
    const categories = await prisma.category.findMany({
      where: {
        id: { in: categoryIds },
        userId: session.user.id,
      },
    });

    if (categories.length !== categoryIds.length) {
      return NextResponse.json(
        { error: 'One or more categories not found' },
        { status: 404 }
      );
    }

    // Delete existing tracked categories
    await prisma.goalCategory.deleteMany({
      where: { goalId },
    });

    // Create new tracked categories
    if (categoryIds.length > 0) {
      await prisma.goalCategory.createMany({
        data: categoryIds.map((categoryId: string) => ({
          goalId,
          categoryId,
        })),
      });
    }

    // Get updated tracked categories
    const trackedCategories = await prisma.goalCategory.findMany({
      where: { goalId },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            type: true,
            icon: true,
            color: true,
          },
        },
      },
    });

    return NextResponse.json({
      goalId,
      categories: trackedCategories.map((tc) => tc.category),
    });
  } catch (error) {
    console.error('Error setting tracked categories:', error);
    return NextResponse.json(
      { error: 'Failed to set tracked categories' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    // Delete all tracked categories
    await prisma.goalCategory.deleteMany({
      where: { goalId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting tracked categories:', error);
    return NextResponse.json(
      { error: 'Failed to delete tracked categories' },
      { status: 500 }
    );
  }
} 