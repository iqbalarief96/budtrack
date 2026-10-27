import { NextResponse } from 'next/server';
import prisma from '../../../../../../lib/prisma'; // Adjust path depth
import { PrismaClient, Prisma } from '@prisma/client';
import { requireWeddingOwner } from '@/lib/route-auth';

const prismaFallback = new PrismaClient();
const dbClient = prisma || prismaFallback;

// GET a specific document by ID (Optional, good for fetching details if needed)
export async function GET(
  request: Request,
  { params }: { params: { id: string, documentId: string } }
) {
  try {
    const auth = await requireWeddingOwner(params.id);
    if (auth.response) return auth.response;
    const { id: weddingId, documentId } = params;
    if (!weddingId || !documentId) {
      return NextResponse.json({ error: 'Wedding ID and Document ID are required' }, { status: 400 });
    }

    const document = await dbClient.document.findFirst({
      where: { id: documentId, weddingId: weddingId },
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    return NextResponse.json(document, { status: 200 });
  } catch (error) {
    console.error('Error fetching document:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Failed to fetch document', details: errorMessage },
      { status: 500 }
    );
  }
}

// PUT (update) a specific document by ID
export async function PUT(
  request: Request,
  { params }: { params: { id: string, documentId: string } }
) {
  try {
    const auth = await requireWeddingOwner(params.id);
    if (auth.response) return auth.response;
    const { id: weddingId, documentId } = params;
    if (!weddingId || !documentId) {
      return NextResponse.json({ error: 'Wedding ID and Document ID are required' }, { status: 400 });
    }
    const body = await request.json();

    // Prepare data aligning with Prisma Document Schema
    const dataToUpdate: Prisma.DocumentUpdateInput = {
      name: body.name,
      description: body.description,
      deadline: body.deadline ? new Date(body.deadline) : null,
      location: body.location,
      status: body.status,
      isMandatory: body.isMandatory !== undefined ? Boolean(body.isMandatory) : undefined,
      notes: body.notes,
      attachmentUrl: body.attachmentUrl,
      // wedding relation cannot be updated here
      // updatedAt is handled by Prisma
    };

    // Remove undefined fields so Prisma doesn't try to set them to null
    Object.keys(dataToUpdate).forEach(key => 
        dataToUpdate[key as keyof typeof dataToUpdate] === undefined && delete dataToUpdate[key as keyof typeof dataToUpdate]
    );

    // Validate required fields (e.g., name if updating)
    if (dataToUpdate.name === '') {
      return NextResponse.json({ error: 'Document name cannot be empty' }, { status: 400 });
    }
     // Validate status enum if needed
     const validStatuses = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'];
     if (dataToUpdate.status && !validStatuses.includes(dataToUpdate.status as string)) {
         return NextResponse.json({ error: 'Invalid document status' }, { status: 400 });
     }

    // Check if document exists first
    const existingDocument = await dbClient.document.findFirst({
      where: { id: documentId, weddingId: weddingId },
    });

    if (!existingDocument) {
      return NextResponse.json({ error: 'Document not found for this wedding' }, { status: 404 });
    }

    const updatedDocument = await dbClient.document.update({
      where: { id: documentId },
      data: dataToUpdate,
    });

    return NextResponse.json(updatedDocument, { status: 200 });
  } catch (error) {
    console.error('Error updating document:', error);
    let statusCode = 500;
    let errorMessage = 'Failed to update document';
    let errorDetails = error instanceof Error ? error.message : String(error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') { // Record to update not found
        statusCode = 404;
        errorMessage = 'Document not found.';
      }
    }

    return NextResponse.json(
      { error: errorMessage, details: errorDetails },
      { status: statusCode }
    );
  }
}

// DELETE a specific document by ID
export async function DELETE(
  request: Request,
  { params }: { params: { id: string, documentId: string } }
) {
  try {
    const auth = await requireWeddingOwner(params.id);
    if (auth.response) return auth.response;
    const { id: weddingId, documentId } = params;
    if (!weddingId || !documentId) {
      return NextResponse.json({ error: 'Wedding ID and Document ID are required' }, { status: 400 });
    }

    // Check if document exists first
    const existingDocument = await dbClient.document.findFirst({
      where: { id: documentId, weddingId: weddingId },
    });

    if (!existingDocument) {
      return NextResponse.json({ error: 'Document not found for this wedding' }, { status: 404 });
    }

    await dbClient.document.delete({
      where: { id: documentId },
    });

    return NextResponse.json({ message: 'Document deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting document:', error);
    let statusCode = 500;
    let errorMessage = 'Failed to delete document';
    let errorDetails = error instanceof Error ? error.message : String(error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') { // Record to delete not found
        statusCode = 404;
        errorMessage = 'Document not found.';
      }
    }

    return NextResponse.json(
      { error: errorMessage, details: errorDetails },
      { status: statusCode }
    );
  }
} 