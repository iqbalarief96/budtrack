import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { PrismaClient } from '@prisma/client';
import { requireUserId } from '@/lib/route-auth';

// Fallback if prisma client is not properly initialized
const prismaFallback = new PrismaClient();

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireUserId();
    if (auth.response) return auth.response;
    if (!params.id) {
      return NextResponse.json(
        { error: 'Vendor ID is required' },
        { status: 400 }
      );
    }

    // Get prisma client
    const prismaClient = prisma || prismaFallback;
    
    // Fetch the vendor by ID
    // @ts-ignore - We're intentionally ignoring type checking here
    const vendor = await prismaClient.vendor.findFirst({
      where: { id: params.id, wedding: { userId: auth.userId } }
    });
    
    if (!vendor) {
      return NextResponse.json(
        { error: 'Vendor not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ vendor }, { status: 200 });
  } catch (error) {
    console.error('Error fetching vendor:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vendor: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireUserId();
    if (auth.response) return auth.response;
    if (!params.id) {
      return NextResponse.json(
        { error: 'Vendor ID is required' },
        { status: 400 }
      );
    }
    
    // Parse the request body
    const body = await request.json();
    
    // Validate required fields
    if (!body.name || !body.category) {
      return NextResponse.json(
        { error: 'Name and category are required' },
        { status: 400 }
      );
    }
    
    // Get prisma client
    const prismaClient = prisma || prismaFallback;
    
    // Check if the vendor exists
    // @ts-ignore - We're intentionally ignoring type checking here
    const existingVendor = await prismaClient.vendor.findFirst({
      where: { id: params.id, wedding: { userId: auth.userId } }
    });
    
    if (!existingVendor) {
      return NextResponse.json(
        { error: 'Vendor not found' },
        { status: 404 }
      );
    }
    
    // Update the vendor
    // @ts-ignore - We're intentionally ignoring type checking here
    const updatedVendor = await prismaClient.vendor.update({
      where: { id: params.id },
      data: {
        name: body.name,
        category: body.category,
        contactPerson: body.contactPerson || existingVendor.contactPerson,
        phone: body.phone || existingVendor.phone,
        email: body.email || existingVendor.email,
        website: body.website || existingVendor.website,
        address: body.address || existingVendor.address,
        priceRange: body.priceRange || existingVendor.priceRange,
        status: body.status || existingVendor.status,
        rating: body.rating !== undefined ? body.rating : existingVendor.rating,
        imageUrl: body.imageUrl || existingVendor.imageUrl,
        instagramHandle: body.instagramHandle || existingVendor.instagramHandle,
        notes: body.notes || existingVendor.notes
      }
    });
    
    return NextResponse.json({ vendor: updatedVendor }, { status: 200 });
  } catch (error) {
    console.error('Error updating vendor:', error);
    return NextResponse.json(
      { error: 'Failed to update vendor: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireUserId();
    if (auth.response) return auth.response;
    if (!params.id) {
      return NextResponse.json(
        { error: 'Vendor ID is required' },
        { status: 400 }
      );
    }
    
    // Get prisma client
    const prismaClient = prisma || prismaFallback;
    
    // Check if the vendor exists
    // @ts-ignore - We're intentionally ignoring type checking here
    const existingVendor = await prismaClient.vendor.findFirst({
      where: { id: params.id, wedding: { userId: auth.userId } }
    });
    
    if (!existingVendor) {
      return NextResponse.json(
        { error: 'Vendor not found' },
        { status: 404 }
      );
    }
    
    // Delete the vendor
    // @ts-ignore - We're intentionally ignoring type checking here
    await prismaClient.vendor.delete({
      where: { id: params.id }
    });
    
    return NextResponse.json({ message: 'Vendor deleted' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting vendor:', error);
    return NextResponse.json(
      { error: 'Failed to delete vendor: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
} 