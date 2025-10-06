import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET /api/category-rules - Get all rules for the current user
export async function GET() {
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

    // Fetch rules from database
    const rules = await prisma.categoryRule.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(rules);
  } catch (error) {
    console.error('Error fetching category rules:', error);
    return NextResponse.json({ error: 'Failed to fetch category rules' }, { status: 500 });
  }
}

// POST /api/category-rules - Create a new rule
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
    const { name, pattern, categoryId, isRegex, isActive } = data;

    // Validate required fields
    if (!name || !pattern || !categoryId) {
      return NextResponse.json(
        { error: 'Name, pattern, and categoryId are required fields' },
        { status: 400 }
      );
    }

    // Check if category exists
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // Create rule
    const rule = await prisma.categoryRule.create({
      data: {
        name,
        pattern,
        categoryId,
        isRegex: isRegex || false,
        isActive: isActive !== undefined ? isActive : true,
        userId: user.id,
      },
    });

    return NextResponse.json(rule, { status: 201 });
  } catch (error) {
    console.error('Error creating category rule:', error);
    return NextResponse.json({ error: 'Failed to create category rule' }, { status: 500 });
  }
}

// PATCH /api/category-rules?id={id} - Update an existing rule
export async function PATCH(request: Request) {
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

    // Get the rule ID from query params
    const { searchParams } = new URL(request.url);
    const ruleId = searchParams.get('id');

    if (!ruleId) {
      return NextResponse.json({ error: 'Rule ID is required' }, { status: 400 });
    }

    // Find the rule and verify ownership
    const existingRule = await prisma.categoryRule.findUnique({
      where: { id: ruleId },
    });

    if (!existingRule) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    }

    if (existingRule.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Parse request body
    const data = await request.json();
    const { name, pattern, categoryId, isRegex, isActive } = data;

    // Update rule
    const updatedRule = await prisma.categoryRule.update({
      where: { id: ruleId },
      data: {
        ...(name !== undefined && { name }),
        ...(pattern !== undefined && { pattern }),
        ...(categoryId !== undefined && { categoryId }),
        ...(isRegex !== undefined && { isRegex }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json(updatedRule);
  } catch (error) {
    console.error('Error updating category rule:', error);
    return NextResponse.json({ error: 'Failed to update category rule' }, { status: 500 });
  }
}

// DELETE /api/category-rules?id={id} - Delete a rule
export async function DELETE(request: Request) {
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

    // Get the rule ID from query params
    const { searchParams } = new URL(request.url);
    const ruleId = searchParams.get('id');

    if (!ruleId) {
      return NextResponse.json({ error: 'Rule ID is required' }, { status: 400 });
    }

    // Find the rule and verify ownership
    const existingRule = await prisma.categoryRule.findUnique({
      where: { id: ruleId },
    });

    if (!existingRule) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    }

    if (existingRule.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Delete rule
    await prisma.categoryRule.delete({
      where: { id: ruleId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting category rule:', error);
    return NextResponse.json({ error: 'Failed to delete category rule' }, { status: 500 });
  }
} 