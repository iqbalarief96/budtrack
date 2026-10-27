import { NextResponse } from 'next/server';
import prisma from '../../../../../../lib/prisma';
import { PrismaClient } from '@prisma/client';
import { requireWeddingOwner } from '@/lib/route-auth';

// Fallback if prisma client is not properly initialized
const prismaFallback = new PrismaClient();

export async function GET(
  request: Request,
  { params }: { params: { id: string; vendorId: string } }
) {
  try {
    const auth = await requireWeddingOwner(params.id);
    if (auth.response) return auth.response;
    const { id, vendorId } = params;
    const prismaClient = prisma || prismaFallback;

    // Verify the wedding exists first
    const wedding = await prismaClient.wedding.findUnique({
      where: { id }
    });

    if (!wedding) {
      return NextResponse.json(
        { error: `Wedding with ID ${id} not found.` },
        { status: 404 }
      );
    }

    // @ts-ignore - We're intentionally ignoring type checking here
    const vendor = await prismaClient.vendor.findFirst({
      where: { 
        id: vendorId,
        weddingId: id 
      },
    });

    if (!vendor) {
      return NextResponse.json(
        { error: 'Vendor not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(vendor, { status: 200 });
  } catch (error) {
    console.error('Error fetching vendor:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vendor', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string; vendorId: string } }
) {
  try {
    const auth = await requireWeddingOwner(params.id);
    if (auth.response) return auth.response;
    const { id, vendorId } = params;
    const body = await request.json();
    const prismaClient = prisma || prismaFallback;

    // Verify the wedding exists first
    const wedding = await prismaClient.wedding.findUnique({
      where: { id }
    });

    if (!wedding) {
      return NextResponse.json(
        { error: `Wedding with ID ${id} not found. Cannot update vendor.` },
        { status: 404 }
      );
    }

    // Verify if vendor exists and belongs to the wedding
    const existingVendor = await prismaClient.vendor.findFirst({
      where: {
        id: vendorId,
        weddingId: id
      }
    });

    if (!existingVendor) {
      return NextResponse.json(
        { error: 'Vendor not found or does not belong to this wedding' },
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
    const vendor = await prismaClient.vendor.update({
      where: { id: vendorId },
      data: {
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

    return NextResponse.json(vendor, { status: 200 });
  } catch (error) {
    console.error('Error updating vendor:', error);
    return NextResponse.json(
      { error: 'Failed to update vendor', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string; vendorId: string } }
) {
  try {
    const auth = await requireWeddingOwner(params.id);
    if (auth.response) return auth.response;
    const { id, vendorId } = params;
    const prismaClient = prisma || prismaFallback;

    // Verify the wedding exists first
    const wedding = await prismaClient.wedding.findUnique({
      where: { id }
    });

    if (!wedding) {
      return NextResponse.json(
        { error: `Wedding with ID ${id} not found. Cannot delete vendor.` },
        { status: 404 }
      );
    }

    // Verify if vendor exists and belongs to the wedding
    const existingVendor = await prismaClient.vendor.findFirst({
      where: {
        id: vendorId,
        weddingId: id
      }
    });

    if (!existingVendor) {
      return NextResponse.json(
        { error: 'Vendor not found or does not belong to this wedding' },
        { status: 404 }
      );
    }

    // @ts-ignore - We're intentionally ignoring type checking here
    await prismaClient.vendor.delete({
      where: { id: vendorId },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting vendor:', error);
    return NextResponse.json(
      { error: 'Failed to delete vendor', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 