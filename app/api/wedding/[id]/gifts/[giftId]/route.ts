import { NextResponse } from 'next/server';
import prisma from '../../../../../../lib/prisma'; // Adjust path depth
import { PrismaClient, Prisma } from '@prisma/client';

const prismaFallback = new PrismaClient();
const dbClient = prisma || prismaFallback;

// GET specific gift item
export async function GET(
  request: Request,
  { params }: { params: { id: string, giftId: string } }
) {
  try {
    const { giftId } = params;
    const item = await dbClient.gift.findUnique({ where: { id: giftId } });
    if (!item) return NextResponse.json({ error: 'Gift item not found' }, { status: 404 });
    return NextResponse.json(item);
  } catch (error) {
    console.error('Error fetching gift item:', error);
    return NextResponse.json({ error: 'Failed to fetch gift item' }, { status: 500 });
  }
}

// PUT (update) a specific gift item by ID
export async function PUT(
  request: Request,
  { params }: { params: { id: string, giftId: string } }
) {
  try {
    const { id: weddingId, giftId } = params;
    if (!giftId || !weddingId) {
      return NextResponse.json({ error: 'Wedding ID and Gift ID are required' }, { status: 400 });
    }
    const body = await request.json();

    // Basic validation
    if (!body.name) {
      return NextResponse.json({ 
        error: 'Name is required',
        details: 'Please provide a name for the gift item'
      }, { status: 400 });
    }

    // Type conversions
    const quantity = body.quantity ? parseInt(body.quantity) : 1;
    const estimatedCost = body.estimatedCost !== undefined ? parseFloat(body.estimatedCost) : undefined;
    const actualCost = body.actualCost !== undefined ? parseFloat(body.actualCost) : undefined;

    // Prepare data for update
    const dataToUpdate: Prisma.GiftUpdateInput = {
      name: body.name,
      quantity: quantity,
      estimatedCost: estimatedCost,
      actualCost: actualCost,
      status: body.status,
      responsible: body.responsible,
      notes: body.notes
    };

    // Remove undefined fields
    Object.keys(dataToUpdate).forEach(key => 
        dataToUpdate[key as keyof typeof dataToUpdate] === undefined && delete dataToUpdate[key as keyof typeof dataToUpdate]
    );

    // Check if item exists and belongs to the wedding
    const existingItem = await dbClient.gift.findUnique({ 
      where: { id: giftId }
    });
    
    if (!existingItem) {
      return NextResponse.json({ error: 'Gift item not found' }, { status: 404 });
    }
    
    if (existingItem.weddingId !== weddingId) {
      return NextResponse.json({ error: 'Gift item does not belong to this wedding' }, { status: 403 });
    }

    const updatedItem = await dbClient.gift.update({
      where: { id: giftId },
      data: dataToUpdate,
    });

    return NextResponse.json(updatedItem, { status: 200 });
  } catch (error) {
    console.error('Error updating gift item:', error);
    let statusCode = 500;
    let errorMessage = 'Failed to update gift item';
    let errorDetails = error instanceof Error ? error.message : String(error);

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      statusCode = 404;
      errorMessage = 'Gift item not found.';
    } else if (error instanceof Prisma.PrismaClientValidationError) {
      statusCode = 400;
      errorMessage = 'Invalid data provided.';
    }

    return NextResponse.json(
      { error: errorMessage, details: errorDetails },
      { status: statusCode }
    );
  }
}

// DELETE a specific gift item by ID
export async function DELETE(
  request: Request,
  { params }: { params: { id: string, giftId: string } }
) {
  try {
    const { id: weddingId, giftId } = params;
    if (!giftId || !weddingId) {
      return NextResponse.json({ error: 'Wedding ID and Gift ID are required' }, { status: 400 });
    }

    // Check if item exists and belongs to the wedding
    const existingItem = await dbClient.gift.findUnique({ 
      where: { id: giftId } 
    });
    
    if (!existingItem) {
      return NextResponse.json({ error: 'Gift item not found' }, { status: 404 });
    }
    
    if (existingItem.weddingId !== weddingId) {
      return NextResponse.json({ error: 'Gift item does not belong to this wedding' }, { status: 403 });
    }

    await dbClient.gift.delete({ where: { id: giftId } });

    return NextResponse.json({ message: 'Gift item deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting gift item:', error);
    let statusCode = 500;
    let errorMessage = 'Failed to delete gift item';
    let errorDetails = error instanceof Error ? error.message : String(error);

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      statusCode = 404;
      errorMessage = 'Gift item not found.';
    }

    return NextResponse.json(
      { error: errorMessage, details: errorDetails },
      { status: statusCode }
    );
  }
} 