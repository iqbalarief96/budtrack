import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { PrismaClient } from '@prisma/client';
import { requireUserId } from '@/lib/route-auth';

// Fallback if prisma client is not properly initialized
const prismaFallback = new PrismaClient();

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireUserId();
    if (auth.response) return auth.response;
    if (!params.id) {
      return NextResponse.json(
        { error: 'Playlist ID is required' },
        { status: 400 }
      );
    }

    // Get prisma client
    const prismaClient = prisma || prismaFallback;
    
    // Fetch the playlist item by ID
    // @ts-ignore - We're intentionally ignoring type checking here
    const playlist = await prismaClient.playlist.findFirst({
      where: { id: params.id, wedding: { userId: auth.userId } }
    });
    
    if (!playlist) {
      return NextResponse.json(
        { error: 'Playlist item not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ playlist }, { status: 200 });
  } catch (error) {
    console.error('Error fetching playlist item:', error);
    return NextResponse.json(
      { error: 'Failed to fetch playlist item: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireUserId();
    if (auth.response) return auth.response;
    if (!params.id) {
      return NextResponse.json(
        { error: 'Playlist ID is required' },
        { status: 400 }
      );
    }
    
    // Parse the request body
    const body = await request.json();
    
    // Validate required fields
    if (!body.title || !body.artist) {
      return NextResponse.json(
        { error: 'Title and artist are required' },
        { status: 400 }
      );
    }
    
    // Get prisma client
    const prismaClient = prisma || prismaFallback;
    
    // Check if the playlist exists
    // @ts-ignore - We're intentionally ignoring type checking here
    const existingPlaylist = await prismaClient.playlist.findFirst({
      where: { id: params.id, wedding: { userId: auth.userId } }
    });
    
    if (!existingPlaylist) {
      return NextResponse.json(
        { error: 'Playlist item not found' },
        { status: 404 }
      );
    }
    
    // Update the playlist
    // @ts-ignore - We're intentionally ignoring type checking here
    const updatedPlaylist = await prismaClient.playlist.update({
      where: { id: params.id },
      data: {
        title: body.title,
        artist: body.artist,
        category: body.category || existingPlaylist.category,
        url: body.url || existingPlaylist.url,
        notes: body.notes || existingPlaylist.notes,
        duration: body.duration || existingPlaylist.duration,
        order: body.order !== undefined ? body.order : existingPlaylist.order,
        isApproved: body.isApproved !== undefined ? body.isApproved : existingPlaylist.isApproved
      }
    });
    
    return NextResponse.json({ playlist: updatedPlaylist }, { status: 200 });
  } catch (error) {
    console.error('Error updating playlist item:', error);
    return NextResponse.json(
      { error: 'Failed to update playlist item: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireUserId();
    if (auth.response) return auth.response;
    if (!params.id) {
      return NextResponse.json(
        { error: 'Playlist ID is required' },
        { status: 400 }
      );
    }
    
    // Get prisma client
    const prismaClient = prisma || prismaFallback;
    
    // Check if the playlist exists
    // @ts-ignore - We're intentionally ignoring type checking here
    const existingPlaylist = await prismaClient.playlist.findFirst({
      where: { id: params.id, wedding: { userId: auth.userId } }
    });
    
    if (!existingPlaylist) {
      return NextResponse.json(
        { error: 'Playlist item not found' },
        { status: 404 }
      );
    }
    
    // Delete the playlist
    // @ts-ignore - We're intentionally ignoring type checking here
    await prismaClient.playlist.delete({
      where: { id: params.id }
    });
    
    return NextResponse.json({ message: 'Playlist item deleted' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting playlist item:', error);
    return NextResponse.json(
      { error: 'Failed to delete playlist item: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
} 