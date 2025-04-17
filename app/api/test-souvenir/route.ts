import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';

// This is a test endpoint to verify that we can create a souvenir
export async function POST(request: Request) {
  try {
    // Create a test souvenir
    const testSouvenir = await prisma.souvenir.create({
      data: {
        name: "Test Souvenir",
        weddingId: "clhqwvft90000gxkksa1j2sk0", // Use a valid wedding ID here (replace with real one)
        type: "", // Use empty string instead of null for now
        quantity: 100,
        pricePerUnit: 5000,
        totalBudget: 500000,
        status: "PLANNING"
      }
    });
    
    return NextResponse.json(
      { message: "Test souvenir created successfully", souvenir: testSouvenir },
      { status: 201 }
    );
  } catch (error) {
    console.error("Test Souvenir Creation Error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to create test souvenir", details: errorMessage },
      { status: 500 }
    );
  }
}

// Attempting to create a souvenir using the wedding relation API
export async function PUT(request: Request) {
  try {
    // Get a valid wedding ID from the database
    const wedding = await prisma.wedding.findFirst();
    
    if (!wedding) {
      return NextResponse.json(
        { error: "No wedding found to associate with souvenir" },
        { status: 404 }
      );
    }
    
    // Create a test souvenir using the relation API
    const testSouvenir = await prisma.souvenir.create({
      data: {
        name: "Test Souvenir Via Relation",
        type: "",
        quantity: 50,
        pricePerUnit: 10000,
        totalBudget: 500000,
        status: "PLANNING",
        wedding: {
          connect: { id: wedding.id }
        }
      }
    });
    
    return NextResponse.json(
      { message: "Test souvenir created successfully via relation", souvenir: testSouvenir },
      { status: 201 }
    );
  } catch (error) {
    console.error("Test Souvenir Creation Error (PUT):", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to create test souvenir via relation", details: errorMessage },
      { status: 500 }
    );
  }
}

// Check if we can read souvenirs from the database
export async function GET() {
  try {
    // Count all souvenirs in the database
    const count = await prisma.souvenir.count();
    
    // Get the latest 5 souvenirs
    const souvenirs = await prisma.souvenir.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
    });
    
    return NextResponse.json(
      { count, souvenirs, message: "Successfully retrieved souvenirs" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Test Souvenir Fetch Error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to fetch souvenirs", details: errorMessage },
      { status: 500 }
    );
  }
} 