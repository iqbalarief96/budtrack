import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// POST /api/categories/split - Split transactions from a category into a new one
export async function POST(request: Request) {
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

    // Parse request body
    const data = await request.json();
    const { categoryId, newCategoryName, splitPattern } = data;

    // Validate required fields
    if (!categoryId || !newCategoryName || !splitPattern) {
      return NextResponse.json(
        { error: 'Category ID, new category name, and split pattern are required' },
        { status: 400 }
      );
    }

    // Verify source category exists and belongs to the user
    const sourceCategory = await prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!sourceCategory) {
      return NextResponse.json({ error: 'Source category not found' }, { status: 404 });
    }

    if (sourceCategory.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized access to category' }, { status: 403 });
    }

    // Convert pattern string to an array
    const patterns = splitPattern
      .split(',')
      .map((pattern: string) => pattern.trim())
      .filter((pattern: string) => pattern.length > 0);

    if (patterns.length === 0) {
      return NextResponse.json(
        { error: 'At least one valid pattern is required' },
        { status: 400 }
      );
    }

    // Start a transaction to ensure all database operations succeed or fail together
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the new category
      const newCategory = await tx.category.create({
        data: {
          name: newCategoryName,
          type: sourceCategory.type,
          color: sourceCategory.color,
          icon: sourceCategory.icon,
          isDefault: false,
          userId: user.id,
        },
      });

      // 2. Find transactions that match the pattern
      const transactions = await tx.transaction.findMany({
        where: { 
          userId: user.id,
          categoryId: categoryId,
          description: {
            contains: patterns[0]
          }
        },
      });

      // Get transaction IDs that match any of the patterns
      const matchingTransactionIds = (await Promise.all(
        patterns.map(async (pattern: string) => {
          const matches = await tx.transaction.findMany({
            where: { 
              userId: user.id,
              categoryId: categoryId,
              description: {
                contains: pattern
              }
            },
            select: { id: true },
          });
          return matches.map(match => match.id);
        })
      )).flat();

      // Remove duplicates from the transaction IDs
      const uniqueTransactionIds = [...new Set(matchingTransactionIds)];

      // 3. Update matching transactions to use the new category
      if (uniqueTransactionIds.length > 0) {
        await tx.transaction.updateMany({
          where: {
            id: { in: uniqueTransactionIds },
          },
          data: {
            categoryId: newCategory.id,
          },
        });
      }

      return {
        sourceCategory,
        newCategory,
        movedTransactionsCount: uniqueTransactionIds.length,
      };
    });

    return NextResponse.json({
      success: true,
      message: 'Category successfully split',
      ...result,
    });
  } catch (error) {
    console.error('Error splitting category:', error);
    return NextResponse.json({ error: 'Failed to split category' }, { status: 500 });
  }
} 