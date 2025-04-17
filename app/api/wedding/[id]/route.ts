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
    const { id } = params;
    const prismaClient = prisma || prismaFallback;

    // @ts-ignore - We're intentionally ignoring type checking here
    const wedding = await prismaClient.wedding.findUnique({
      where: { id },
      include: {
        venues: true,
        vendors: true,
        documents: true,
        rundownItems: true,
        souvenirs: true,
        playlists: true,
        moodboardItems: true,
      },
    });

    if (!wedding) {
      return NextResponse.json(
        { error: 'Wedding not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ wedding }, { status: 200 });
  } catch (error) {
    console.error('Error fetching wedding data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch wedding data' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const prismaClient = prisma || prismaFallback;

    // @ts-ignore - We're intentionally ignoring type checking here
    const updatedWedding = await prismaClient.wedding.update({
      where: { id },
      data: {
        date: body.date !== undefined ? new Date(body.date) : undefined,
        budget: body.budget,
        spentBudget: body.spentBudget,
        expectedGuests: body.expectedGuests,
        confirmedGuests: body.confirmedGuests,
        location: body.location,
      },
    });

    return NextResponse.json({ wedding: updatedWedding }, { status: 200 });
  } catch (error) {
    console.error('Error updating wedding data:', error);
    return NextResponse.json(
      { error: 'Failed to update wedding data' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const prismaClient = prisma || prismaFallback;

    // @ts-ignore - We're intentionally ignoring type checking here
    await prismaClient.wedding.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: 'Wedding deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting wedding:', error);
    return NextResponse.json(
      { error: 'Failed to delete wedding' },
      { status: 500 }
    );
  }
} 