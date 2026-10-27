import { NextResponse } from 'next/server';
import prisma from '../../../../../../lib/prisma'; // Adjust path depth
import { PrismaClient, Prisma } from '@prisma/client';
import { requireWeddingOwner } from '@/lib/route-auth';

const prismaFallback = new PrismaClient();
const dbClient = prisma || prismaFallback;

// GET specific rundown item (Optional)
export async function GET(
  request: Request,
  { params }: { params: { id: string, rundownId: string } }
) {
  try {
    const auth = await requireWeddingOwner(params.id);
    if (auth.response) return auth.response;
    const { rundownId } = params;
    const item = await dbClient.rundown.findFirst({ where: { id: rundownId, weddingId: params.id } });
    if (!item) return NextResponse.json({ error: 'Rundown item not found' }, { status: 404 });
    return NextResponse.json(item);
  } catch (error) {
    console.error('Error fetching rundown item:', error);
    return NextResponse.json({ error: 'Failed to fetch rundown item' }, { status: 500 });
  }
}

// PUT (update) a specific rundown item by ID
export async function PUT(
  request: Request,
  { params }: { params: { id: string, rundownId: string } }
) {
  try {
    const auth = await requireWeddingOwner(params.id);
    if (auth.response) return auth.response;
    const { id: weddingId, rundownId } = params; // Correctly destructure weddingId from id
    if (!weddingId || !rundownId) { // Check both IDs
      return NextResponse.json({ error: 'Wedding ID and Rundown Item ID are required' }, { status: 400 });
    }
    const body = await request.json();

    // Prepare data for update
    const dataToUpdate: Prisma.RundownUpdateInput = {
      title: body.title,
      startTime: body.startTime ? new Date(body.startTime) : undefined, // Update only if provided
      endTime: body.endTime ? new Date(body.endTime) : undefined,
      description: body.description,
      location: body.location,
      responsible: body.responsible,
      category: body.category,
      notes: body.notes,
      // wedding relation and updatedAt handled by Prisma/checks
    };

    // Remove undefined fields
    Object.keys(dataToUpdate).forEach(key => 
        dataToUpdate[key as keyof typeof dataToUpdate] === undefined && delete dataToUpdate[key as keyof typeof dataToUpdate]
    );

     // Check if item exists
     const existingItem = await dbClient.rundown.findFirst({
       where: { id: rundownId, weddingId: params.id },
     });
 
     if (!existingItem) {
       return NextResponse.json({ error: 'Rundown item not found' }, { status: 404 });
     }
     // Optional: Check if item belongs to the correct weddingId before update if needed

    const updatedItem = await dbClient.rundown.update({
      where: { id: rundownId },
      data: dataToUpdate,
    });

    return NextResponse.json(updatedItem, { status: 200 });
  } catch (error) {
    console.error('Error updating rundown item:', error);
    let statusCode = 500;
    let errorMessage = 'Failed to update rundown item';
    let errorDetails = error instanceof Error ? error.message : String(error);

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      statusCode = 404;
      errorMessage = 'Rundown item not found.';
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

// DELETE a specific rundown item by ID
export async function DELETE(
  request: Request,
  { params }: { params: { id: string, rundownId: string } }
) {
  try {
    const auth = await requireWeddingOwner(params.id);
    if (auth.response) return auth.response;
    const { rundownId } = params;
    if (!rundownId) {
      return NextResponse.json({ error: 'Rundown Item ID is required' }, { status: 400 });
    }

    // Check if item exists
    const existingItem = await dbClient.rundown.findFirst({
      where: { id: rundownId, weddingId: params.id },
    });

    if (!existingItem) {
      return NextResponse.json({ error: 'Rundown item not found' }, { status: 404 });
    }
     // Optional: Check if item belongs to the correct weddingId before delete if needed

    await dbClient.rundown.delete({ where: { id: rundownId } });

    return NextResponse.json({ message: 'Rundown item deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting rundown item:', error);
    let statusCode = 500;
    let errorMessage = 'Failed to delete rundown item';
    let errorDetails = error instanceof Error ? error.message : String(error);

     if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      statusCode = 404;
      errorMessage = 'Rundown item not found.';
    }

    return NextResponse.json(
      { error: errorMessage, details: errorDetails },
      { status: statusCode }
    );
  }
} 