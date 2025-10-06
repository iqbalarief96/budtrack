import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';

export async function GET() {
  try {
    const documents = await prisma.document.findMany();
    return NextResponse.json({ documents }, { status: 200 });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validasi data yang dibutuhkan
    if (!body.name || !body.weddingId) {
      return NextResponse.json(
        { error: 'Name and weddingId are required' },
        { status: 400 }
      );
    }

    // Parse deadline jika ada
    const deadline = body.deadline ? new Date(body.deadline) : null;

    // Buat document baru
    const document = await prisma.document.create({
      data: {
        name: body.name,
        description: body.description,
        deadline,
        location: body.location,
        isMandatory: body.isMandatory === true,
        status: body.status || 'Not Started',
        notes: body.notes,
        weddingId: body.weddingId,
      },
    });

    return NextResponse.json({ document }, { status: 201 });
  } catch (error) {
    console.error('Error creating document:', error);
    return NextResponse.json(
      { error: 'Failed to create document' },
      { status: 500 }
    );
  }
} 