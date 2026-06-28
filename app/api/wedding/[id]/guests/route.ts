import { NextResponse } from 'next/server';
import prisma from '../../../../../lib/prisma';
import { PrismaClient, Prisma } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import { updateWeddingGuestCount } from '../../utils';

/**
 * ATTENTION DEVELOPERS: 
 * 
 * The WeddingGuest model was previously missing from schema.prisma but has been added.
 * This route now uses proper Prisma models instead of raw SQL queries.
 * 
 * NOTE: Prisma client needs to be regenerated for type checking to work properly.
 * Current implementation includes type workarounds until client regeneration is completed.
 */

// Fallback prisma client
const prismaFallback = new PrismaClient();

// Define temporary type for WeddingGuest until Prisma client regeneration
type WeddingGuest = {
  id: string;
  weddingId: string;
  name: string;
  relationship: string | null;
  contactNumber: string | null;
  email: string | null;
  address: string | null;
  confirmed: boolean;
  attended: boolean;
  group: string | null;
  seats: number;
  dietaryRestrictions: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// GET /api/wedding/[id]/guests - Get all guests for a wedding
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id: weddingId } = params;
    console.log('Fetching guests for wedding ID:', weddingId);
    
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
    
    // Use Prisma model to get guests 
    const guests = await prismaClient.weddingGuest.findMany({
      where: { weddingId },
      orderBy: { name: 'asc' }
    });
    
    // Clean data to ensure it's serializable
    const cleanGuests = guests.map((guest) => ({
      id: guest.id,
      weddingId: guest.weddingId,
      name: guest.name,
      relationship: guest.relationship,
      contactNumber: guest.contactNumber,
      email: guest.email,
      address: guest.address,
      confirmed: Boolean(guest.confirmed),
      attended: Boolean(guest.attended),
      group: guest.group,
      seats: Number(guest.seats || 1),
      dietaryRestrictions: guest.dietaryRestrictions,
      notes: guest.notes,
      createdAt: guest.createdAt ? new Date(guest.createdAt).toISOString() : null,
      updatedAt: guest.updatedAt ? new Date(guest.updatedAt).toISOString() : null
    }));
    
    // Calculate summary statistics
    const totalGuests = cleanGuests.length;
    const confirmedGuests = cleanGuests.filter((guest) => guest.confirmed).length;
    const totalSeats = cleanGuests.reduce((acc: number, guest) => acc + guest.seats, 0);
    const confirmedSeats = cleanGuests.filter((guest) => guest.confirmed)
      .reduce((acc: number, guest) => acc + guest.seats, 0);
    
    // Return guests with summary
    return NextResponse.json({ 
      guests: cleanGuests,
      summary: {
        totalGuests,
        confirmedGuests,
        totalSeats,
        confirmedSeats
      }
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching wedding guests:', error);
    // Return a 200 with empty data and error message instead of 500
    return NextResponse.json({ 
      error: 'Failed to fetch wedding guests: ' + (error instanceof Error ? error.message : String(error)),
      guests: [],
      summary: {
        totalGuests: 0,
        confirmedGuests: 0,
        totalSeats: 0,
        confirmedSeats: 0
      }
    }, { status: 200 });
  }
}

// POST /api/wedding/[id]/guests - Add a new guest
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id: weddingId } = params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
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
      return NextResponse.json({ error: 'Wedding not found or unauthorized' }, { status: 404 });
    }
    
    // Parse request data
    const data = await request.json();
    const { 
      name, 
      relationship, 
      contactNumber, 
      email, 
      address, 
      confirmed, 
      attended, 
      group, 
      seats, 
      dietaryRestrictions, 
      notes 
    } = data;
    
    // Validate required fields
    if (!name) {
      return NextResponse.json({ error: 'Guest name is required' }, { status: 400 });
    }

    // Use Prisma model to create a guest
    const createdGuest = await prismaClient.weddingGuest.create({
      data: {
        weddingId,
        name,
        relationship: relationship || null,
        contactNumber: contactNumber || null,
        email: email || null,
        address: address || null,
        confirmed: confirmed || false,
        attended: attended || false,
        group: group || null,
        seats: seats || 1,
        dietaryRestrictions: dietaryRestrictions || null,
        notes: notes || null
      }
    });
    
    // Update wedding expected guests count
    await updateWeddingGuestCount(weddingId);
    
    return NextResponse.json(createdGuest, { status: 201 });
  } catch (error) {
    console.error('Error creating wedding guest:', error);
    return NextResponse.json(
      { error: 'Failed to create wedding guest: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}

// DELETE /api/wedding/[id]/guests?guestId=xyz - Delete a guest
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id: weddingId } = params;
    const { searchParams } = new URL(request.url);
    const guestId = searchParams.get('guestId');
    
    if (!guestId) {
      return NextResponse.json({ error: 'Guest ID is required' }, { status: 400 });
    }
    
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
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
      return NextResponse.json({ error: 'Wedding not found or unauthorized' }, { status: 404 });
    }
    
    // Get guest to check if it belongs to this wedding
    const guest = await prismaClient.weddingGuest.findUnique({
      where: { id: guestId }
    });
    
    if (!guest || guest.weddingId !== weddingId) {
      return NextResponse.json({ error: 'Guest not found or does not belong to this wedding' }, { status: 404 });
    }
    
    // Delete guest with Prisma
    await prismaClient.weddingGuest.delete({
      where: { id: guestId }
    });
    
    // Update wedding expected guests count
    await updateWeddingGuestCount(weddingId);
    
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting wedding guest:', error);
    return NextResponse.json(
      { error: 'Failed to delete wedding guest: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}

// PUT /api/wedding/[id]/guests - Update a guest
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id: weddingId } = params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
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
      return NextResponse.json({ error: 'Wedding not found or unauthorized' }, { status: 404 });
    }
    
    // Parse request data
    const data = await request.json();
    const { 
      id, 
      name, 
      relationship, 
      contactNumber, 
      email, 
      address, 
      confirmed, 
      attended, 
      group, 
      seats, 
      dietaryRestrictions, 
      notes 
    } = data;
    
    // Validate required fields
    if (!id || !name) {
      return NextResponse.json({ error: 'Guest ID and name are required' }, { status: 400 });
    }
    
    // Get existing guest to check if it exists
    const existingGuest = await prismaClient.weddingGuest.findUnique({
      where: { id }
    });
    
    if (!existingGuest) {
      return NextResponse.json({ error: 'Guest not found' }, { status: 404 });
    }
    
    // Update guest with Prisma
    const updatedGuest = await prismaClient.weddingGuest.update({
      where: { id },
      data: {
        name,
        relationship: relationship || null,
        contactNumber: contactNumber || null,
        email: email || null,
        address: address || null,
        confirmed: confirmed !== undefined ? confirmed : undefined,
        attended: attended !== undefined ? attended : undefined,
        group: group || null,
        seats: seats || 1,
        dietaryRestrictions: dietaryRestrictions || null,
        notes: notes || null
      }
    });
    
    // Update wedding expected guests count
    await updateWeddingGuestCount(weddingId);
    
    return NextResponse.json(updatedGuest, { status: 200 });
  } catch (error) {
    console.error('Error updating wedding guest:', error);
    return NextResponse.json(
      { error: 'Failed to update wedding guest: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
} 