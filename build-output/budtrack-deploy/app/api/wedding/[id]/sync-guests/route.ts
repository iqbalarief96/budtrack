import { NextResponse } from 'next/server';
import prisma from '../../../../../lib/prisma';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { updateWeddingGuestCount } from '../../utils';

// Fallback prisma client
const prismaFallback = new PrismaClient();

// POST /api/wedding/[id]/sync-guests - Sinkronisasi jumlah tamu di wedding
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id: weddingId } = params;
    console.log('Syncing guest count for wedding ID:', weddingId);
    
    // Get session
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      console.log('No authenticated user found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const prismaClient = prisma || prismaFallback;
    
    // Verify user owns this wedding
    const wedding = await prismaClient.wedding.findUnique({
      where: { 
        id: weddingId,
        userId: session.user.id
      }
    });
    
    if (!wedding) {
      console.log('Wedding not found or unauthorized');
      return NextResponse.json({ error: 'Wedding not found or unauthorized' }, { status: 404 });
    }
    
    // Update guest count
    const result = await updateWeddingGuestCount(weddingId);
    
    // Fetch updated wedding
    const updatedWedding = await prismaClient.wedding.findUnique({
      where: { id: weddingId }
    });
    
    return NextResponse.json({
      success: true,
      result,
      wedding: updatedWedding
    }, { status: 200 });
  } catch (error) {
    console.error('Error syncing wedding guest count:', error);
    return NextResponse.json(
      { error: 'Failed to sync wedding guest count: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
} 