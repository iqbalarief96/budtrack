import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// GET /api/groups/[groupId]/categories
export async function GET(
  request: Request,
  { params }: { params: { groupId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check user membership
    const membership = await prisma.userGroup.findFirst({
      where: {
        userId: session.user.id,
        groupId: params.groupId,
      },
    })

    if (!membership) {
      return NextResponse.json(
        { error: 'You are not a member of this group' },
        { status: 403 }
      )
    }

    // Get user's categories first
    const userCategories = await prisma.category.findMany({
      where: {
        userId: session.user.id,
        // We usually only want expense categories for group expenses
        // but we'll provide both types for flexibility
        type: { in: ['EXPENSE', 'INCOME'] }
      },
      orderBy: {
        name: 'asc',
      },
    })

    // Get the default categories as fallback if user has no custom categories
    const defaultCategories = await prisma.category.findMany({
      where: {
        isDefault: true,
      },
      orderBy: {
        name: 'asc',
      },
    })

    // Combine and deduplicate
    const allCategories = [...userCategories]
    
    // Only add default categories that don't conflict with user categories
    for (const defaultCat of defaultCategories) {
      if (!userCategories.some(userCat => 
        userCat.name.toLowerCase() === defaultCat.name.toLowerCase() && 
        userCat.type === defaultCat.type
      )) {
        allCategories.push(defaultCat)
      }
    }

    // Sort by type and name
    const sortedCategories = allCategories.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'EXPENSE' ? -1 : 1
      }
      return a.name.localeCompare(b.name)
    })

    return NextResponse.json(sortedCategories)
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 