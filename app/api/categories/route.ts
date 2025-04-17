import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '../../lib/prisma'

// GET /api/categories
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const categories = await prisma.category.findMany({
      where: {
        OR: [
          { userId: session.user.id },
          { isDefault: true }
        ]
      },
      orderBy: {
        name: 'asc'
      }
    })

    return NextResponse.json(categories)
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    )
  }
}

// POST /api/categories
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, type, color, parentId } = await request.json()

    if (!name || !type || !color) {
      return NextResponse.json(
        { error: 'Name, type, and color are required' },
        { status: 400 }
      )
    }

    // Verify parent category if provided
    if (parentId) {
      const parentCategory = await prisma.category.findUnique({
        where: { id: parentId }
      });
      
      if (!parentCategory) {
        return NextResponse.json(
          { error: 'Parent category not found' },
          { status: 404 }
        )
      }
      
      // Ensure parent category belongs to user
      if (parentCategory.userId !== session.user.id && !parentCategory.isDefault) {
        return NextResponse.json(
          { error: 'Unauthorized to use this parent category' },
          { status: 401 }
        )
      }
    }

    // Check if category with same name exists
    const existingCategory = await prisma.category.findFirst({
      where: {
        name,
        userId: session.user.id,
        parentId: parentId || null
      }
    })

    if (existingCategory) {
      return NextResponse.json(
        { error: 'Category with this name already exists' },
        { status: 400 }
      )
    }

    const category = await prisma.category.create({
      data: {
        name,
        type,
        color,
        userId: session.user.id,
        parentId: parentId || null
      }
    })

    return NextResponse.json(category)
  } catch (error) {
    console.error('Error creating category:', error)
    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    )
  }
}

// PUT /api/categories/:id
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, name, type, color, parentId } = await request.json()

    if (!id || !name || !type || !color) {
      return NextResponse.json(
        { error: 'ID, name, type, and color are required' },
        { status: 400 }
      )
    }

    // Check if category exists and belongs to user
    const category = await prisma.category.findUnique({
      where: { id }
    })

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      )
    }

    if (category.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify parent category if provided
    if (parentId) {
      const parentCategory = await prisma.category.findUnique({
        where: { id: parentId }
      });
      
      if (!parentCategory) {
        return NextResponse.json(
          { error: 'Parent category not found' },
          { status: 404 }
        )
      }
      
      // Ensure parent category belongs to user
      if (parentCategory.userId !== session.user.id && !parentCategory.isDefault) {
        return NextResponse.json(
          { error: 'Unauthorized to use this parent category' },
          { status: 401 }
        )
      }
      
      // Prevent circular references
      if (id === parentId) {
        return NextResponse.json(
          { error: 'A category cannot be its own parent' },
          { status: 400 }
        )
      }
    }

    // Check if category with same name exists
    const existingCategory = await prisma.category.findFirst({
      where: {
        name,
        userId: session.user.id,
        parentId: parentId || null,
        NOT: {
          id
        }
      }
    })

    if (existingCategory) {
      return NextResponse.json(
        { error: 'Category with this name already exists' },
        { status: 400 }
      )
    }

    const updatedCategory = await prisma.category.update({
      where: { id },
      data: {
        name,
        type,
        color,
        parentId: parentId || null
      }
    })

    return NextResponse.json(updatedCategory)
  } catch (error) {
    console.error('Error updating category:', error)
    return NextResponse.json(
      { error: 'Failed to update category' },
      { status: 500 }
    )
  }
}

// DELETE /api/categories/:id
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Category ID is required' },
        { status: 400 }
      )
    }

    // Check if category exists and belongs to user
    const category = await prisma.category.findUnique({
      where: { id }
    })

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      )
    }

    if (category.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if category is in use
    const transactions = await prisma.transaction.findMany({
      where: {
        categoryId: id
      }
    })

    if (transactions.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete category that is in use' },
        { status: 400 }
      )
    }

    await prisma.category.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting category:', error)
    return NextResponse.json(
      { error: 'Failed to delete category' },
      { status: 500 }
    )
  }
} 