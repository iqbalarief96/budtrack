import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// This endpoint is deprecated. Use /api/budgets instead.
export async function GET(request: NextRequest) {
  return NextResponse.json(
    { error: 'This endpoint is deprecated. Use /api/budgets instead.' },
    { status: 410 }
  );
}

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: 'This endpoint is deprecated. Use /api/budgets instead.' },
    { status: 410 }
  );
}

export async function PUT(request: NextRequest) {
  return NextResponse.json(
    { error: 'This endpoint is deprecated. Use /api/budgets instead.' },
    { status: 410 }
  );
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