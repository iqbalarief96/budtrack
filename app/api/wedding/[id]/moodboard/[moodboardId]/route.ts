import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireWeddingOwner } from '@/lib/route-auth';

// GET a specific moodboard
export async function GET(
  request: Request,
  { params }: { params: { id: string; moodboardId: string } }
) {
  try {
    const auth = await requireWeddingOwner(params.id);
    if (auth.response) return auth.response;
    const { id: weddingId, moodboardId } = params;

    if (!weddingId || !moodboardId) {
      return NextResponse.json(
        { error: 'Missing required parameters', details: 'Wedding ID and Moodboard ID are required' },
        { status: 400 }
      );
    }

    const moodboard = await prisma.moodboard.findFirst({
      where: {
        id: moodboardId,
        weddingId: weddingId,
      },
    });

    if (!moodboard) {
      return NextResponse.json(
        { error: 'Moodboard not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(moodboard);
  } catch (error) {
    console.error('Error fetching moodboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch moodboard', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// UPDATE a specific moodboard
export async function PUT(
  request: Request,
  { params }: { params: { id: string; moodboardId: string } }
) {
  try {
    const auth = await requireWeddingOwner(params.id);
    if (auth.response) return auth.response;
    const { id: weddingId, moodboardId } = params;

    if (!weddingId || !moodboardId) {
      return NextResponse.json(
        { error: 'Missing required parameters', details: 'Wedding ID and Moodboard ID are required' },
        { status: 400 }
      );
    }

    const data = await request.json();

    // Validate required fields
    if (!data.title || !data.imageUrl) {
      return NextResponse.json(
        { error: 'Missing required fields', details: 'Title and imageUrl are required' },
        { status: 400 }
      );
    }

    // Check if moodboard exists and belongs to the wedding
    const existingMoodboard = await prisma.moodboard.findFirst({
      where: {
        id: moodboardId,
        weddingId: weddingId,
      },
    });

    if (!existingMoodboard) {
      return NextResponse.json(
        { error: 'Moodboard not found or does not belong to this wedding' },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData = {
      title: data.title,
      imageUrl: data.imageUrl,
      description: data.description ?? existingMoodboard.description,
      category: data.category ?? existingMoodboard.category,
      isInspiration: data.isInspiration !== undefined ? data.isInspiration : existingMoodboard.isInspiration,
      isApproved: data.isApproved !== undefined ? data.isApproved : existingMoodboard.isApproved,
      source: data.source ?? existingMoodboard.source,
      tags: Array.isArray(data.tags) ? data.tags.join(',') : data.tags ?? existingMoodboard.tags,
    };

    const updatedMoodboard = await prisma.moodboard.update({
      where: {
        id: moodboardId,
      },
      data: updateData,
    });

    return NextResponse.json(updatedMoodboard);
  } catch (error) {
    console.error('Error updating moodboard:', error);
    
    // Handle validation errors
    if ((error as any).code === 'P2000') {
      return NextResponse.json(
        { error: 'Validation error', details: (error as Error).message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update moodboard', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// DELETE a specific moodboard
export async function DELETE(
  request: Request,
  { params }: { params: { id: string; moodboardId: string } }
) {
  try {
    const auth = await requireWeddingOwner(params.id);
    if (auth.response) return auth.response;
    const { id: weddingId, moodboardId } = params;

    if (!weddingId || !moodboardId) {
      return NextResponse.json(
        { error: 'Missing required parameters', details: 'Wedding ID and Moodboard ID are required' },
        { status: 400 }
      );
    }

    // Check if moodboard exists and belongs to the wedding
    const existingMoodboard = await prisma.moodboard.findFirst({
      where: {
        id: moodboardId,
        weddingId: weddingId,
      },
    });

    if (!existingMoodboard) {
      return NextResponse.json(
        { error: 'Moodboard not found or does not belong to this wedding' },
        { status: 404 }
      );
    }

    await prisma.moodboard.delete({
      where: {
        id: moodboardId,
      },
    });

    return NextResponse.json(
      { message: 'Moodboard deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting moodboard:', error);
    return NextResponse.json(
      { error: 'Failed to delete moodboard', details: (error as Error).message },
      { status: 500 }
    );
  }
} 