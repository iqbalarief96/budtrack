import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';
import { PrismaClient } from '@prisma/client';
import { requireUserId, requireWeddingOwner } from '@/lib/route-auth';

// Fallback if prisma client is not properly initialized
const prismaFallback = new PrismaClient();

export async function GET(request: Request) {
  try {
    // Get URL parameters
    const url = new URL(request.url);
    const weddingId = url.searchParams.get('weddingId');
    const auth = await requireUserId();
    if (auth.response) return auth.response;
    if (weddingId) {
      const owner = await requireWeddingOwner(weddingId);
      if (owner.response) return owner.response;
    }
    
    // Get prisma client
    const prismaClient = prisma || prismaFallback;
    
    // Set up filter based on weddingId if provided
    const filter = weddingId ? { weddingId } : {};
    
    // Fetch playlists with the filter
    // @ts-ignore - We're intentionally ignoring type checking here
    const playlists = await prismaClient.playlist.findMany({
      where: { ...filter, wedding: { userId: auth.userId } },
      orderBy: { order: 'asc' }
    });
    
    return NextResponse.json({ playlists }, { status: 200 });
  } catch (error) {
    console.error('Error in playlist API route:', error);
    return NextResponse.json(
      { error: 'Failed to fetch playlists: ' + (error instanceof Error ? error.message : String(error)) },
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
      artist,
      duration,
      category,
      url,
      notes,
      order,
      isApproved
    } = body;
    const auth = await requireWeddingOwner(weddingId);
    if (auth.response) return auth.response;
    
    // Validate required fields
    if (!weddingId || !title || !artist) {
      return NextResponse.json(
        { error: 'Wedding ID, title and artist are required' },
        { status: 400 }
      );
    }
    
    // Get prisma client
    const prismaClient = prisma || prismaFallback;
    
    // Create the playlist record
    // @ts-ignore - We're intentionally ignoring type checking here
    const playlist = await prismaClient.playlist.create({
      data: {
        weddingId,
        title,
        artist,
        duration: duration || null,
        category: category || null,
        url: url || null,
        notes: notes || null,
        order: order || null,
        isApproved: isApproved || false
      }
    });
    
    return NextResponse.json({ playlist }, { status: 201 });
  } catch (error) {
    console.error('Error creating playlist:', error);
    return NextResponse.json(
      { error: 'Failed to create playlist: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
} 