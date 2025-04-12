import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// Get all goals for the current user
export async function GET(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get query parameters
    const url = new URL(request.url);
    const status = url.searchParams.get('status') || undefined;
    
    // Build the query filter
    const filter: any = {
      userId: session.user.id
    };
    
    if (status) {
      filter.status = status;
    }
    
    // Fetch goals with activities
    const goals = await prisma.goal.findMany({
      where: filter,
      include: {
        activities: {
          orderBy: {
            date: 'desc'
          }
        },
        adviceLinks: {
          include: {
            advice: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    return NextResponse.json(goals);
  } catch (error) {
    console.error('Error fetching goals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch goals' },
      { status: 500 }
    );
  }
}

// Create a new goal
export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse request body
    const body = await request.json();
    
    // Validate required fields
    const { name, target, targetDate, type, trackedCategoryIds } = body;
    if (!name || !target || !targetDate || !type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Create the goal
    const goal = await prisma.goal.create({
      data: {
        name,
        target: parseFloat(target),
        targetDate: new Date(targetDate),
        type,
        description: body.description,
        icon: body.icon,
        color: body.color,
        userId: session.user.id,
        current: body.initialAmount ? parseFloat(body.initialAmount) : 0
      }
    });
    
    // If there's an initialAmount, create an activity for it
    if (body.initialAmount && parseFloat(body.initialAmount) > 0) {
      await prisma.goalActivity.create({
        data: {
          goalId: goal.id,
          amount: parseFloat(body.initialAmount),
          description: 'Initial amount',
          userId: session.user.id
        }
      });
    }
    
    // If trackedCategoryIds is provided, create goal-category relations
    if (trackedCategoryIds && Array.isArray(trackedCategoryIds) && trackedCategoryIds.length > 0) {
      // Verify all categories belong to the user
      const categories = await prisma.category.findMany({
        where: {
          id: { in: trackedCategoryIds },
          userId: session.user.id
        }
      });
      
      // Create relations only for valid categories
      const validCategoryIds = categories.map(cat => cat.id);
      
      // Create connections for each tracked category
      if (validCategoryIds.length > 0) {
        await Promise.all(
          validCategoryIds.map(categoryId => 
            prisma.goalCategory.create({
              data: {
                goalId: goal.id,
                categoryId
              }
            })
          )
        );
      }
    }
    
    // If this goal is created from advice, link it
    if (body.adviceId) {
      try {
        // Save the advice if it's not already saved
        let adviceId = body.adviceId;
        
        // If the advice is a raw object (not saved yet), save it first
        if (typeof body.adviceId === 'object') {
          const advice = await prisma.financialAdvice.create({
            data: {
              title: body.adviceId.title,
              description: body.adviceId.description,
              type: body.adviceId.type || 'general',
              priority: body.adviceId.priority || 'medium',
              estimatedImpact: body.adviceId.estimatedImpact || null,
              walletId: body.adviceId.walletId || null,
              timeframe: body.adviceId.timeframe || 'month',
              userId: session.user.id
            }
          });
          adviceId = advice.id;
        }
        
        // Skip if adviceId is null or invalid
        if (adviceId) {
          // Check if advice exists first
          const adviceExists = await prisma.financialAdvice.findUnique({
            where: { id: adviceId }
          });
          
          if (adviceExists) {
            // Create the link
            await prisma.financialAdviceGoal.create({
              data: {
                goalId: goal.id,
                adviceId
              }
            });
          }
        }
      } catch (linkError) {
        console.error('Error linking goal to advice:', linkError);
        // Continue execution - don't throw error if just the link fails
        // The goal itself was created successfully
      }
    }
    
    // Return the goal with tracked categories
    const createdGoal = await prisma.goal.findUnique({
      where: { id: goal.id },
      include: {
        trackedCategories: {
          include: {
            category: true
          }
        },
        activities: true
      }
    });
    
    return NextResponse.json(createdGoal, { status: 201 });
  } catch (error) {
    console.error('Error creating goal:', error);
    return NextResponse.json(
      { error: 'Failed to create goal' },
      { status: 500 }
    );
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
    const { id, current, status, trackedCategoryIds, ...updateData } = body;

    if (!id) {
      return new NextResponse('Goal ID is required', { status: 400 });
    }

    // Verify goal belongs to user
    const existingGoal = await prisma.goal.findFirst({
      where: {
        id,
        userId: session.user.id
      },
      include: {
        trackedCategories: true
      }
    });

    if (!existingGoal) {
      return new NextResponse('Goal not found', { status: 404 });
    }

    // Update goal basic data
    const updatedGoal = await prisma.goal.update({
      where: { id },
      data: {
        ...updateData,
        current: current !== undefined ? current : existingGoal.current,
        status: status !== undefined ? status : existingGoal.status
      }
    });

    // Update tracked categories if provided
    if (trackedCategoryIds && Array.isArray(trackedCategoryIds)) {
      // Get existing tracked category IDs
      const existingCategoryIds = existingGoal.trackedCategories.map(tc => tc.categoryId);
      
      // Determine categories to add and remove
      const categoriesToAdd = trackedCategoryIds.filter(id => !existingCategoryIds.includes(id));
      const categoriesToRemove = existingCategoryIds.filter(id => !trackedCategoryIds.includes(id));
      
      // Delete categories that are no longer tracked
      if (categoriesToRemove.length > 0) {
        await prisma.goalCategory.deleteMany({
          where: {
            goalId: id,
            categoryId: {
              in: categoriesToRemove
            }
          }
        });
      }
      
      // Add new tracked categories
      if (categoriesToAdd.length > 0) {
        // Verify these categories belong to the user
        const validCategories = await prisma.category.findMany({
          where: {
            id: { in: categoriesToAdd },
            userId: session.user.id
          }
        });
        
        const validCategoryIds = validCategories.map(cat => cat.id);
        
        // Create new connections
        await Promise.all(
          validCategoryIds.map(categoryId => 
            prisma.goalCategory.create({
              data: {
                goalId: id,
                categoryId
              }
            })
          )
        );
      }
    }
    
    // Return updated goal with tracked categories
    const finalGoal = await prisma.goal.findUnique({
      where: { id },
      include: {
        trackedCategories: {
          include: {
            category: true
          }
        }
      }
    });

    return NextResponse.json(finalGoal);
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