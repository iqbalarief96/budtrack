import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// Get all goals for the current user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const goals = await prisma.goal.findMany({
      where: {
        userId: session.user.id
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Calculate estimated completion for each goal
    const goalsWithEstimates = await Promise.all(goals.map(async (goal) => {
      // Get average monthly savings for this goal type from transactions
      const monthlyTransactions = await prisma.transaction.findMany({
        where: {
          userId: session.user.id,
          description: {
            startsWith: goal.type // Assuming goal type matches transaction description prefix
          },
          category: {
            name: 'Savings'
          },
          date: {
            gte: new Date(new Date().setMonth(new Date().getMonth() - 3)) // Last 3 months
          }
        }
      });

      // Calculate average monthly savings
      const totalSavings = monthlyTransactions.reduce((sum, tx) => 
        sum + (tx.type === 'EXPENSE' ? tx.amount : -tx.amount), 0);
      const averageMonthly = totalSavings / 3; // Average over 3 months

      // Calculate remaining amount and estimated months
      const remaining = goal.target - goal.current;
      const estimatedMonths = averageMonthly > 0 ? Math.ceil(remaining / averageMonthly) : null;

      return {
        ...goal,
        estimatedMonths,
        averageMonthly
      };
    }));

    return NextResponse.json(goalsWithEstimates);
  } catch (error) {
    console.error('Error fetching goals:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// Create a new goal
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const { name, target, targetDate, type, description, icon, color } = body;

    // Validate required fields
    if (!name || !target || !targetDate || !type) {
      return new NextResponse('Missing required fields', { status: 400 });
    }

    const goal = await prisma.goal.create({
      data: {
        name,
        target,
        targetDate: new Date(targetDate),
        type,
        description,
        icon,
        color,
        userId: session.user.id
      }
    });

    return NextResponse.json(goal);
  } catch (error) {
    console.error('Error creating goal:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// Update a goal
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const { id, current, status, ...updateData } = body;

    if (!id) {
      return new NextResponse('Goal ID is required', { status: 400 });
    }

    // Verify goal belongs to user
    const existingGoal = await prisma.goal.findFirst({
      where: {
        id,
        userId: session.user.id
      }
    });

    if (!existingGoal) {
      return new NextResponse('Goal not found', { status: 404 });
    }

    const updatedGoal = await prisma.goal.update({
      where: { id },
      data: {
        ...updateData,
        current: current !== undefined ? current : existingGoal.current,
        status: status !== undefined ? status : existingGoal.status
      }
    });

    return NextResponse.json(updatedGoal);
  } catch (error) {
    console.error('Error updating goal:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// Delete a goal
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return new NextResponse('Goal ID is required', { status: 400 });
    }

    // Verify goal belongs to user
    const existingGoal = await prisma.goal.findFirst({
      where: {
        id,
        userId: session.user.id
      }
    });

    if (!existingGoal) {
      return new NextResponse('Goal not found', { status: 404 });
    }

    await prisma.goal.delete({
      where: { id }
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting goal:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 