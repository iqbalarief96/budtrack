import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';
import { PrismaClient } from '@prisma/client';

// Fallback if prisma client is not properly initialized
const prismaFallback = new PrismaClient();

export async function GET() {
  try {
    // Get prisma client
    const prismaClient = prisma || prismaFallback;
    
    // Check if wedding table exists by trying to count the records
    try {
      // @ts-ignore - We're intentionally ignoring type checking here
      const count = await prismaClient.wedding.count();
      console.log('Wedding count:', count);
      
      // If no weddings exist, create a sample one
      if (count === 0) {
        console.log('Creating sample wedding...');
        try {
          // First get a valid user from the database
          const firstUser = await prismaClient.user.findFirst();
          
          if (!firstUser) {
            console.log('No users found in database. Cannot create sample wedding.');
            return NextResponse.json({ 
              weddings: [],
              message: 'No users found to associate with sample wedding'
            }, { status: 200 });
          }
          
          // @ts-ignore - We're intentionally ignoring type checking here
          const sampleWedding = await prismaClient.wedding.create({
            data: {
              userId: firstUser.id, // Using actual user ID from database
              title: 'Sample Wedding',
              date: new Date('2024-12-31'),
              location: 'Grand Hyatt Jakarta',
              budget: 250000000,
              spentBudget: 75000000,
              expectedGuests: 250,
              status: 'PLANNING',
              notes: 'This is a sample wedding for testing',
            }
          });
          console.log('Sample wedding created:', sampleWedding);
        } catch (createError) {
          console.error('Error creating sample wedding:', createError);
        }
      }
      
      // Fetch all weddings with their relations
      // @ts-ignore - We're intentionally ignoring type checking here
      const weddings = await prismaClient.wedding.findMany({
        include: {
          venues: true,
          vendors: true,
          documents: true,
          rundownItems: true,
          souvenirs: true,
          playlists: true,
          moodboardItems: true,
        },
      });
      
      return NextResponse.json({ weddings }, { status: 200 });
    } catch (queryError) {
      console.error('Error querying wedding table:', queryError);
      return NextResponse.json(
        { 
          error: 'Wedding model not accessible. Please ensure the Prisma schema is properly generated.',
          details: queryError instanceof Error ? queryError.message : String(queryError)
        }, 
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in wedding API route:', error);
    return NextResponse.json(
      { error: 'Failed to process request: ' + (error instanceof Error ? error.message : String(error)) },
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