import { NextResponse } from 'next/server';
import prisma from '../../../../../lib/prisma';
import { PrismaClient, Prisma } from '@prisma/client';

const prismaFallback = new PrismaClient();
const dbClient = prisma || prismaFallback;

// GET all rundown items for a specific wedding
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id: weddingId } = params;
    if (!weddingId) {
      return NextResponse.json({ error: 'Wedding ID is required' }, { status: 400 });
    }

    const rundownItems = await dbClient.rundown.findMany({
      where: { weddingId: weddingId },
      orderBy: { startTime: 'asc' } // Order by start time
    });

    return NextResponse.json(rundownItems, { status: 200 });
  } catch (error) {
    console.error('Error fetching rundown items:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Failed to fetch rundown items', details: errorMessage },
      { status: 500 }
    );
  }
}

// POST a new rundown item for a specific wedding
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id: weddingId } = params;
    if (!weddingId) {
      return NextResponse.json({ error: 'Wedding ID is required' }, { status: 400 });
    }
    const body = await request.json();

    // Prepare data aligning with Prisma Rundown Schema
    const dataToCreate: Prisma.RundownCreateInput = {
      wedding: { connect: { id: weddingId } },
      title: body.title,
      startTime: body.startTime ? new Date(body.startTime) : new Date(), // Ensure Date object
      endTime: body.endTime ? new Date(body.endTime) : new Date(),     // Ensure Date object
      description: body.description || null,
      location: body.location || null,
      responsible: body.responsible || null,
      category: body.category || null,
      notes: body.notes || null,
      // createdAt and updatedAt are handled by Prisma
    };

    // Validate required fields (e.g., title, startTime, endTime)
    if (!dataToCreate.title || !dataToCreate.startTime || !dataToCreate.endTime) {
      return NextResponse.json({ error: 'Title, start time, and end time are required' }, { status: 400 });
    }

    const newRundownItem = await dbClient.rundown.create({ data: dataToCreate });

    return NextResponse.json(newRundownItem, { status: 201 });
  } catch (error) {
    console.error('Error creating rundown item:', error);
    let statusCode = 500;
    let errorMessage = 'Failed to create rundown item';
    let errorDetails = error instanceof Error ? error.message : String(error);

    // Handle potential Prisma errors (e.g., validation)
    if (error instanceof Prisma.PrismaClientValidationError) {
        statusCode = 400;
        errorMessage = 'Invalid data provided for rundown item.';
        errorDetails = error.message; 
    }

    return NextResponse.json(
      { error: errorMessage, details: errorDetails },
      { status: statusCode }
    );
  }
} 