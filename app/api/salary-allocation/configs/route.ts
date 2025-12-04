import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { allocationService } from '@/lib/allocation/allocation-service';
import type { SaveConfigRequest } from '@/app/types/allocation';

// GET - List all configs for user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const configs = await prisma.salaryAllocationConfig.findMany({
      where: { userId: session.user.id },
      include: { items: true },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json(configs);
  } catch (error) {
    console.error('Error fetching configs:', error);
    return NextResponse.json(
      { error: 'Gagal mengambil konfigurasi' },
      { status: 500 }
    );
  }
}

// POST - Create new config
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: SaveConfigRequest = await request.json();
    const { name, monthlyIncome, templateType, items } = body;

    // Validate income
    const incomeValidation = allocationService.validateIncome(monthlyIncome);
    if (!incomeValidation.isValid) {
      return NextResponse.json(
        { error: incomeValidation.error },
        { status: 400 }
      );
    }

    // Validate percentages
    const percentageValidation = allocationService.validatePercentages(items);
    if (!percentageValidation.isValid) {
      return NextResponse.json(
        { error: percentageValidation.error },
        { status: 400 }
      );
    }

    // Calculate amounts for each item
    const calculatedItems = allocationService.calculateAllocation(monthlyIncome, items);

    // Create config with items
    const config = await prisma.salaryAllocationConfig.create({
      data: {
        userId: session.user.id,
        name,
        monthlyIncome,
        templateType,
        items: {
          create: calculatedItems.map((item) => ({
            categoryName: item.categoryName,
            categoryType: item.categoryType,
            percentage: item.percentage,
            amount: item.amount,
            icon: item.icon,
            color: item.color,
          })),
        },
      },
      include: { items: true },
    });

    return NextResponse.json(config, { status: 201 });
  } catch (error) {
    console.error('Error creating config:', error);
    return NextResponse.json(
      { error: 'Gagal menyimpan konfigurasi' },
      { status: 500 }
    );
  }
}
