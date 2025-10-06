import { NextResponse } from 'next/server';
import prisma from '../../../../../../lib/prisma'; // Adjust path depth
import { PrismaClient, Prisma } from '@prisma/client';

const prismaFallback = new PrismaClient();
const dbClient = prisma || prismaFallback;

// GET specific souvenir item (Optional)
export async function GET(
  request: Request,
  { params }: { params: { id: string, souvenirId: string } }
) {
  try {
    const { souvenirId } = params;
    const item = await dbClient.souvenir.findUnique({ where: { id: souvenirId } });
    if (!item) return NextResponse.json({ error: 'Souvenir not found' }, { status: 404 });
    return NextResponse.json(item);
  } catch (error) {
    console.error('Error fetching souvenir:', error);
    return NextResponse.json({ error: 'Failed to fetch souvenir' }, { status: 500 });
  }
}

// PUT (update) a specific souvenir by ID
export async function PUT(
  request: Request,
  { params }: { params: { id: string, souvenirId: string } }
) {
  try {
    const { id: weddingId, souvenirId } = params; // Get both IDs
    if (!souvenirId || !weddingId) {
      return NextResponse.json({ error: 'Wedding ID and Souvenir ID are required' }, { status: 400 });
    }
    const body = await request.json();

    // Prepare data for update
    const dataToUpdate: Prisma.SouvenirUpdateInput = {
      name: body.name,
      type: body.type,
      quantity: body.quantity !== undefined ? parseInt(body.quantity) : undefined,
      pricePerUnit: body.pricePerUnit !== undefined ? parseFloat(body.pricePerUnit) : undefined,
      totalBudget: body.totalBudget !== undefined ? parseFloat(body.totalBudget) : undefined,
      actualCostPerUnit: body.actualCostPerUnit !== undefined ? parseFloat(body.actualCostPerUnit) : undefined,
      totalActualCost: body.totalActualCost !== undefined ? parseFloat(body.totalActualCost) : undefined,
      vendor: body.vendor,
      description: body.description,
      imageUrl: body.imageUrl,
      status: body.status,
      orderDate: body.orderDate ? new Date(body.orderDate) : (body.orderDate === null ? null : undefined), // Handle null for clearing date
      deliveryDate: body.deliveryDate ? new Date(body.deliveryDate) : (body.deliveryDate === null ? null : undefined),
      notes: body.notes,
    };

    // Remove undefined fields
    Object.keys(dataToUpdate).forEach(key => 
        dataToUpdate[key as keyof typeof dataToUpdate] === undefined && delete dataToUpdate[key as keyof typeof dataToUpdate]
    );

     // Validate status enum if updating
     const validStatuses = ['PLANNING', 'ORDERED', 'RECEIVED'];
     if (dataToUpdate.status && !validStatuses.includes(dataToUpdate.status as string)) {
         return NextResponse.json({ error: 'Invalid souvenir status' }, { status: 400 });
     }

    // Check if item exists and belongs to the wedding
    const existingItem = await dbClient.souvenir.findUnique({ 
      where: { id: souvenirId }
    });
    if (!existingItem) {
      return NextResponse.json({ error: 'Souvenir not found' }, { status: 404 });
    }
     if (existingItem.weddingId !== weddingId) {
       return NextResponse.json({ error: 'Souvenir does not belong to this wedding' }, { status: 403 }); // Forbidden
     }

    const updatedItem = await dbClient.souvenir.update({
      where: { id: souvenirId },
      data: dataToUpdate,
    });

    return NextResponse.json(updatedItem, { status: 200 });
  } catch (error) {
    console.error('Error updating souvenir:', error);
    let statusCode = 500;
    let errorMessage = 'Failed to update souvenir';
    let errorDetails = error instanceof Error ? error.message : String(error);

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      statusCode = 404;
      errorMessage = 'Souvenir not found.';
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

// DELETE a specific souvenir by ID
export async function DELETE(
  request: Request,
  { params }: { params: { id: string, souvenirId: string } }
) {
  try {
    const { id: weddingId, souvenirId } = params;
    if (!souvenirId || !weddingId) {
      return NextResponse.json({ error: 'Wedding ID and Souvenir ID are required' }, { status: 400 });
    }

    // Check if item exists and belongs to the wedding
    const existingItem = await dbClient.souvenir.findUnique({ 
      where: { id: souvenirId } 
    });
    if (!existingItem) {
      return NextResponse.json({ error: 'Souvenir not found' }, { status: 404 });
    }
    if (existingItem.weddingId !== weddingId) {
      return NextResponse.json({ error: 'Souvenir does not belong to this wedding' }, { status: 403 }); // Forbidden
    }

    await dbClient.souvenir.delete({ where: { id: souvenirId } });

    return NextResponse.json({ message: 'Souvenir deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting souvenir:', error);
    let statusCode = 500;
    let errorMessage = 'Failed to delete souvenir';
    let errorDetails = error instanceof Error ? error.message : String(error);

     if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      statusCode = 404;
      errorMessage = 'Souvenir not found.';
    }

    return NextResponse.json(
      { error: errorMessage, details: errorDetails },
      { status: statusCode }
    );
  }
} 