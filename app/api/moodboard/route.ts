import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';
import { PrismaClient } from '@prisma/client';

// Fallback if prisma client is not properly initialized
const prismaFallback = new PrismaClient();

export async function GET(request: Request) {
  try {
    // Get URL parameters
    const url = new URL(request.url);
    const weddingId = url.searchParams.get('weddingId');
    const category = url.searchParams.get('category');
    
    // Get prisma client
    const prismaClient = prisma || prismaFallback;
    
    // Set up filter based on weddingId and category if provided
    let filter: any = {};
    
    if (weddingId) filter.weddingId = weddingId;
    if (category) filter.category = category;
    
    // Fetch moodboard items with the filter
    // @ts-ignore - We're intentionally ignoring type checking here
    const moodboardItems = await prismaClient.moodboard.findMany({
      where: filter,
      orderBy: { createdAt: 'desc' }
    });
    
    return NextResponse.json({ moodboardItems }, { status: 200 });
  } catch (error) {
    console.error('Error in moodboard API route:', error);
    return NextResponse.json(
      { error: 'Failed to fetch moodboard items: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // Parse the request body
    const body = await request.json();
    const {
      weddingId,
      title,
      description,
      imageUrl,
      category,
      isInspiration,
      isApproved,
      source
    } = body;
    
    // Validate required fields
    if (!weddingId || !title || !imageUrl) {
      return NextResponse.json(
        { error: 'Wedding ID, title and image URL are required' },
        { status: 400 }
      );
    }
    
    // Get prisma client
    const prismaClient = prisma || prismaFallback;
    
    // Create the moodboard item
    // @ts-ignore - We're intentionally ignoring type checking here
    const moodboardItem = await prismaClient.moodboard.create({
      data: {
        weddingId,
        title,
        description: description || null,
        imageUrl,
        category: category || null,
        isInspiration: isInspiration !== undefined ? isInspiration : true,
        isApproved: isApproved || false,
        source: source || null
      }
    });
    
    return NextResponse.json({ moodboardItem }, { status: 201 });
  } catch (error) {
    console.error('Error creating moodboard item:', error);
    return NextResponse.json(
      { error: 'Failed to create moodboard item: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
} 