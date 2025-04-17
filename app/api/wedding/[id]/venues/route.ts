import { NextResponse } from 'next/server';
import prisma from '../../../../../lib/prisma';
import { PrismaClient, Prisma } from '@prisma/client';

// Fallback if prisma client is not properly initialized
const prismaFallback = new PrismaClient();
const dbClient = prisma || prismaFallback;

// GET all venues for a specific wedding
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id: weddingId } = params;
    if (!weddingId) {
      return NextResponse.json({ error: 'Wedding ID is required' }, { status: 400 });
    }

    const venues = await dbClient.venue.findMany({
      where: { weddingId: weddingId },
      orderBy: { createdAt: 'desc' } // Optional: order by creation date
    });

    return NextResponse.json(venues, { status: 200 });
  } catch (error) {
    console.error('Error fetching venues:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Failed to fetch venues', details: errorMessage },
      { status: 500 }
    );
  }
}

// POST a new venue for a specific wedding
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id: weddingId } = params;
    if (!weddingId) {
      return NextResponse.json({ error: 'Wedding ID is required' }, { status: 400 });
    }
    const body = await request.json();

    // Prepare data aligning with Prisma Schema
    const dataToCreate: Prisma.VenueCreateInput = {
      wedding: { connect: { id: weddingId } }, // Connect to the wedding
      name: body.name,
      address: body.address || null,
      capacity: body.capacity !== null ? Number(body.capacity) : null,
      priceRange: body.priceRange || null,
      features: typeof body.features === 'string' ? body.features : null, // Ensure it's string or null
      imageUrl: body.imageUrl || null,
      isBooked: Boolean(body.isBooked),
      bookingDate: body.bookingDate ? new Date(body.bookingDate) : null,
      depositAmount: body.depositAmount !== null ? Number(body.depositAmount) : null,
      contactPerson: body.contactPerson || null,
      phone: body.phone || null,
      email: body.email || null,
      website: body.website || null,
      notes: body.notes || null,
      // createdAt and updatedAt are handled by Prisma
    };

    // Validate required fields (example: name)
    if (!dataToCreate.name) {
      return NextResponse.json({ error: 'Venue name is required' }, { status: 400 });
    }

    const newVenue = await dbClient.venue.create({ data: dataToCreate });

    return NextResponse.json(newVenue, { status: 201 });
  } catch (error) {
    console.error('Error creating venue:', error);
    let statusCode = 500;
    let errorMessage = 'Failed to create venue';
    let errorDetails = error instanceof Error ? error.message : String(error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Handle specific Prisma errors if needed
      if (error.code === 'P2002') { // Unique constraint violation
        statusCode = 409;
        errorMessage = 'A venue with this name might already exist.';
        errorDetails = 'Unique constraint failed.';
      }
       // Add more Prisma error codes as needed
    }

    return NextResponse.json(
      { error: errorMessage, details: errorDetails },
      { status: statusCode }
    );
  }
} 