import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET all moodboards for a specific wedding
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const weddingId = params.id;
    
    if (!weddingId) {
      return NextResponse.json(
        { error: 'Missing wedding ID' },
        { status: 400 }
      );
    }

    const moodboards = await prisma.moodboard.findMany({
      where: {
        weddingId: weddingId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(moodboards);
  } catch (error) {
    console.error('Error fetching moodboards:', error);
    return NextResponse.json(
      { error: 'Failed to fetch moodboards', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// POST a new moodboard
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const weddingId = params.id;
    
    if (!weddingId) {
      return NextResponse.json(
        { error: 'Missing wedding ID' },
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

    // Prepare data for Prisma
    const moodboardData = {
      weddingId,
      title: data.title,
      imageUrl: data.imageUrl,
      description: data.description || null,
      category: data.category || null,
      isInspiration: data.isInspiration !== undefined ? data.isInspiration : true,
      isApproved: data.isApproved !== undefined ? data.isApproved : false,
      source: data.source || null,
      tags: Array.isArray(data.tags) ? data.tags.join(',') : data.tags || null,
    };

    const newMoodboard = await prisma.moodboard.create({
      data: moodboardData,
    });

    return NextResponse.json(newMoodboard, { status: 201 });
  } catch (error) {
    console.error('Error creating moodboard:', error);
    
    // Handle Prisma known request errors
    if ((error as any).code === 'P2002') {
      return NextResponse.json(
        { error: 'Duplicate entry', details: 'A moodboard with this identifier already exists' },
        { status: 409 }
      );
    }
    
    // Handle validation errors
    if ((error as any).code === 'P2000') {
      return NextResponse.json(
        { error: 'Validation error', details: (error as Error).message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create moodboard', details: (error as Error).message },
      { status: 500 }
    );
  }
} 