import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET /api/transactions/[id]/items - Fetch all items for a transaction
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const transactionId = params.id;

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

    // Fetch items ordered by 'order' field
    const items = await prisma.transactionItem.findMany({
      where: { transactionId },
      orderBy: { order: 'asc' },
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error('Error fetching transaction items:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/transactions/[id]/items - Add new item to transaction
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const transactionId = params.id;
    const body = await req.json();
    const { name, quantity, unitPrice, category, notes } = body;

    // Validate required fields
    if (!name || unitPrice === undefined) {
      return NextResponse.json(
        { error: 'Name and unitPrice are required' },
        { status: 400 }
      );
    }

    // Verify transaction belongs to user
    const transaction = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        userId: session.user.id,
      },
      include: {
        items: true,
      },
    });

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    // Calculate total price
    const qty = quantity || 1;
    const totalPrice = qty * unitPrice;

    // Get next order number
    const maxOrder =
      transaction.items.length > 0
        ? Math.max(...transaction.items.map((i) => i.order))
        : -1;

    // Create transaction item
    const item = await prisma.transactionItem.create({
      data: {
        transactionId,
        name,
        quantity: qty,
        unitPrice,
        totalPrice,
        category,
        notes,
        order: maxOrder + 1,
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

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error('Error creating transaction item:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
