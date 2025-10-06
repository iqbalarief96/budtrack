import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET all playlist items for a specific wedding
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

    const playlists = await prisma.playlist.findMany({
      where: {
        weddingId: weddingId,
      },
      orderBy: [
        { order: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json(playlists);
  } catch (error) {
    console.error('Error fetching playlists:', error);
    return NextResponse.json(
      { error: 'Failed to fetch playlists', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// POST a new playlist item
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
    if (!data.title || !data.artist) {
      return NextResponse.json(
        { error: 'Missing required fields', details: 'Title and artist are required' },
        { status: 400 }
      );
    }

    // Prepare data for Prisma
    const playlistData = {
      weddingId,
      title: data.title,
      artist: data.artist,
      category: data.category || null,
      url: data.url || null,
      notes: data.notes || null,
      order: data.order !== undefined ? data.order : null,
      duration: data.duration || null,
      isApproved: data.isApproved !== undefined ? data.isApproved : false,
    };

    const newPlaylist = await prisma.playlist.create({
      data: playlistData,
    });

    return NextResponse.json(newPlaylist, { status: 201 });
  } catch (error) {
    console.error('Error creating playlist item:', error);
    
    // Handle Prisma known request errors
    if ((error as any).code === 'P2002') {
      return NextResponse.json(
        { error: 'Duplicate entry', details: 'A playlist item with this identifier already exists' },
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
      { error: 'Failed to create playlist item', details: (error as Error).message },
      { status: 500 }
    );
  }
} 