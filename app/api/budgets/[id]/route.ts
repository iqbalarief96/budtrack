import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import type { Budget } from '@/app/types/budget';

// DELETE /api/budgets/[id] - Delete a budget
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    // Verify budget ownership
    const budget = await prisma.budget.findUnique({
      where: { id: params.id },
    });

    if (!budget || budget.userId !== session.user.id) {
      return new NextResponse('Budget not found', { status: 404 });
    }

    // Delete budget
    await prisma.budget.delete({
      where: { id: params.id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting budget:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 