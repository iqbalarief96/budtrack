import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { PrismaClient } from '@prisma/client';

// Fallback if prisma client is not properly initialized
const prismaFallback = new PrismaClient();

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    if (!params.id) {
      return NextResponse.json(
        { error: 'Moodboard ID is required' },
        { status: 400 }
      );
    }

    // Get prisma client
    const prismaClient = prisma || prismaFallback;
    
    // Fetch the moodboard item by ID
    // @ts-ignore - We're intentionally ignoring type checking here
    const moodboardItem = await prismaClient.moodboard.findUnique({
      where: { id: params.id }
    });
    
    if (!moodboardItem) {
      return NextResponse.json(
        { error: 'Moodboard item not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ moodboardItem }, { status: 200 });
  } catch (error) {
    console.error('Error fetching moodboard item:', error);
    return NextResponse.json(
      { error: 'Failed to fetch moodboard item: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    if (!params.id) {
      return NextResponse.json(
        { error: 'Moodboard ID is required' },
        { status: 400 }
      );
    }
    
    // Parse the request body
    const body = await request.json();
    
    // Validate required fields
    if (!body.title || !body.imageUrl) {
      return NextResponse.json(
        { error: 'Title and image URL are required' },
        { status: 400 }
      );
    }
    
    // Get prisma client
    const prismaClient = prisma || prismaFallback;
    
    // Check if the moodboard item exists
    // @ts-ignore - We're intentionally ignoring type checking here
    const existingMoodboardItem = await prismaClient.moodboard.findUnique({
      where: { id: params.id }
    });
    
    if (!existingMoodboardItem) {
      return NextResponse.json(
        { error: 'Moodboard item not found' },
        { status: 404 }
      );
    }
    
    // Update the moodboard item
    // @ts-ignore - We're intentionally ignoring type checking here
    const updatedMoodboardItem = await prismaClient.moodboard.update({
      where: { id: params.id },
      data: {
        title: body.title,
        description: body.description || existingMoodboardItem.description,
        imageUrl: body.imageUrl,
        category: body.category || existingMoodboardItem.category,
        isInspiration: body.isInspiration !== undefined ? body.isInspiration : existingMoodboardItem.isInspiration,
        isApproved: body.isApproved !== undefined ? body.isApproved : existingMoodboardItem.isApproved,
        source: body.source || existingMoodboardItem.source
      }
    });
    
    return NextResponse.json({ moodboardItem: updatedMoodboardItem }, { status: 200 });
  } catch (error) {
    console.error('Error updating moodboard item:', error);
    return NextResponse.json(
      { error: 'Failed to update moodboard item: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    if (!params.id) {
      return NextResponse.json(
        { error: 'Moodboard ID is required' },
        { status: 400 }
      );
    }
    
    // Get prisma client
    const prismaClient = prisma || prismaFallback;
    
    // Check if the moodboard item exists
    // @ts-ignore - We're intentionally ignoring type checking here
    const existingMoodboardItem = await prismaClient.moodboard.findUnique({
      where: { id: params.id }
    });
    
    if (!existingMoodboardItem) {
      return NextResponse.json(
        { error: 'Moodboard item not found' },
        { status: 404 }
      );
    }
    
    // Delete the moodboard item
    // @ts-ignore - We're intentionally ignoring type checking here
    await prismaClient.moodboard.delete({
      where: { id: params.id }
    });
    
    return NextResponse.json({ message: 'Moodboard item deleted' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting moodboard item:', error);
    return NextResponse.json(
      { error: 'Failed to delete moodboard item: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
} 