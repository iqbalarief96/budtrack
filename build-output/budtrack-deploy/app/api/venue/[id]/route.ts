import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { PrismaClient } from '@prisma/client';

// Fallback if prisma client is not properly initialized
const prismaFallback = new PrismaClient();

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    if (!params.id) {
      return NextResponse.json(
        { error: 'Venue ID is required' },
        { status: 400 }
      );
    }

    // Get prisma client
    const prismaClient = prisma || prismaFallback;
    
    // Fetch the venue by ID
    // @ts-ignore - We're intentionally ignoring type checking here
    const venue = await prismaClient.venue.findUnique({
      where: { id: params.id }
    });
    
    if (!venue) {
      return NextResponse.json(
        { error: 'Venue not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ venue }, { status: 200 });
  } catch (error) {
    console.error('Error fetching venue:', error);
    return NextResponse.json(
      { error: 'Failed to fetch venue: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    if (!params.id) {
      return NextResponse.json(
        { error: 'Venue ID is required' },
        { status: 400 }
      );
    }
    
    // Parse the request body
    const body = await request.json();
    
    // Validate required fields
    if (!body.name || !body.address) {
      return NextResponse.json(
        { error: 'Name and address are required' },
        { status: 400 }
      );
    }
    
    // Get prisma client
    const prismaClient = prisma || prismaFallback;
    
    // Check if the venue exists
    // @ts-ignore - We're intentionally ignoring type checking here
    const existingVenue = await prismaClient.venue.findUnique({
      where: { id: params.id }
    });
    
    if (!existingVenue) {
      return NextResponse.json(
        { error: 'Venue not found' },
        { status: 404 }
      );
    }
    
    // Format booking date if provided
    const bookingDate = body.bookingDate ? new Date(body.bookingDate) : existingVenue.bookingDate;
    
    // Update the venue
    // @ts-ignore - We're intentionally ignoring type checking here
    const updatedVenue = await prismaClient.venue.update({
      where: { id: params.id },
      data: {
        name: body.name,
        address: body.address,
        capacity: body.capacity !== undefined ? body.capacity : existingVenue.capacity,
        priceRange: body.priceRange || existingVenue.priceRange,
        contactPerson: body.contactPerson || existingVenue.contactPerson,
        phone: body.phone || existingVenue.phone,
        email: body.email || existingVenue.email,
        website: body.website || existingVenue.website,
        notes: body.notes || existingVenue.notes,
        isBooked: body.isBooked !== undefined ? body.isBooked : existingVenue.isBooked,
        bookingDate: bookingDate,
        depositAmount: body.depositAmount !== undefined ? body.depositAmount : existingVenue.depositAmount,
        imageUrl: body.imageUrl || existingVenue.imageUrl
      }
    });
    
    return NextResponse.json({ venue: updatedVenue }, { status: 200 });
  } catch (error) {
    console.error('Error updating venue:', error);
    return NextResponse.json(
      { error: 'Failed to update venue: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    if (!params.id) {
      return NextResponse.json(
        { error: 'Venue ID is required' },
        { status: 400 }
      );
    }
    
    // Get prisma client
    const prismaClient = prisma || prismaFallback;
    
    // Check if the venue exists
    // @ts-ignore - We're intentionally ignoring type checking here
    const existingVenue = await prismaClient.venue.findUnique({
      where: { id: params.id }
    });
    
    if (!existingVenue) {
      return NextResponse.json(
        { error: 'Venue not found' },
        { status: 404 }
      );
    }
    
    // Delete the venue
    // @ts-ignore - We're intentionally ignoring type checking here
    await prismaClient.venue.delete({
      where: { id: params.id }
    });
    
    return NextResponse.json({ message: 'Venue deleted' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting venue:', error);
    return NextResponse.json(
      { error: 'Failed to delete venue: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
} 