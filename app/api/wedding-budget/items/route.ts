import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { PrismaClient } from '@prisma/client';
import { updateWeddingBudgetTotals } from '../utils';

// Fallback prisma jika ada masalah
const prismaFallback = new PrismaClient();

// POST /api/wedding-budget/items - Tambah item ke kategori
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const prismaClient = prisma || prismaFallback;
    
    // Parse request body
    const data = await request.json();
    const { categoryId, name, budgeted, actual = 0, paid = false } = data;
    
    if (!categoryId || !name || budgeted === undefined) {
      return NextResponse.json({ error: 'Category ID, name, and budgeted amount are required' }, { status: 400 });
    }
    
    // Cek apakah kategori ini milik user yang sedang login
    const category = await prismaClient.weddingBudgetCategory.findUnique({
      where: { id: categoryId },
      include: {
        wedding: true
      }
    });
    
    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }
    
    if (category.wedding.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Buat item baru
    const item = await prismaClient.weddingBudgetItem.create({
      data: {
        categoryId,
        name,
        budgeted,
        actual,
        paid
      }
    });
    
    // Update kategori total dan spent
    await prismaClient.weddingBudgetCategory.update({
      where: { id: categoryId },
      data: {
        total: { increment: budgeted },
        spent: { increment: actual }
      }
    });
    
    // Update wedding budget dengan total
    await updateWeddingBudgetTotals(category.weddingId);
    
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error('Error creating wedding budget item:', error);
    return NextResponse.json(
      { error: 'Failed to create wedding budget item: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}

// PUT /api/wedding-budget/items - Update item
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const prismaClient = prisma || prismaFallback;
    
    // Parse request body
    const data = await request.json();
    console.log('Wedding budget item edit request data:', data);
    
    const { id, name, budgeted, actual, paid } = data;
    
    if (!id) {
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
    }
    
    // Cek apakah item ada dan milik user ini
    const existingItem = await prismaClient.weddingBudgetItem.findUnique({
      where: { id },
      include: {
        category: {
          include: {
            wedding: true
          }
        }
      }
    });
    
    if (!existingItem) {
      console.log(`Item with ID ${id} not found`);
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }
    
    if (existingItem.category.wedding.userId !== session.user.id) {
      console.log(`Unauthorized: Item belongs to user ${existingItem.category.wedding.userId}, request from ${session.user.id}`);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Hitung selisih untuk update kategori
    const diffBudgeted = (budgeted ?? existingItem.budgeted) - existingItem.budgeted;
    const diffActual = (actual ?? existingItem.actual) - existingItem.actual;
    
    console.log('Updating item with changes:', {
      originalBudgeted: existingItem.budgeted,
      newBudgeted: budgeted ?? existingItem.budgeted,
      diffBudgeted,
      originalActual: existingItem.actual,
      newActual: actual ?? existingItem.actual,
      diffActual,
      originalPaid: existingItem.paid,
      newPaid: paid !== undefined ? paid : existingItem.paid
    });
    
    // Update item
    const updatedItem = await prismaClient.weddingBudgetItem.update({
      where: { id },
      data: {
        name: name ?? undefined,
        budgeted: budgeted ?? undefined,
        actual: actual ?? undefined,
        paid: paid !== undefined ? paid : undefined
      }
    });
    
    // Update kategori jika ada perubahan dalam total atau actual
    if (diffBudgeted !== 0 || diffActual !== 0) {
      const category = await prismaClient.weddingBudgetCategory.update({
        where: { id: existingItem.categoryId },
        data: {
          total: { increment: diffBudgeted },
          spent: { increment: diffActual }
        }
      });
      
      // Update wedding budget dengan total
      await updateWeddingBudgetTotals(existingItem.category.wedding.id);
    }
    
    return NextResponse.json(updatedItem);
  } catch (error) {
    console.error('Error updating wedding budget item:', error);
    return NextResponse.json(
      { error: 'Failed to update wedding budget item: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}

// DELETE /api/wedding-budget/items
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const prismaClient = prisma || prismaFallback;
    
    // Get item ID from URL
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('id');
    
    if (!itemId) {
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
    }
    
    // Cek apakah item ada dan milik user ini
    const existingItem = await prismaClient.weddingBudgetItem.findUnique({
      where: { id: itemId },
      include: {
        category: {
          include: {
            wedding: true
          }
        }
      }
    });
    
    if (!existingItem) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }
    
    if (existingItem.category.wedding.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Hapus item
    await prismaClient.weddingBudgetItem.delete({
      where: { id: itemId }
    });
    
    // Update category dan wedding budget
    await prismaClient.weddingBudgetCategory.update({
      where: { id: existingItem.categoryId },
      data: {
        total: { decrement: existingItem.budgeted },
        spent: { decrement: existingItem.actual }
      }
    });
    
    // Update wedding budget
    await updateWeddingBudgetTotals(existingItem.category.wedding.id);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting wedding budget item:', error);
    return NextResponse.json(
      { error: 'Failed to delete wedding budget item: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}

// API untuk update status pembayaran
// POST /api/wedding-budget/items/payment
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const prismaClient = prisma || prismaFallback;
    
    // Parse request body
    const data = await request.json();
    const { itemId, categoryId, amount, isPaid, weddingId } = data;
    
    if (!itemId || !categoryId || amount === undefined) {
      return NextResponse.json({ error: 'Item ID, category ID, and amount are required' }, { status: 400 });
    }
    
    // Verify user owns this wedding
    const wedding = await prismaClient.wedding.findUnique({
      where: { id: weddingId }
    });
    
    if (!wedding || wedding.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get current item
    const item = await prismaClient.weddingBudgetItem.findUnique({
      where: { id: itemId }
    });
    
    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }
    
    // Calculate new actual amount
    const newActual = item.actual + amount;
    const newPaid = isPaid !== undefined ? isPaid : newActual >= item.budgeted;
    
    // Update item with new actual amount and paid status
    const updatedItem = await prismaClient.weddingBudgetItem.update({
      where: { id: itemId },
      data: {
        actual: newActual,
        paid: newPaid
      }
    });
    
    // Update category spent amount
    await prismaClient.weddingBudgetCategory.update({
      where: { id: categoryId },
      data: {
        spent: { increment: amount }
      }
    });
    
    // Update wedding spent amount
    await updateWeddingBudgetTotals(weddingId);
    
    return NextResponse.json({
      success: true,
      item: updatedItem
    });
  } catch (error) {
    console.error('Error updating payment:', error);
    return NextResponse.json(
      { error: 'Failed to update payment: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
} 