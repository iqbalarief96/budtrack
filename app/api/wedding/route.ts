import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { requireUserId } from '@/lib/route-auth';

// Fallback if prisma client is not properly initialized
const prismaFallback = new PrismaClient();

export async function GET(request: Request) {
  try {
    // Get current user from session
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      console.log('No authenticated user found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const prismaClient = prisma || prismaFallback;
    
    // Read-only: GET must never create data. Clients show an empty state and
    // create a wedding explicitly via POST when the user asks for it.
    const wedding = await prismaClient.wedding.findFirst({
      where: {
        userId: session.user.id
      },
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        venues: true,
        vendors: true,
        documents: true,
        rundownItems: true,
        souvenirs: true,
        playlists: true,
        moodboardItems: true,
        gifts: true,
        budgetCategories: true
      }
    });
    
    return NextResponse.json({ wedding: wedding ?? null }, { status: 200 });
  } catch (error) {
    console.error('Error fetching wedding data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch wedding data', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // Parse the request body
    const body = await request.json();
    const {
      title,
      date,
      location,
      budget,
      expectedGuests,
      status,
      notes
    } = body;

    // Always attach the wedding to the logged-in user (previously this used
    // `user.findFirst()`, i.e. whichever user happened to be first in the DB).
    const auth = await requireUserId();
    if (auth.response) return auth.response;

    const prismaClient = prisma || prismaFallback;

    // Create the wedding record
    // @ts-ignore - We're intentionally ignoring type checking here
    const wedding = await prismaClient.wedding.create({
      data: {
        userId: auth.userId,
        title: title || 'My Wedding',
        date: date ? new Date(date) : new Date(),
        location: location || null,
        budget: budget || 0,
        spentBudget: body.spentBudget || 0,
        expectedGuests: expectedGuests || 0,
        status: status || 'PLANNING',
        notes: notes || null,
      }
    });

    return NextResponse.json({ wedding }, { status: 201 });
  } catch (error) {
    console.error('Error creating wedding:', error);
    return NextResponse.json(
      { error: 'Failed to create wedding: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
} 