import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

interface TrackedCategory {
  id: string
  name: string
  type: string
  icon?: string
  color?: string
}

// GET /api/budgets/[id]/tracked-categories - Get tracked categories for a budget
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const budgetId = params.id
    
    if (!budgetId) {
      return NextResponse.json({ error: 'Budget ID is required' }, { status: 400 })
    }
    
    // Verify if the budget belongs to the user
    const budget = await prisma.budget.findFirst({
      where: {
        id: budgetId,
        userId: session.user.id,
      },
    })
    
    if (!budget) {
      return NextResponse.json({ error: 'Budget not found' }, { status: 404 })
    }
    
    // As a temporary solution, we return an empty array
    // In a real implementation, we would return the categories being tracked for this budget
    const trackedCategories: TrackedCategory[] = []
    
    return NextResponse.json(trackedCategories)
  } catch (error) {
    console.error('Error fetching budget tracked categories:', error)
    return NextResponse.json(
      { error: 'Failed to fetch budget tracked categories' },
      { status: 500 }
    )
  }
}

// POST /api/budgets/[id]/tracked-categories - Add a tracked category to a budget
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const budgetId = params.id
    
    if (!budgetId) {
      return NextResponse.json({ error: 'Budget ID is required' }, { status: 400 })
    }
    
    // Verify if the budget belongs to the user
    const budget = await prisma.budget.findFirst({
      where: {
        id: budgetId,
        userId: session.user.id,
      },
    })
    
    if (!budget) {
      return NextResponse.json({ error: 'Budget not found' }, { status: 404 })
    }
    
    const data = await request.json()
    
    if (!data.categoryId) {
      return NextResponse.json(
        { error: 'Category ID is required' },
        { status: 400 }
      )
    }
    
    // In a real implementation, we would add the category to the budget's tracked categories
    // For now, we just return a success message
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error adding tracked category to budget:', error)
    return NextResponse.json(
      { error: 'Failed to add tracked category to budget' },
      { status: 500 }
    )
  }
}

// DELETE /api/budgets/[id]/tracked-categories - Remove a tracked category from a budget
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const budgetId = params.id
    
    if (!budgetId) {
      return NextResponse.json({ error: 'Budget ID is required' }, { status: 400 })
    }
    
    // Verify if the budget belongs to the user
    const budget = await prisma.budget.findFirst({
      where: {
        id: budgetId,
        userId: session.user.id,
      },
    })
    
    if (!budget) {
      return NextResponse.json({ error: 'Budget not found' }, { status: 404 })
    }
    
    const url = new URL(request.url)
    const categoryId = url.searchParams.get('categoryId')
    
    if (!categoryId) {
      return NextResponse.json(
        { error: 'Category ID is required' },
        { status: 400 }
      )
    }
    
    // In a real implementation, we would remove the category from the budget's tracked categories
    // For now, we just return a success message
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing tracked category from budget:', error)
    return NextResponse.json(
      { error: 'Failed to remove tracked category from budget' },
      { status: 500 }
    )
  }
} 