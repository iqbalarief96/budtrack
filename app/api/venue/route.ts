import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';
import { PrismaClient } from '@prisma/client';
import { requireUserId, requireWeddingOwner } from '@/lib/route-auth';

// Fallback if prisma client is not properly initialized
const prismaFallback = new PrismaClient();

export async function GET(request: Request) {
  try {
    // Get URL parameters
    const url = new URL(request.url);
    const weddingId = url.searchParams.get('weddingId');
    const auth = await requireUserId();
    if (auth.response) return auth.response;
    if (weddingId) {
      const owner = await requireWeddingOwner(weddingId);
      if (owner.response) return owner.response;
    }
    
    // Get prisma client
    const prismaClient = prisma || prismaFallback;
    
    // Set up filter based on weddingId if provided
    const filter = weddingId ? { weddingId } : {};
    
    // Fetch venues with the filter
    // @ts-ignore - We're intentionally ignoring type checking here
    const venues = await prismaClient.venue.findMany({
      where: { ...filter, wedding: { userId: auth.userId } },
    });
    
    return NextResponse.json({ venues }, { status: 200 });
  } catch (error) {
    console.error('Error in venue API route:', error);
    return NextResponse.json(
      { error: 'Failed to fetch venues: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // Parse the request body
    const body = await request.json();
    const {
      weddingId,
      name,
      address,
      capacity,
      priceRange,
      contactPerson,
      phone,
      email,
      website,
      notes,
      isBooked,
      bookingDate,
      depositAmount,
      imageUrl
    } = body;
    const auth = await requireWeddingOwner(weddingId);
    if (auth.response) return auth.response;
    
    // Validate required fields
    if (!weddingId || !name || !address) {
      return NextResponse.json(
        { error: 'Wedding ID, name and address are required' },
        { status: 400 }
      );
    }
    
    // Get prisma client
    const prismaClient = prisma || prismaFallback;
    
    // Create the venue record
    // @ts-ignore - We're intentionally ignoring type checking here
    const venue = await prismaClient.venue.create({
      data: {
        weddingId,
        name,
        address,
        capacity: capacity || null,
        priceRange: priceRange || null,
        contactPerson: contactPerson || null,
        phone: phone || null,
        email: email || null,
        website: website || null,
        notes: notes || null,
        isBooked: isBooked || false,
        bookingDate: bookingDate ? new Date(bookingDate) : null,
        depositAmount: depositAmount || null,
        imageUrl: imageUrl || null
      }
    });
    
    return NextResponse.json({ venue }, { status: 201 });
  } catch (error) {
    console.error('Error creating venue:', error);
    return NextResponse.json(
      { error: 'Failed to create venue: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
} 