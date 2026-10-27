import { NextResponse } from 'next/server';
import prisma from '../../../../../lib/prisma';
import { PrismaClient, Prisma } from '@prisma/client';
import { requireWeddingOwner } from '@/lib/route-auth';

const prismaFallback = new PrismaClient();
const dbClient = prisma || prismaFallback;

// GET all souvenirs for a specific wedding
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireWeddingOwner(params.id);
    if (auth.response) return auth.response;
    const { id: weddingId } = params;
    if (!weddingId) {
      return NextResponse.json({ error: 'Wedding ID is required' }, { status: 400 });
    }

    const souvenirs = await dbClient.souvenir.findMany({
      where: { weddingId: weddingId },
      orderBy: { createdAt: 'desc' } // Order by creation date or name
    });

    return NextResponse.json(souvenirs, { status: 200 });
  } catch (error) {
    console.error('Error fetching souvenirs:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Failed to fetch souvenirs', details: errorMessage },
      { status: 500 }
    );
  }
}

// POST a new souvenir for a specific wedding
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireWeddingOwner(params.id);
    if (auth.response) return auth.response;
    const { id: weddingId } = params;
    if (!weddingId) {
      return NextResponse.json({ error: 'Wedding ID is required' }, { status: 400 });
    }
    const body = await request.json();
    console.log("[API POST /souvenir] Received body:", body); // Log received body

    // --- Refined Data Preparation & Validation ---
    // 1. Basic validation
    if (!body.name) {
      return NextResponse.json({ error: 'Souvenir name is required' }, { status: 400 });
    }

    // 2. Type Conversion and Defaults
    const quantity = body.quantity !== null && body.quantity !== undefined && !isNaN(parseInt(body.quantity)) ? parseInt(body.quantity) : 0;
    const pricePerUnit = body.pricePerUnit !== null && body.pricePerUnit !== undefined && !isNaN(parseFloat(body.pricePerUnit)) ? parseFloat(body.pricePerUnit) : 0;
    const totalBudget = body.totalBudget !== null && body.totalBudget !== undefined && !isNaN(parseFloat(body.totalBudget)) ? parseFloat(body.totalBudget) : (quantity * pricePerUnit); // Auto-calculate if not provided
    
    // Handle actual costs
    const actualCostPerUnit = body.actualCostPerUnit !== null && body.actualCostPerUnit !== undefined && !isNaN(parseFloat(body.actualCostPerUnit)) ? parseFloat(body.actualCostPerUnit) : 0;
    const totalActualCost = body.totalActualCost !== null && body.totalActualCost !== undefined && !isNaN(parseFloat(body.totalActualCost)) ? parseFloat(body.totalActualCost) : (quantity * actualCostPerUnit); // Auto-calculate if not provided

    // 3. Status Validation
    const validStatuses = ['PLANNING', 'ORDERED', 'RECEIVED'];
    const status = body.status && validStatuses.includes(body.status) ? body.status : 'PLANNING'; // Default to PLANNING if invalid or missing

    // 4. Date Handling (more robust)
    let orderDate: Date | null = null;
    if (body.orderDate) {
        try {
            orderDate = new Date(body.orderDate);
            if (isNaN(orderDate.getTime())) orderDate = null; // Invalidate if parsing failed
        } catch { orderDate = null; }
    }
    let deliveryDate: Date | null = null;
     if (body.deliveryDate) {
        try {
            deliveryDate = new Date(body.deliveryDate);
             if (isNaN(deliveryDate.getTime())) deliveryDate = null; // Invalidate if parsing failed
        } catch { deliveryDate = null; }
    }

    // 5. Prepare data for Prisma
    const dataToCreate: Prisma.SouvenirCreateInput = {
      wedding: { connect: { id: weddingId } },
      name: body.name, // Required, validated above
      type: body.type || null,
      quantity: quantity,
      pricePerUnit: pricePerUnit,
      totalBudget: totalBudget,
      actualCostPerUnit: actualCostPerUnit,
      totalActualCost: totalActualCost,
      vendor: body.vendor || null,
      description: body.description || null,
      imageUrl: body.imageUrl || null,
      status: status,
      orderDate: orderDate,
      deliveryDate: deliveryDate,
      notes: body.notes || null,
    };

    console.log("[API POST /souvenir] Data prepared for Prisma:", dataToCreate);

    // --- Database Operation ---
    const newSouvenir = await dbClient.souvenir.create({ data: dataToCreate });
    console.log("[API POST /souvenir] Souvenir created successfully:", newSouvenir);

    return NextResponse.json(newSouvenir, { status: 201 });

  } catch (error) {
    console.error('[API POST /souvenir] Error creating souvenir:', error); // Log the detailed error
    let statusCode = 500;
    let errorMessage = 'Failed to create souvenir';
    let errorDetails = error instanceof Error ? error.message : String(error);

    if (error instanceof Prisma.PrismaClientValidationError) {
        statusCode = 400;
        errorMessage = 'Invalid data provided for souvenir.';
        // Attempt to provide more specific details from the validation error
        errorDetails = error.message.split('\n').pop() || error.message; 
    } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // Handle known Prisma errors (e.g., unique constraint violation)
        statusCode = 409; // Conflict
        errorMessage = 'Database error occurred.';
        errorDetails = `Code: ${error.code}. ${error.message.split('\n').pop()}`;
    }

    return NextResponse.json(
      { error: errorMessage, details: errorDetails },
      { status: statusCode }
    );
  }
} 