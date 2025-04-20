import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

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
    
    // Try to find an existing wedding for the user
    let wedding = await prismaClient.wedding.findFirst({
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
    
    // If no wedding exists, create a new one
    if (!wedding) {
      console.log('No wedding found for user, creating a new one');
      
      // Create a new wedding with default values
      wedding = await prismaClient.wedding.create({
        data: {
          userId: session.user.id,
          title: 'My Wedding',
          date: new Date('2024-12-31'),
          location: 'Grand Hyatt Jakarta',
          budget: 250000000, // Default budget of 250 million
          spentBudget: 75000000, // Default spent of 75 million
          expectedGuests: 250,
          status: 'PLANNING'
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
      
      console.log('Created new wedding with ID:', wedding.id);
    }
    
    return NextResponse.json({ wedding }, { status: 200 });
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

    // Get a valid user
    const prismaClient = prisma || prismaFallback;
    const user = await prismaClient.user.findFirst();
    
    if (!user) {
      return NextResponse.json(
        { error: 'No user found in database to associate with wedding' },
        { status: 400 }
      );
    }

    // Create the wedding record
    // @ts-ignore - We're intentionally ignoring type checking here
    const wedding = await prismaClient.wedding.create({
      data: {
        userId: user.id,
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