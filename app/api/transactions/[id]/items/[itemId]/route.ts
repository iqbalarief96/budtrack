import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// PUT /api/transactions/[id]/items/[itemId] - Update existing item
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: transactionId, itemId } = params;
    const body = await req.json();
    const { name, quantity, unitPrice, category, notes } = body;

    // Verify transaction belongs to user
    const transaction = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        userId: session.user.id,
      },
    });

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    // Calculate new total price
    const totalPrice = (quantity || 1) * (unitPrice || 0);

    // Update item
    const item = await prisma.transactionItem.update({
      where: { id: itemId },
      data: {
        ...(name !== undefined && { name }),
        ...(quantity !== undefined && { quantity }),
        ...(unitPrice !== undefined && { unitPrice }),
        totalPrice,
        ...(category !== undefined && { category }),
        ...(notes !== undefined && { notes }),
      },
    });

    // Update parent transaction amount
    const totalItemsAmount = await prisma.transactionItem.aggregate({
      where: { transactionId },
      _sum: { totalPrice: true },
    });

    await prisma.transaction.update({
      where: { id: transactionId },
      data: { amount: totalItemsAmount._sum.totalPrice || 0 },
    });

    return NextResponse.json({ item });
  } catch (error) {
    console.error('Error updating transaction item:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/transactions/[id]/items/[itemId] - Delete item
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: transactionId, itemId } = params;

    // Verify transaction belongs to user
    const transaction = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        userId: session.user.id,
      },
    });

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    // Delete item
    await prisma.transactionItem.delete({
      where: { id: itemId },
    });

    // Update parent transaction amount
    const totalItemsAmount = await prisma.transactionItem.aggregate({
      where: { transactionId },
      _sum: { totalPrice: true },
    });

    await prisma.transaction.update({
      where: { id: transactionId },
      data: { amount: totalItemsAmount._sum.totalPrice || 0 },
    });

    return NextResponse.json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Error deleting transaction item:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
