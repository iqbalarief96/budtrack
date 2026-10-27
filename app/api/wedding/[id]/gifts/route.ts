import { NextResponse } from 'next/server';
import prisma from '../../../../../lib/prisma';
import { PrismaClient, Prisma } from '@prisma/client';
import { requireWeddingOwner } from '@/lib/route-auth';

const prismaFallback = new PrismaClient();
const dbClient = prisma || prismaFallback;

// GET all gift items for a specific wedding
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireWeddingOwner(params.id);
    if (auth.response) return auth.response;
    const { id: weddingId } = params;
    if (!weddingId) {
      return NextResponse.json({ error: 'Wedding ID is required' }, { status: 400 });
    }

    const gifts = await dbClient.gift.findMany({
      where: { weddingId: weddingId },
      orderBy: { createdAt: 'desc' } // Most recent first
    });

    return NextResponse.json(gifts, { status: 200 });
  } catch (error) {
    console.error('Error fetching gifts:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Failed to fetch gifts', details: errorMessage },
      { status: 500 }
    );
  }
}

// POST a new gift item for a specific wedding
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireWeddingOwner(params.id);
    if (auth.response) return auth.response;
    const { id: weddingId } = params;
    if (!weddingId) {
      return NextResponse.json({ error: 'Wedding ID is required' }, { status: 400 });
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
    const estimatedCost = body.estimatedCost ? parseFloat(body.estimatedCost) : 0;
    const actualCost = body.actualCost ? parseFloat(body.actualCost) : 0;

    // Prepare data aligning with Prisma Gift Schema
    const dataToCreate: Prisma.GiftCreateInput = {
      wedding: { connect: { id: weddingId } },
      name: body.name,
      quantity: quantity,
      estimatedCost: estimatedCost,
      actualCost: actualCost,
      status: body.status || 'not-started',
      responsible: body.responsible || null,
      notes: body.notes || null
    };

    const newGift = await dbClient.gift.create({ data: dataToCreate });

    return NextResponse.json(newGift, { status: 201 });
  } catch (error) {
    console.error('Error creating gift item:', error);
    let statusCode = 500;
    let errorMessage = 'Failed to create gift item';
    let errorDetails = error instanceof Error ? error.message : String(error);

    // Handle potential Prisma errors (e.g., validation)
    if (error instanceof Prisma.PrismaClientValidationError) {
        statusCode = 400;
        errorMessage = 'Invalid data provided for gift item.';
        errorDetails = error.message; 
    }

    return NextResponse.json(
      { error: errorMessage, details: errorDetails },
      { status: statusCode }
    );
  }
} 