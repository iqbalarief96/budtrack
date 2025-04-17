import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';
import { PrismaClient } from '@prisma/client';

// Fallback if prisma client is not properly initialized
const prismaFallback = new PrismaClient();

export async function GET(request: Request) {
  try {
    // Get URL parameters
    const url = new URL(request.url);
    const weddingId = url.searchParams.get('weddingId');
    const category = url.searchParams.get('category');
    
    // Get prisma client
    const prismaClient = prisma || prismaFallback;
    
    // Set up filter based on weddingId and category if provided
    let filter: any = {};
    
    if (weddingId) filter.weddingId = weddingId;
    if (category) filter.category = category;
    
    // Fetch vendors with the filter
    // @ts-ignore - We're intentionally ignoring type checking here
    const vendors = await prismaClient.vendor.findMany({
      where: filter,
    });
    
    return NextResponse.json({ vendors }, { status: 200 });
  } catch (error) {
    console.error('Error in vendor API route:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vendors: ' + (error instanceof Error ? error.message : String(error)) },
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
      category,
      contactPerson,
      phone,
      email,
      website,
      address,
      priceRange,
      status,
      rating,
      imageUrl,
      instagramHandle,
      notes
    } = body;
    
    // Validate required fields
    if (!weddingId || !name || !category) {
      return NextResponse.json(
        { error: 'Wedding ID, name and category are required' },
        { status: 400 }
      );
    }
    
    // Get prisma client
    const prismaClient = prisma || prismaFallback;
    
    // Create the vendor record
    // @ts-ignore - We're intentionally ignoring type checking here
    const vendor = await prismaClient.vendor.create({
      data: {
        weddingId,
        name,
        category,
        contactPerson: contactPerson || null,
        phone: phone || null,
        email: email || null,
        website: website || null,
        address: address || null,
        priceRange: priceRange || null,
        status: status || 'CONSIDERING',
        rating: rating || null,
        imageUrl: imageUrl || null,
        instagramHandle: instagramHandle || null,
        notes: notes || null
      }
    });
    
    return NextResponse.json({ vendor }, { status: 201 });
  } catch (error) {
    console.error('Error creating vendor:', error);
    return NextResponse.json(
      { error: 'Failed to create vendor: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
} 