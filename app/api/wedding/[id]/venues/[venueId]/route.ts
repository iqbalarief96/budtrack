import { NextResponse } from 'next/server';
import prisma from '../../../../../../lib/prisma';
import { PrismaClient, Prisma } from '@prisma/client';

// Fallback if prisma client is not properly initialized
const prismaFallback = new PrismaClient();
const dbClient = prisma || prismaFallback;

export async function GET(
  request: Request,
  { params }: { params: { id: string; venueId: string } }
) {
  try {
    const { id: weddingId, venueId } = params;
    if (!weddingId || !venueId) {
      return NextResponse.json({ error: 'Wedding ID and Venue ID are required' }, { status: 400 });
    }

    const venue = await dbClient.venue.findUnique({
      where: { id: venueId, weddingId: weddingId },
    });

    if (!venue) {
      return NextResponse.json({ error: 'Venue not found' }, { status: 404 });
    }

    return NextResponse.json(venue, { status: 200 });
  } catch (error) {
    console.error('Error fetching venue:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Failed to fetch venue', details: errorMessage },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string; venueId: string } }
) {
  try {
    const { id: weddingId, venueId } = params;
    if (!weddingId || !venueId) {
      return NextResponse.json({ error: 'Wedding ID and Venue ID are required' }, { status: 400 });
    }
    const body = await request.json();

    // Prepare data aligning with Prisma Schema
    const dataToUpdate: Prisma.VenueUpdateInput = {
      // wedding: { connect: { id: weddingId } }, // Cannot update wedding relation directly this way
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
      // updatedAt is handled by Prisma
    };

    // Validate required fields (example: name)
    if (!dataToUpdate.name) {
      return NextResponse.json({ error: 'Venue name is required' }, { status: 400 });
    }

    // Check if venue exists first (optional but good practice)
    const existingVenue = await dbClient.venue.findUnique({
      where: { id: venueId, weddingId: weddingId },
    });

    if (!existingVenue) {
      return NextResponse.json({ error: 'Venue not found for this wedding' }, { status: 404 });
    }

    const updatedVenue = await dbClient.venue.update({
      where: { id: venueId }, // Use only venueId here
      data: dataToUpdate,
    });

    return NextResponse.json(updatedVenue, { status: 200 });
  } catch (error) {
    console.error('Error updating venue:', error);
    let statusCode = 500;
    let errorMessage = 'Failed to update venue';
    let errorDetails = error instanceof Error ? error.message : String(error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') { // Record to update not found
        statusCode = 404;
        errorMessage = 'Venue not found.';
        errorDetails = 'Record to update not found.';
      }
      // Add more Prisma error codes as needed
    }
    
    return NextResponse.json(
      { error: errorMessage, details: errorDetails },
      { status: statusCode }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string; venueId: string } }
) {
  try {
    const { id: weddingId, venueId } = params;
    if (!weddingId || !venueId) {
      return NextResponse.json({ error: 'Wedding ID and Venue ID are required' }, { status: 400 });
    }

    // Check if venue exists first (optional but good practice)
    const existingVenue = await dbClient.venue.findUnique({
      where: { id: venueId, weddingId: weddingId },
    });

    if (!existingVenue) {
      return NextResponse.json({ error: 'Venue not found for this wedding' }, { status: 404 });
    }

    await dbClient.venue.delete({
      where: { id: venueId }, // Use only venueId here
    });

    return NextResponse.json({ message: 'Venue deleted successfully' }, { status: 200 }); // Status 200 or 204
  } catch (error) {
    console.error('Error deleting venue:', error);
    let statusCode = 500;
    let errorMessage = 'Failed to delete venue';
    let errorDetails = error instanceof Error ? error.message : String(error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') { // Record to delete not found
        statusCode = 404;
        errorMessage = 'Venue not found.';
        errorDetails = 'Record to delete not found.';
      }
      // Add more Prisma error codes as needed
    }

    return NextResponse.json(
      { error: errorMessage, details: errorDetails },
      { status: statusCode }
    );
  }
} 