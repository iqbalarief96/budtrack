import { NextResponse } from 'next/server';
import prisma from '../../../../../lib/prisma';
import { PrismaClient, Prisma } from '@prisma/client';

// Fallback if prisma client is not properly initialized
const prismaFallback = new PrismaClient();
const dbClient = prisma || prismaFallback;

// GET all documents for a specific wedding
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id: weddingId } = params;
    if (!weddingId) {
      return NextResponse.json({ error: 'Wedding ID is required' }, { status: 400 });
    }

    const documents = await dbClient.document.findMany({
      where: { weddingId: weddingId },
      orderBy: { createdAt: 'desc' } // Order by creation date
    });

    return NextResponse.json(documents, { status: 200 });
  } catch (error) {
    console.error('Error fetching documents:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Failed to fetch documents', details: errorMessage },
      { status: 500 }
    );
  }
}

// POST a new document for a specific wedding
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

    // Prepare data aligning with Prisma Document Schema
    const dataToCreate: Prisma.DocumentCreateInput = {
      wedding: { connect: { id: weddingId } }, // Connect to the wedding
      name: body.name,
      description: body.description || null,
      deadline: body.deadline ? new Date(body.deadline) : null,
      location: body.location || null,
      status: body.status || 'NOT_STARTED', // Default status if not provided
      isMandatory: Boolean(body.isMandatory),
      notes: body.notes || null,
      attachmentUrl: body.attachmentUrl || null,
      // createdAt and updatedAt are handled by Prisma
    };

    // Validate required fields (example: name)
    if (!dataToCreate.name) {
      return NextResponse.json({ error: 'Document name is required' }, { status: 400 });
    }
    // Validate status enum if needed
    const validStatuses = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'];
    if (dataToCreate.status && !validStatuses.includes(dataToCreate.status)) {
        return NextResponse.json({ error: 'Invalid document status' }, { status: 400 });
    }


    const newDocument = await dbClient.document.create({ data: dataToCreate });

    return NextResponse.json(newDocument, { status: 201 });
  } catch (error) {
    console.error('Error creating document:', error);
    let statusCode = 500;
    let errorMessage = 'Failed to create document';
    let errorDetails = error instanceof Error ? error.message : String(error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Handle specific Prisma errors if needed (e.g., P2002 for unique constraints if any)
    }

    return NextResponse.json(
      { error: errorMessage, details: errorDetails },
      { status: statusCode }
    );
  }
} 