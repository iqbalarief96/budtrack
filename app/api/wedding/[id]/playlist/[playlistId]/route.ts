import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireWeddingOwner } from '@/lib/route-auth';

// GET a specific playlist item
export async function GET(
  request: Request,
  { params }: { params: { id: string; playlistId: string } }
) {
  try {
    const auth = await requireWeddingOwner(params.id);
    if (auth.response) return auth.response;
    const { id: weddingId, playlistId } = params;

    if (!weddingId || !playlistId) {
      return NextResponse.json(
        { error: 'Missing required parameters', details: 'Wedding ID and Playlist ID are required' },
        { status: 400 }
      );
    }

    const playlist = await prisma.playlist.findFirst({
      where: {
        id: playlistId,
        weddingId: weddingId,
      },
    });

    if (!playlist) {
      return NextResponse.json(
        { error: 'Playlist item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(playlist);
  } catch (error) {
    console.error('Error fetching playlist item:', error);
    return NextResponse.json(
      { error: 'Failed to fetch playlist item', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// UPDATE a specific playlist item
export async function PUT(
  request: Request,
  { params }: { params: { id: string; playlistId: string } }
) {
  try {
    const auth = await requireWeddingOwner(params.id);
    if (auth.response) return auth.response;
    const { id: weddingId, playlistId } = params;

    if (!weddingId || !playlistId) {
      return NextResponse.json(
        { error: 'Missing required parameters', details: 'Wedding ID and Playlist ID are required' },
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

    // Check if playlist item exists and belongs to the wedding
    const existingPlaylist = await prisma.playlist.findFirst({
      where: {
        id: playlistId,
        weddingId: weddingId,
      },
    });

    if (!existingPlaylist) {
      return NextResponse.json(
        { error: 'Playlist item not found or does not belong to this wedding' },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData = {
      title: data.title,
      artist: data.artist,
      category: data.category ?? existingPlaylist.category,
      url: data.url ?? existingPlaylist.url,
      notes: data.notes ?? existingPlaylist.notes,
      order: data.order !== undefined ? data.order : existingPlaylist.order,
      duration: data.duration ?? existingPlaylist.duration,
      isApproved: data.isApproved !== undefined ? data.isApproved : existingPlaylist.isApproved,
    };

    const updatedPlaylist = await prisma.playlist.update({
      where: {
        id: playlistId,
      },
      data: updateData,
    });

    return NextResponse.json(updatedPlaylist);
  } catch (error) {
    console.error('Error updating playlist item:', error);
    
    // Handle validation errors
    if ((error as any).code === 'P2000') {
      return NextResponse.json(
        { error: 'Validation error', details: (error as Error).message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update playlist item', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// DELETE a specific playlist item
export async function DELETE(
  request: Request,
  { params }: { params: { id: string; playlistId: string } }
) {
  try {
    const auth = await requireWeddingOwner(params.id);
    if (auth.response) return auth.response;
    const { id: weddingId, playlistId } = params;

    if (!weddingId || !playlistId) {
      return NextResponse.json(
        { error: 'Missing required parameters', details: 'Wedding ID and Playlist ID are required' },
        { status: 400 }
      );
    }

    // Check if playlist item exists and belongs to the wedding
    const existingPlaylist = await prisma.playlist.findFirst({
      where: {
        id: playlistId,
        weddingId: weddingId,
      },
    });

    if (!existingPlaylist) {
      return NextResponse.json(
        { error: 'Playlist item not found or does not belong to this wedding' },
        { status: 404 }
      );
    }

    await prisma.playlist.delete({
      where: {
        id: playlistId,
      },
    });

    return NextResponse.json(
      { message: 'Playlist item deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting playlist item:', error);
    return NextResponse.json(
      { error: 'Failed to delete playlist item', details: (error as Error).message },
      { status: 500 }
    );
  }
} 