import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { PrismaClient } from '@prisma/client';
import { DEMO_WEDDING_ID } from '../../../wedding-planner/constants';

// Fallback if prisma client is not properly initialized
const prismaFallback = new PrismaClient();

export async function GET() {
  try {
    // Get prisma client
    const prismaClient = prisma || prismaFallback;
    
    // Check if wedding with DEMO_WEDDING_ID exists
    try {
      // @ts-ignore - We're intentionally ignoring type checking here
      const existingWedding = await prismaClient.wedding.findUnique({
        where: { id: DEMO_WEDDING_ID }
      });
      
      if (existingWedding) {
        return NextResponse.json({ 
          message: 'Demo wedding already exists',
          wedding: existingWedding
        }, { status: 200 });
      }
      
      // If wedding doesn't exist, create it with the specified ID
      // First get a valid user from the database
      const firstUser = await prismaClient.user.findFirst();
      
      if (!firstUser) {
        return NextResponse.json({ 
          error: 'No users found in database. Cannot create demo wedding.'
        }, { status: 400 });
      }
      
      // @ts-ignore - We're intentionally ignoring type checking here
      const demoWedding = await prismaClient.wedding.create({
        data: {
          id: DEMO_WEDDING_ID, // Using our specific ID
          userId: firstUser.id,
          title: 'Demo Wedding',
          date: new Date('2024-12-31'),
          location: 'Grand Hyatt Jakarta',
          budget: 250000000,
          spentBudget: 75000000,
          expectedGuests: 250,
          status: 'PLANNING',
          notes: 'This is a demo wedding for testing',
        }
      });
      
      return NextResponse.json({ 
        message: 'Demo wedding created successfully',
        wedding: demoWedding
      }, { status: 201 });
    } catch (error) {
      console.error('Error creating demo wedding:', error);
      return NextResponse.json({
        error: 'Failed to create demo wedding',
        details: error instanceof Error ? error.message : String(error)
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in wedding seed API route:', error);
    return NextResponse.json({
      error: 'Failed to process request',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 