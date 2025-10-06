import { NextResponse } from 'next/server';
import prisma from '../../../../../lib/prisma';
import { PrismaClient } from '@prisma/client';

// Fallback if prisma client is not properly initialized
const prismaFallback = new PrismaClient();

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const prismaClient = prisma || prismaFallback;

    // @ts-ignore - We're intentionally ignoring type checking here
    const vendors = await prismaClient.vendor.findMany({
      where: { weddingId: id },
    });

    return NextResponse.json(vendors, { status: 200 });
  } catch (error) {
    console.error('Error fetching vendors:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vendors', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const prismaClient = prisma || prismaFallback;

    // Verify the wedding exists first
    const wedding = await prismaClient.wedding.findUnique({
      where: { id }
    });

    if (!wedding) {
      return NextResponse.json(
        { error: `Wedding with ID ${id} not found. Cannot create vendor.` },
        { status: 404 }
      );
    }

    // Convert features array to string if present
    let featuresString: string | null = null;
    if (body.features) {
      featuresString = Array.isArray(body.features) 
        ? body.features.join(',')
        : typeof body.features === 'string' ? body.features : null;
    }

    // @ts-ignore - We're intentionally ignoring type checking here
    const vendor = await prismaClient.vendor.create({
      data: {
        weddingId: id,
        name: body.name,
        category: body.category,
        description: body.description || null,
        contactPerson: body.contactPerson || null,
        phone: body.phone || null,
        email: body.email || null,
        website: body.website || null,
        address: body.address || null,
        priceRange: body.priceRange || null,
        instagramHandle: body.instagramHandle || null,
        imageUrl: body.imageUrl || null,
        rating: body.rating ? parseFloat(body.rating) : null,
        status: body.status || 'pending',
        notes: body.notes || null,
        features: featuresString,
      },
    });

    return NextResponse.json(vendor, { status: 201 });
  } catch (error) {
    console.error('Error creating vendor:', error);
    return NextResponse.json(
      { error: 'Failed to create vendor', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 