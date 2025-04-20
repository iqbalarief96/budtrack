import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { PrismaClient } from '@prisma/client';
import { updateWeddingBudgetTotals } from './utils';

// Fallback prisma jika ada masalah
const prismaFallback = new PrismaClient();

// GET /api/wedding-budget
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const prismaClient = prisma || prismaFallback;
    
    // Cari wedding aktif milik user
    const wedding = await prismaClient.wedding.findFirst({
      where: {
        userId: session.user.id
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    if (!wedding) {
      console.log('No wedding found for user ID:', session.user.id);
      return NextResponse.json({ 
        error: 'No wedding found',
        message: 'Please create a wedding first from the wedding planner page'
      }, { status: 404 });
    }
    
    console.log('Found wedding with ID:', wedding.id);
    
    // Get all budget categories with their items
    const budgetCategories = await prismaClient.weddingBudgetCategory.findMany({
      where: {
        weddingId: wedding.id
      },
      include: {
        items: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });
    
    // If no categories exist yet, create sample data
    if (budgetCategories.length === 0) {
      console.log('No budget categories found, creating sample data for wedding ID:', wedding.id);
      
      // Use initialBudgetCategories from our React component as template
      const initialCategories = [
        {
          name: 'Venue',
          total: 85000000,
          spent: 45000000,
          items: [
            { name: 'Gedung Utama', budgeted: 80000000, actual: 40000000, paid: true },
            { name: 'Area Outdoor', budgeted: 5000000, actual: 5000000, paid: false },
          ]
        },
        {
          name: 'Katering',
          total: 50000000,
          spent: 5000000,
          items: [
            { name: 'Menu Utama (250 pax)', budgeted: 40000000, actual: 0, paid: false },
            { name: 'Snack & Minuman', budgeted: 10000000, actual: 5000000, paid: true },
          ]
        },
        {
          name: 'Dekorasi',
          total: 35000000,
          spent: 10000000,
          items: [
            { name: 'Dekorasi Pelaminan', budgeted: 25000000, actual: 10000000, paid: true },
            { name: 'Bunga & Lighting', budgeted: 10000000, actual: 0, paid: false },
          ]
        },
        {
          name: 'Pakaian',
          total: 30000000,
          spent: 15000000,
          items: [
            { name: 'Baju Pengantin', budgeted: 20000000, actual: 15000000, paid: true },
            { name: 'Keluarga', budgeted: 10000000, actual: 0, paid: false },
          ]
        },
        {
          name: 'Fotografi & Videografi',
          total: 25000000,
          spent: 0,
          items: [
            { name: 'Pre-Wedding', budgeted: 10000000, actual: 0, paid: false },
            { name: 'Dokumentasi Acara', budgeted: 15000000, actual: 0, paid: false },
          ]
        },
        {
          name: 'Entertaiment',
          total: 15000000,
          spent: 0,
          items: [
            { name: 'MC', budgeted: 5000000, actual: 0, paid: false },
            { name: 'Band/Music', budgeted: 10000000, actual: 0, paid: false },
          ]
        },
        {
          name: 'Souvenir & Undangan',
          total: 10000000,
          spent: 0,
          items: [
            { name: 'Souvenir (250 pcs)', budgeted: 7500000, actual: 0, paid: false },
            { name: 'Undangan Digital & Fisik', budgeted: 2500000, actual: 0, paid: false },
          ]
        },
      ];
      
      try {
        // Create the categories and items in database
        const createdCategories = [];
        
        for (const categoryData of initialCategories) {
          const category = await prismaClient.weddingBudgetCategory.create({
            data: {
              weddingId: wedding.id,
              name: categoryData.name,
              total: categoryData.total,
              spent: categoryData.spent,
              items: {
                create: categoryData.items.map(item => ({
                  name: item.name,
                  budgeted: item.budgeted,
                  actual: item.actual,
                  paid: item.paid
                }))
              }
            },
            include: {
              items: true
            }
          });
          
          createdCategories.push(category);
        }
        
        // Update wedding's budget berdasarkan total dari kategori
        await updateWeddingBudgetTotals(wedding.id);
        
        console.log('Created sample budget categories successfully');
        return NextResponse.json({ 
          budgetCategories: createdCategories,
          isInitialData: true
        });
      } catch (createError) {
        console.error('Error creating budget categories:', createError);
        return NextResponse.json(
          { error: 'Failed to create budget categories', details: createError instanceof Error ? createError.message : String(createError) },
          { status: 500 }
        );
      }
    }
    
    return NextResponse.json({ 
      budgetCategories,
      isInitialData: false
    });
  } catch (error) {
    console.error('Error fetching wedding budget:', error);
    return NextResponse.json(
      { error: 'Failed to fetch wedding budget: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}

// POST /api/wedding-budget - Buat kategori baru
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const prismaClient = prisma || prismaFallback;
    
    // Parse request body
    const data = await request.json();
    const { name, total = 0, spent = 0, items = [] } = data;
    
    if (!name) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
    }
    
    // Cari wedding aktif milik user
    const wedding = await prismaClient.wedding.findFirst({
      where: {
        userId: session.user.id
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    if (!wedding) {
      return NextResponse.json({ error: 'No wedding found' }, { status: 404 });
    }
    
    // Buat kategori baru
    const category = await prismaClient.weddingBudgetCategory.create({
      data: {
        weddingId: wedding.id,
        name,
        total,
        spent,
        items: {
          create: items.map((item: any) => ({
            name: item.name,
            budgeted: item.budgeted,
            actual: item.actual || 0,
            paid: item.paid || false
          }))
        }
      },
      include: {
        items: true
      }
    });
    
    // Update wedding's budget dengan fungsi utils
    await updateWeddingBudgetTotals(wedding.id);
    
    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error('Error creating wedding budget category:', error);
    return NextResponse.json(
      { error: 'Failed to create wedding budget category: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}

// PUT /api/wedding-budget - Update kategori
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const prismaClient = prisma || prismaFallback;
    
    // Parse request body
    const data = await request.json();
    const { id, name, total, spent } = data;
    
    if (!id) {
      return NextResponse.json({ error: 'Category ID is required' }, { status: 400 });
    }
    
    // Cek apakah kategori ada dan milik user ini
    const existingCategory = await prismaClient.weddingBudgetCategory.findUnique({
      where: { id },
      include: {
        wedding: true
      }
    });
    
    if (!existingCategory) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }
    
    if (existingCategory.wedding.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Update kategori
    const category = await prismaClient.weddingBudgetCategory.update({
      where: { id },
      data: {
        name: name || undefined,
        total: total || undefined,
        spent: spent || undefined
      },
      include: {
        items: true
      }
    });
    
    // Update wedding budget dengan fungsi utils
    await updateWeddingBudgetTotals(category.weddingId);
    
    return NextResponse.json(category);
  } catch (error) {
    console.error('Error updating wedding budget category:', error);
    return NextResponse.json(
      { error: 'Failed to update wedding budget category: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}

// DELETE /api/wedding-budget
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const prismaClient = prisma || prismaFallback;
    
    // Get category ID from URL
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('id');
    
    if (!categoryId) {
      return NextResponse.json({ error: 'Category ID is required' }, { status: 400 });
    }
    
    // Cek apakah kategori ada dan milik user ini
    const existingCategory = await prismaClient.weddingBudgetCategory.findUnique({
      where: { id: categoryId },
      include: {
        wedding: true
      }
    });
    
    if (!existingCategory) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }
    
    if (existingCategory.wedding.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Hapus kategori (items akan terhapus otomatis karena onDelete: Cascade)
    await prismaClient.weddingBudgetCategory.delete({
      where: { id: categoryId }
    });
    
    // Update wedding budget dengan fungsi utils
    await updateWeddingBudgetTotals(existingCategory.weddingId);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting wedding budget category:', error);
    return NextResponse.json(
      { error: 'Failed to delete wedding budget category: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
} 