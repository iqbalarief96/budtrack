import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get walletId from query parameters if it exists
    const { searchParams } = new URL(request.url);
    const walletId = searchParams.get('walletId');
    
    // Build where clause
    const whereClause: any = {
      userId: session.user.id,
      isArchived: false
    };
    
    // Add walletId filter if provided
    if (walletId) {
      whereClause.walletId = walletId;
    }
    
    const goals = await prisma.goal.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        activities: {
          orderBy: {
            date: 'desc'
          },
          take: 5
        }
      }
    });
    
    return NextResponse.json(goals);
  } catch (error) {
    console.error('Error fetching goals:', error);
    return NextResponse.json({ error: 'Failed to fetch goals' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const data = await request.json();
    console.log("Raw input data:", data);
    
    // Validate required fields
    if (!data.name || data.target === undefined) {
      return NextResponse.json({ error: 'Name and target amount are required' }, { status: 400 });
    }
    
    // Parse numeric values
    const target = parseFloat(data.target);
    const current = data.current ? parseFloat(data.current) : 0;
    
    if (isNaN(target) || target <= 0) {
      return NextResponse.json({ error: 'Target amount must be a positive number' }, { status: 400 });
    }
    
    // Create goal
    console.log("Creating goal with data:", {
      name: data.name,
      target,
      current,
      deadline: data.deadline,
      deadlineType: typeof data.deadline,
      isDateObj: data.deadline instanceof Date,
      constructedDate: data.deadline ? new Date(data.deadline) : null
    });
    
    // Ensure the deadline is properly handled
    let deadlineDate = null;
    if (data.deadline) {
      try {
        // Handle different types of date values
        deadlineDate = new Date(data.deadline);
        // Validate date
        if (isNaN(deadlineDate.getTime())) {
          console.warn("Invalid date value:", data.deadline);
          deadlineDate = null;
        } else {
          console.log("Valid deadline date:", deadlineDate.toISOString());
        }
      } catch (error) {
        console.error("Error parsing deadline:", error);
      }
    }
    
    const goal = await prisma.goal.create({
      data: {
        name: data.name,
        target,
        current,
        deadline: deadlineDate,
        category: data.category || null,
        description: data.description || null,
        icon: data.icon || null,
        color: data.color || null,
        userId: session.user.id
      }
    });
    
    console.log("Created goal:", goal);
    
    return NextResponse.json(goal);
  } catch (error) {
    console.error('Error creating goal:', error);
    return NextResponse.json({ error: 'Failed to create goal' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const data = await request.json();
    
    if (!data.id) {
      return NextResponse.json({ error: 'Goal ID is required' }, { status: 400 });
    }
    
    // Check if the goal exists and belongs to the user
    const existingGoal = await prisma.goal.findFirst({
      where: {
        id: data.id,
        userId: session.user.id
      }
    });
    
    if (!existingGoal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }
    
    // Prepare update data
    const updateData: any = {};
    
    if (data.name !== undefined) updateData.name = data.name;
    if (data.target !== undefined) updateData.target = parseFloat(data.target);
    if (data.current !== undefined) updateData.current = parseFloat(data.current);
    if (data.deadline !== undefined) updateData.deadline = data.deadline ? new Date(data.deadline) : null;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.icon !== undefined) updateData.icon = data.icon;
    if (data.color !== undefined) updateData.color = data.color;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.isArchived !== undefined) updateData.isArchived = data.isArchived;
    
    // Update goal
    const updatedGoal = await prisma.goal.update({
      where: { id: data.id },
      data: updateData
    });

    // Handle tracked categories if provided
    if (data.trackedCategoryIds !== undefined && Array.isArray(data.trackedCategoryIds)) {
      // Delete existing tracked categories
      await prisma.goalCategory.deleteMany({
        where: { goalId: data.id }
      });

      // Create new tracked categories
      if (data.trackedCategoryIds.length > 0) {
        await prisma.goalCategory.createMany({
          data: data.trackedCategoryIds.map((categoryId: string) => ({
            goalId: data.id,
            categoryId
          }))
        });
      }
    }

    // Fetch updated goal with tracked categories
    const updatedGoalWithCategories = await prisma.goal.findUnique({
      where: { id: data.id },
      include: {
        goalCategories: {
          include: {
            category: true
          }
        }
      }
    });

    return NextResponse.json(updatedGoalWithCategories);
  } catch (error) {
    console.error('Error updating goal:', error);
    return NextResponse.json({ error: 'Failed to update goal' }, { status: 500 });
  }
}

// Delete a goal
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Goal ID is required' }, { status: 400 });
    }

    // Verify goal belongs to user
    const existingGoal = await prisma.goal.findFirst({
      where: {
        id,
        userId: session.user.id
      }
    });

    if (!existingGoal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    await prisma.goal.delete({
      where: { id }
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting goal:', error);
    return NextResponse.json({ error: 'Failed to delete goal' }, { status: 500 });
  }
} 