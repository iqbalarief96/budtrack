import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// Definisikan interface untuk tracked categories
interface TrackedCategory {
  id: string;
  name: string;
  type: string;
  icon?: string;
  color?: string;
}

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

    // Return empty array since GoalCategory relationship isn't defined in schema
    const trackedCategories: TrackedCategory[] = [];
    
    return NextResponse.json(trackedCategories);
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
    
    if (!data.categoryId) {
      return NextResponse.json({ error: 'Category ID is required' }, { status: 400 });
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

    // Verify category exists
    const category = await prisma.category.findUnique({
      where: {
        id: data.categoryId,
      },
    });

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // Since GoalCategory table doesn't exist, respond with a message
    return NextResponse.json(
      { message: 'Feature not implemented yet' },
      { status: 501 }
    );
  } catch (error) {
    console.error('Error adding tracked category:', error);
    return NextResponse.json(
      { error: 'Failed to add tracked category' },
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

    // Since GoalCategory table doesn't exist, respond with a message
    return NextResponse.json(
      { message: 'Feature not implemented yet' },
      { status: 501 }
    );
  } catch (error) {
    console.error('Error removing tracked category:', error);
    return NextResponse.json(
      { error: 'Failed to remove tracked category' },
      { status: 500 }
    );
  }
} 