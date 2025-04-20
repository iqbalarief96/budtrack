import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { PrismaClient } from '@prisma/client';
import { updateWeddingBudgetTotals } from '../utils';

// Fallback prisma jika ada masalah
const prismaFallback = new PrismaClient();

// POST /api/wedding-budget/sync - Sinkronisasi budget wedding
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const prismaClient = prisma || prismaFallback;
    
    // Get wedding ID from URL query param
    const { searchParams } = new URL(request.url);
    const weddingId = searchParams.get('weddingId');
    
    if (!weddingId) {
      return NextResponse.json({ error: 'Wedding ID is required' }, { status: 400 });
    }
    
    // Verify user owns this wedding
    const wedding = await prismaClient.wedding.findUnique({
      where: { 
        id: weddingId,
        userId: session.user.id
      }
    });
    
    if (!wedding) {
      return NextResponse.json({ 
        error: 'Wedding not found or you do not have permission to access it' 
      }, { status: 404 });
    }
    
    // Run the sync function
    const result = await updateWeddingBudgetTotals(weddingId);
    
    // Get updated wedding
    const updatedWedding = await prismaClient.wedding.findUnique({
      where: { id: weddingId }
    });
    
    return NextResponse.json({
      success: true,
      result,
      wedding: updatedWedding
    });
  } catch (error) {
    console.error('Error syncing wedding budget:', error);
    return NextResponse.json(
      { error: 'Failed to sync wedding budget: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
} 